import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,playerActions,available,combatPower} from '../src/engine/game.ts';
import {unavailableReason,previewAction} from '../src/tutorial/cardPreview.ts';

function setup(ids,leader='L01'){
  const g=createGame(17,[leader,'L02']);
  g.phase='manage';
  const p=g.players[0];
  p.hand=ids.map((id,i)=>({id,uid:'hand-'+i}));
  return {g,p};
}
test('summon and slot drafts follow the selected action without changing the game',()=>{
  const {g,p}=setup(['A03','S07']);
  const original=structuredClone(g);
  const actions=playerActions(g);
  for(const a of actions.filter(a=>a.card)){
    const lines=previewAction(g,a).join(' '),after=applyAction(g,a).players[0];
    assert.ok(lines.includes(`남는 경험치 ${available(p)} → ${available(after)}`));
    if(a.type==='summon')assert.match(lines,/공격 400 \/ 방어 400.*휴식/);
    if(a.type==='register'){
      assert.ok(lines.includes(`${a.slot+1}번 슬롯`));
      assert.match(lines,/리더 Lv.5부터 사용/);
      assert.equal(lines.includes('교체'),a.slot<2);
    }
  }
  assert.deepEqual(g,original);
});
test('blocked card explains timing, level, exact shortfall and missing target',()=>{
  const {g,p}=setup(['EV3','S07']);
  p.farm=[];g.phase='hunt';
  assert.match(unavailableReason(g,p.hand[0]),/내 사냥.*운영 단계.*Lv.2.*Lv.1.*2 부족/);
  assert.doesNotMatch(unavailableReason(g,p.hand[1]),/Lv.5/);
  assert.match(unavailableReason(g,p.hand[1],true),/시작 손패.*등록/);
  g.active=1;assert.match(unavailableReason(g,p.hand[0]),/상대 사냥/);
  g.active=0;g.phase='manage';g.dungeon=[];
  assert.match(unavailableReason(g,p.hand[0]),/던전이 비어서/);
});
test('EV4 can protect a selected target from automatic payment and previews net experience',()=>{
  const {g,p}=setup(['EV4']);
  p.leader.levels.push({id:'M01',uid:'level'});p.bank=1;
  const targets=playerActions(g).filter(a=>a.type==='event');
  assert.equal(targets.length,p.farm.length);
  for(const a of targets){
    assert.deepEqual(a.payment.rest,[a.target]);
    assert.match(previewAction(g,a).join(' '),/남는 경험치 5 → 5/);
  }
  p.farm.forEach(f=>f.rest=true);p.bank=0;
  const restore=playerActions(g).filter(a=>a.type==='event');
  assert.equal(restore.length,2);
  assert.ok(restore.every(a=>!a.payment.discard.includes(a.target)));
  p.farm.pop();
  assert.equal(playerActions(g).filter(a=>a.type==='event').length,0);
  assert.match(unavailableReason(g,p.hand[0]),/휴식 몬스터가 남아/);
});
test('search preview reveals no hidden draw and an attack remains conditional',()=>{
  const {g,p}=setup(['EV9'],'L03');
  const a=playerActions(g).find(a=>a.type==='event');
  const before=structuredClone(g),withDeck=previewAction(g,a);
  assert.deepEqual(g,before);
  p.deck=[];assert.deepEqual(previewAction(g,a),withDeck);
  const battle=setup(['EV1']);battle.g.phase='duel';
  let duel=applyAction(battle.g,playerActions(battle.g).find(a=>a.type==='attack'));
  duel=applyAction(duel,{type:'party',party:[]});
  for(const boost of playerActions(duel).filter(a=>a.event)){
    const after=applyAction(duel,boost);
    const lines=previewAction(duel,boost).join(' ');
    assert.ok(lines.includes(`공격 파워 500 → ${combatPower(after,'attack').total}`));
    assert.match(lines,/상대가 방어를 마쳐야/);
  }
});
