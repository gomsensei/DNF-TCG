import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,candidates,observe,actingPlayer,checkInvariants,available} from '../src/engine/game.ts';
import {chooseBot,rankBot,stepBot} from '../src/bots/baseline.ts';
import {LESSONS,lessonGame,lessonComplete} from '../src/tutorial/lessons.ts';
import {explainAction,previewChoices,choicesFor} from '../src/tutorial/explain.ts';
import {branchHistory} from '../src/tutorial/history.ts';
import {runExperiment} from '../src/tutorial/experiment.ts';
import {PROFILES,ELITE_COUNTS} from '../src/data/profiles.ts';

test('all seven teaching scenes conserve cards, execute lesson choice and replay exactly',()=>{
  for(const l of LESSONS){const g=lessonGame(l.id);checkInvariants(g);assert.equal(g.profile,l.profile);assert.equal(lessonComplete(l.id,g),false);const after=stepBot(g);assert.equal(after.actions.at(-1).type,l.action);let complete=after;for(let i=0;i<10&&!lessonComplete(l.id,complete);i++)complete=stepBot(complete);assert.equal(lessonComplete(l.id,complete),true);checkInvariants(after);assert.deepEqual(applyAction(lessonGame(l.id),after.actions[0]),after);}
});
test('bot ranking and explanation use the actual choice and actor before transition',()=>{
  for(const l of LESSONS){const g=lessonGame(l.id),actions=candidates(g),o=observe(g,actingPlayer(g)),ranked=rankBot(o,actions),a=chooseBot(o,actions),after=applyAction(g,a),e=explainAction(g,a,after);assert.deepEqual(ranked[0].action,a);assert.equal(e.recommended,true);assert.equal(e.player,actingPlayer(g));assert.ok(e.evaluation.includes('1위'));assert.ok(e.result.includes(`가용 경험치 ${available(g.players[e.player])} → ${available(after.players[e.player])}`));}
  const defense=lessonGame('defense'),e=explainAction(defense,choicesFor(defense)[0].action);assert.equal(e.player,0);assert.equal(defense.active,1);assert.match(e.result,/방어 파워 500 → 900/);
});
test('opponent hidden cards do not affect decision explanations or scores',()=>{
  const g=lessonGame('party'),a=choicesFor(g)[0].action,e=explainAction(g,a),ranked=choicesFor(g);g.players[1].hand=[{id:'EV2',uid:'secret-hand'}];g.players[1].deck.reverse();g.players[1].hit=[{id:'A02',uid:'secret-hit'}];
  // Public hit count matters to Kazan power, so keep that count unchanged for this comparison.
  g.players[1].hit=[];assert.deepEqual(choicesFor(g),ranked);assert.deepEqual(explainAction(g,a),e);assert.ok(!JSON.stringify(e).includes('secret-hand'));
});
test('alternative previews are legal, deterministic and do not mutate source',()=>{
  for(const l of LESSONS){const g=lessonGame(l.id),snapshot=structuredClone(g),options=previewChoices(g);assert.ok(options.length);for(const c of options){const n=applyAction(g,c.action);checkInvariants(n);assert.deepEqual(c.explanation,explainAction(g,c.action,n));}assert.deepEqual(g,snapshot);assert.deepEqual(previewChoices(g),options);}
});
test('branch replaces future history and preserves prior snapshots',()=>{
  const g=lessonGame('economy'),one=stepBot(g),two=stepBot(one),history=[g,one,two],copy=structuredClone(history),pass=candidates(g).find(a=>a.type==='advance'),branch=branchHistory(history,0,pass);
  assert.equal(branch.length,2);assert.equal(branch[1].phase,'refill');assert.deepEqual(history,copy);assert.deepEqual(branch[1],applyAction(g,pass));assert.deepEqual(lessonGame('economy'),g);assert.throws(()=>branchHistory(history,-1,pass));
});
test('profiles retain a 50-card dungeon and explicit experiment versions',()=>{
  assert.equal(ELITE_COUNTS.reduce((n,v)=>n+v,0),50);
  for(const id of Object.keys(PROFILES)){const g=createGame(44,['L01','L02'],undefined,id);checkInvariants(g);assert.equal(g.profile,id);assert.equal(g.monsterDeck.length+g.dungeon.length+g.players.flatMap(p=>p.farm).length,50);assert.equal(g.version.includes('dnf-lab-0.1'),id!=='core');assert.deepEqual(g,createGame(44,['L01','L02'],undefined,id));}
});
function hunting(profile,power){const g=createGame(55,['L01','L02'],undefined,profile);g.phase='hunt';g.players[0].allies=[{card:{id:power===400?'A02':'A01',uid:'hunter'},rest:false,zone:'dungeon',levels:[],leveled:false}];g.dungeon=[{id:'M08',uid:'elite'}];return g;}
test('elite reward draws only on successful 400+ hunt, including equality',()=>{
  for(const profile of ['core','elite'])for(const power of [200,400]){const g=hunting(profile,power),n=g.players[0].hand.length,a={type:'hunt',party:['hunter'],target:'elite'},after=applyAction(g,a);assert.equal(after.players[0].hand.length,n+(profile==='elite'&&power===400?1:0));}
  const g=lessonGame('hunt');g.profile='elite';const n=stepBot(g);assert.equal(n.players[0].hand.length,g.players[0].hand.length);
  const boss=lessonGame('boss'),n2=stepBot(boss);checkInvariants(n2);assert.equal(n2.players[0].hand.length,boss.players[0].hand.length+1);assert.equal(n2.players[0].allies.length,boss.players[0].allies.length-1);
});
test('elite extra draw obeys deck-out loss',()=>{const g=hunting('elite',400);g.players[0].deck=[];const n=applyAction(g,{type:'hunt',party:['hunter'],target:'elite'});assert.deepEqual(n.result,{winner:1,reason:'드로우 실패'});});
test('recovery from deck is once only, deterministic, rested and conserves cards',()=>{
  const g=lessonGame('recovery'),n=applyAction(g,{type:'recovery'});assert.equal(n.players[0].allies[0].card.id,'A01');assert.equal(n.players[0].allies[0].rest,true);assert.equal(n.players[0].recoveryUsed,true);assert.notEqual(n.rng,g.rng);checkInvariants(n);assert.deepEqual(applyAction(g,{type:'recovery'}),n);assert.throws(()=>applyAction(n,{type:'recovery'}));n.players[0].discard.push(n.players[0].allies.pop().card);assert.throws(()=>applyAction(n,{type:'recovery'}));
});
test('recovery prefers discard, preserves deck order and rejects unmet conditions',()=>{
  const g=lessonGame('recovery'),p=g.players[0],at=p.deck.findIndex(r=>r.id==='A01'),card=p.deck.splice(at,1)[0];p.discard.push(card);const after=applyAction(g,{type:'recovery'});assert.equal(after.players[0].allies[0].card.uid,card.uid);assert.equal(after.rng,g.rng);assert.deepEqual(after.players[0].deck,g.players[0].deck);checkInvariants(after);
  for(const mutate of [g=>g.profile='core',g=>g.phase='hunt',g=>g.players[0].bank=1,g=>g.players[0].allies.push({card:{id:'A01',uid:'exists'},rest:false,zone:'arena',levels:[],leveled:false}),g=>{const p=g.players[0];p.deck=p.deck.filter(r=>r.id!=='A01');p.discard=p.discard.filter(r=>r.id!=='A01');}]){const bad=lessonGame('recovery');mutate(bad);assert.throws(()=>applyAction(bad,{type:'recovery'}));assert.ok(!candidates(bad).some(a=>a.type==='recovery'));}
});
test('paired experiment records separate complete original and improvement samples',()=>{
  const progress=[],result=runExperiment(20,20261020,['L01','L02'],'combined',n=>progress.push(n));assert.equal(result.rows.length,2);assert.equal(result.rows[0].profile,'core');assert.equal(result.rows[1].profile,'combined');for(const row of result.rows){assert.equal(row.wins.reduce((a,b)=>a+b),20);assert.equal(Object.values(row.reasons).reduce((a,b)=>a+b),20);assert.ok(row.averageTurns>0);}assert.equal(progress.at(-1),20);assert.ok(result.rows[1].eliteHunts>0);assert.equal(result.rows[0].eliteHunts,0);assert.throws(()=>runExperiment(21,1,['L01','L02'],'core'));
});
