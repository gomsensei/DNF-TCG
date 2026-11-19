// Run against a local preview with Playwright available on NODE_PATH.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

async function verify() {
  const browser = await chromium.launch({channel:'chrome'});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3114/',{waitUntil:'networkidle'});
    const button = name=>page.getByRole('button',{name,exact:true});
    await button('사냥 튜토리얼').click();
    async function verifyFit() {
      const overflow = await page.evaluate(()=>{
        const root = document.documentElement;
        const elements = document.querySelectorAll('main button,main select,main input,main h1,main h2,main .ht-bubble,main canvas');
        const outside = [...elements].filter(el=>{
          const r=el.getBoundingClientRect();
          return r.width && r.height && (r.left<0 || r.top<0 || r.right>innerWidth+1 || r.bottom>innerHeight+1);
        }).map(el=>el.textContent);
        return {horizontal:root.scrollWidth>innerWidth,vertical:root.scrollHeight>innerHeight,outside};
      });
      assert.deepEqual(overflow,{horizontal:false,vertical:false,outside:[]});
    }
    for(const [width,height] of [[1920,920],[1920,880],[1536,700],[1280,600]]) {
      await page.setViewportSize({width,height});
      await page.getByRole('heading',{name:'숲의 사냥터'}).waitFor();
      await verifyFit();
      await button('사냥 재생').click();
      await page.getByRole('heading',{name:/고블린 확보/}).waitFor();
      await verifyFit();
      assert.match(await page.locator('.ht-name.in-party').innerText(),/휴식/);
      assert.match(await page.locator('.ht-zones').innerText(),/3장 · 경험치 6/);
      await button('판정 기록').click();
      await page.getByRole('dialog').waitFor();
      await verifyFit();
      await page.keyboard.press('Escape');
      await button('행동 전으로').click();
      console.log(width,height,'ready, resolved, log, rewind OK');
    }
    await page.setViewportSize({width:1920,height:900});
    if(process.env.HUNT_SCREENSHOT) await page.screenshot({path:process.env.HUNT_SCREENSHOT});
    await page.locator('.ht-hand-cards button').first().focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    await verifyFit();
    await page.keyboard.press('Escape');
    await button('다른 사냥 선택').click();
    await page.getByLabel('사냥 선택',{exact:true}).selectOption({index:1});
    await button('이 선택 보기').click();
    await button('결과 보기').click();
    await verifyFit();
    await button('기존 분석 화면').click();
    await page.getByRole('heading',{name:'2. 사냥과 전투의 배분'}).waitFor();
    await verifyFit();
    for(const title of ['선택 해설','기록과 대안']){
      await button(title).click();
      await verifyFit();
    }
    await page.getByText('다른 선택이었다면?',{exact:false}).first().click();
    await verifyFit();
    await button('카드 도감').click();
    await button('다음').click();
    await verifyFit();
    await button('반복 실험').click();
    await verifyFit();
    await button('사이드뷰 사냥').click();
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.emulateMedia({reducedMotion:'reduce'});
    await button('사냥 재생').click();
    await page.getByRole('heading',{name:/고블린 확보/}).waitFor();
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
}
verify().catch(e=>{console.error(e);process.exitCode=1;});
