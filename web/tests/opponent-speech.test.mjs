import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame} from '../src/engine/game.ts';
import {opponentSpeech} from '../src/components/opponentSpeech.ts';

test('the attacker speaks about the declared target; the bot also speaks when defending on the human turn',()=>{
  const g=createGame();
  g.phase='duel';
  const [human,bot]=g.players;
  const attack={type:'attack',unit:human.leader.card.uid,target:bot.leader.card.uid,party:[]};
  const declared=applyAction(g,attack);
  assert.equal(opponentSpeech(g,declared),null);
  const guarded=applyAction(declared,{type:'party',party:[]});
  assert.match(opponentSpeech(declared,guarded),/지원 없이 막아/);
  g.active=1;
  const counter=applyAction(g,{...attack,unit:bot.leader.card.uid,target:human.leader.card.uid});
  assert.equal(opponentSpeech(g,counter),'풍진을 노리자!');
});

test('drawing speaks the public count and never names a hidden draw',()=>{
  const g=createGame();g.active=1;g.turn=2;g.phase='draw';
  const drawn=applyAction(g,{type:'advance'});
  assert.equal(opponentSpeech(g,drawn),'카드 2장 뽑았어. 내 차례야!');
  assert.equal(opponentSpeech(undefined,drawn),null);
});
