// Run with a local preview and Playwright available on NODE_PATH.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

async function check(){
  const browser=await chromium.launch({channel:'chrome'});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:880}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const button=name=>page.getByRole('button',{name,exact:true});
    // Fix only the opening deal, retaining the real UI, rules, and opponent.
    await page.addInitScript(()=>{
      const original=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=arr=>arr instanceof Uint32Array&&arr.length===1?(arr[0]=20261020,arr):original(arr);
    });
    await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:3114/',{waitUntil:'networkidle'});
    async function fit(selector,desktop=false){
      const sizes=await page.locator(selector).evaluate(c=>{
        const r=c.getBoundingClientRect(),root=document.documentElement;
        return [Math.abs(r.width/r.height-c.width/c.height),root.scrollWidth-innerWidth,root.scrollHeight-innerHeight];
      });
      assert.ok(sizes[0]<.003,'square pixels '+sizes);
      assert.ok(sizes[1]<=1,'horizontal overflow '+sizes);
      if(desktop)assert.ok(sizes[2]<=1,'desktop vertical overflow '+sizes);
    }
    await fit('.match-field',true);
    for(const width of [360,390,430]){
      await page.setViewportSize({width,height:800});
      await fit('.match-field');
      await button('사냥 튜토리얼').click();
      await fit('.ht-picture canvas');
      await button('직접 대전').click();
    }
    await page.setViewportSize({width:390,height:844});
    await button('대전 시작').click();
    const firstCard=page.locator('.match-cards button').first();
    await firstCard.focus();await page.keyboard.press('Enter');
    assert.match(await page.locator('.match-card-text').innerText(),/시작 손패/);
    assert.doesNotMatch(await page.locator('.match-field').getAttribute('aria-label'),/공격 미리보기/);
    await button('이 손패로 시작').click();
    const command=page.locator('.match-command');
    await command.waitFor();
    await button('사냥 튜토리얼').click();
    await button('직접 대전').click();
    await command.waitFor();
    await fit('.match-field');
    await page.locator('.match-cards button').filter({hasText:'조건 보기'}).first().click();
    assert.match(await command.locator('.match-forecast').innerText(),/지금 못 쓰는 이유.*\n.*차례야/s);
    assert.doesNotMatch(await page.locator('.match-field').getAttribute('aria-label'),/공격 미리보기/);
    assert.equal(await command.locator('.match-primary').count(),0);
    await button('손패 선택 해제').click();
    await page.setViewportSize({width:1920,height:880});
    await fit('.match-field',true);
    let decisions=0,attacked=false,summoned=false,defended=false,hunted=false,moved=false;
    let checkedPause=false,checkedSpeech=false,checkedHelp=false;
    while(decisions<250){
      await page.locator('.match-command, .match-orders:has-text("대전 종료"), .match-orders button:has-text("다음 행동"), dialog[open]').first().waitFor();
      const help=page.getByRole('dialog',{name:'판정 도움말'});
      if(await help.count()){
        if(!checkedHelp){
          assert.match(await help.innerText(),/히트/);
          await page.setViewportSize({width:390,height:844});
          const reason=await help.locator('.rule-answer').innerText();
          await page.waitForTimeout(1100);
          assert.equal(await help.locator('.rule-answer').innerText(),reason);
          await button('이해했어').click();
          await page.getByLabel('처음 보는 주요 판정은 팝업으로 보기').uncheck();
          await page.setViewportSize({width:1920,height:880});
          checkedHelp=true;
        }else await button('이해했어').click();
        continue;
      }
      if(await button('다시 대전하기').count())break;
      if(await page.locator('.opponent-speech').count()&&!checkedSpeech){
        assert.match(await page.locator('.opponent-speech').innerText(),/상대 · 카잔/);
        await page.setViewportSize({width:390,height:844});
        await fit('.match-field');
        const bubble=await page.locator('.opponent-speech').boundingBox();
        assert.ok(bubble.x>=0&&bubble.x+bubble.width<=390);
        await page.setViewportSize({width:1920,height:880});
        await fit('.match-field',true);
        checkedSpeech=true;
      }
      if(await button('다음 행동').count()){
        if(!checkedPause){
          const last=await page.locator('.match-orders').innerText();
          await page.waitForTimeout(1700);
          assert.equal(await page.locator('.match-orders').innerText(),last);
          checkedPause=true;
        }
        await button('다음 행동').click();
        if(checkedPause&&checkedSpeech)await page.getByLabel('대전 진행 속도').selectOption('quick');
        continue;
      }
      const types=await command.locator('.match-types button').allTextContents();
      let type=types[0];
      if(types.includes('동료 소환')&&!summoned) type='동료 소환';
      else if(types.includes('사냥')&&!hunted)type='사냥';
      else if(types.includes('동료 이동')&&!moved)type='동료 이동';
      else if(types.includes('결투')&&!attacked)type='결투';
      else if(types.includes('단계 마치기'))type='단계 마치기';
      await command.getByRole('button',{name:type,exact:true}).click();
      let expectedXp;
      if(type==='동료 소환'&&!summoned){
        const ally=page.locator('.match-cards button').filter({hasText:'동료'}).filter({hasText:'사용 가능'}).first();
        await ally.click();
        const text=await command.locator('.match-forecast').innerText();
        expectedXp=Number(text.match(/남는 경험치 \d+ → (\d+)/)[1]);
        assert.match(text,/휴식 상태/);
        await fit('.match-field',true);
        await command.getByText('지불 자원 조정',{exact:true}).click();
        const paid=command.locator('.match-checks select').filter({has:page.locator('option:checked:not([value="0"])')}).first();
        await paid.selectOption('0');
        assert.match(await command.locator('.match-forecast').innerText(),/지금 고른 자원/);
        assert.ok(await command.locator('.match-primary').isDisabled());
        await ally.click();await ally.click();
      }
      if(type==='동료 소환')summoned=true;
      if(type==='동료 이동')moved=true;
      if(type==='사냥')hunted=true;
      if(type==='결투')attacked=true;
      if(type==='방어 파티')defended=true;
      const select=command.getByRole('combobox',{name:'행동 선택'});
      if(type==='사냥'){
        const field=page.locator('.match-field');
        assert.match(await field.getAttribute('aria-label'),/공격 미리보기.*→/);
        const arrowPixels=()=>field.evaluate(c=>{
          const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let count=0;
          for(let i=0;i<data.length;i+=4)if(data[i]===245&&data[i+1]===119&&data[i+2]===82)count++;
          return count;
        });
        // The preceding move can still be landing when the hunt is first selected.
        await page.waitForTimeout(400);
        assert.ok(await arrowPixels()>5);
        const before=await field.evaluate(c=>c.toDataURL());
        await select.focus();await page.keyboard.press('ArrowDown');
        assert.notEqual(await field.evaluate(c=>c.toDataURL()),before);
        if(process.env.TARGET_PREVIEW_PNG)await page.locator('.match-stage').screenshot({path:process.env.TARGET_PREVIEW_PNG});
        await page.setViewportSize({width:390,height:844});await fit('.match-field');
        await select.selectOption({index:0});
        await command.getByText(/참여 동료 조정/).click();
        for(const checkbox of await command.locator('input:checked').all())await checkbox.uncheck();
        assert.ok(await command.locator('.match-primary').isDisabled());
        assert.equal(await arrowPixels(),0);
        await command.getByRole('button',{name:'사냥',exact:true}).click();
        assert.ok(await arrowPixels()>5);
        await page.setViewportSize({width:1920,height:880});await fit('.match-field',true);
      }
      if(type==='결투')assert.match(await page.locator('.match-field').getAttribute('aria-label'),/공격 미리보기.*→/);
      if(type==='결투'&&await select.count())await select.selectOption({index:0});
      await command.locator('.match-primary').click();
      if(expectedXp!==undefined)assert.match(await page.locator('.match-leader.side-0').innerText(),new RegExp('경험치 '+expectedXp+'$'));
      decisions++;
    }
    assert.ok(decisions<250&&attacked&&summoned&&defended&&moved&&hunted&&checkedSpeech&&checkedPause&&checkedHelp,JSON.stringify({decisions,attacked,summoned,defended,moved,hunted,checkedSpeech,checkedPause,checkedHelp}));
    await fit('.match-field',true);
    await button('대전 기록').click();await page.getByRole('dialog').waitFor();
    await page.getByRole('button',{name:'이 판정 다시 보기'}).first().click();
    await page.getByRole('dialog',{name:'판정 도움말'}).waitFor();
    await page.keyboard.press('Escape');
    console.log(await page.locator('.match-orders').innerText(),{decisions,attacked,summoned,defended,hunted,moved});
    await button('다시 대전하기').click();await button('리더 선택으로').click();
    await button('대전 시작').waitFor();assert.deepEqual(errors,[]);
  }finally{await browser.close();}
}
check().catch(e=>{console.error(e);process.exitCode=1;});
