import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction} from '../src/engine/game.ts';
import {lessonGame} from '../src/tutorial/lessons.ts';
import {explainMatchStep} from '../src/tutorial/matchHelp.ts';

function resolving(defense,attack=0){
  const g=createGame();g.phase='duel';
  g.combat={attacker:g.players[0].leader.card.uid,target:g.players[1].leader.card.uid,stage:'resolve',
    attackParty:[],defenseParty:[],attackBonus:attack,defenseBonus:defense,breakdown:[]};
  return g;
}
function explain(g,a){return explainMatchStep(g,applyAction(g,a));}
test('leader duel help distinguishes tie, block, successful hit, replacement and an empty hit deck',()=>{
  const resolve={type:'resolve'};
  const tie=explain(resolving(0),resolve);assert.equal(tie.topic,'tie');assert.match(tie.title,/카잔/);assert.match(tie.reason,/500/);
  assert.equal(explain(resolving(200),resolve).topic,'blocked');
  const g=resolving(0,100);g.combat.defenseEvent='EV8';
  assert.equal(explain(g,resolve).topic,'hit');
  g.players[1].allies.push({card:{id:'A01',uid:'guard'},zone:'arena',rest:false,leveled:false,levels:[]});
  const replacement=explain(g,resolve);assert.equal(replacement.topic,'replace-hit');assert.match(replacement.reason,/견습 모험가/);
  g.players[1].allies=[];g.players[1].deck=[];
  assert.equal(explain(g,resolve).topic,'empty-hit');
});
test('hunt explanation reports a captured monster and lost ally together when power ties',()=>{
  const g=lessonGame('hunt'),party=[g.players[0].allies[0].card.uid];
  const n=explain(g,{type:'hunt',party,target:g.dungeon.find(r=>r.id==='M04').uid});
  assert.equal(n.topic,'hunt-loss');assert.match(n.reason,/파밍존에 확보/);assert.match(n.reason,/견습 모험가 동료는 쓰러졌어/);
});
test('a turn with no allies explains the skipped hunt, and first-turn draw help hides card identities',()=>{
  const g=createGame();g.phase='hunt';
  assert.match(explain(g,{type:'advance'}).reason,/보낼 동료가 없어서/);
  g.phase='draw';const tip=explain(g,{type:'advance'});
  g.players[0].deck.reverse();assert.deepEqual(explain(g,{type:'advance'}),tip);
});
