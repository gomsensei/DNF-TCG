import {CARDS} from '../data/cards.ts';
import {actingPlayer,getUnit,level,type Game} from '../engine/game.ts';

function particle(word:string,withFinal:string,withoutFinal:string){
  const last=word.charCodeAt(word.length-1);
  // Monster suffixes A and B are read as 에이 and 비.
  const final=last>=0xac00&&last<=0xd7a3?(last-0xac00)%28:0;
  return word+(final&&!(withFinal==='으로'&&final===8)?withFinal:withoutFinal);
}
const object=(word:string)=>particle(word,'을','를');
const using=(word:string)=>particle(word,'으로','로');

/** Describe only a committed opponent choice, using names that choice revealed. */
export function opponentSpeech(before:Game|undefined,after:Game):string|null {
  if(!before||actingPlayer(before)!==1)return null;
  const a=after.actions.at(-1);
  if(!a)return null;
  const bot=before.players[1],foe=before.players[0];
  const unitName=(uid:string)=>CARDS[getUnit(bot,uid)!.card.id].name;
  const played=(uid:string)=>CARDS[bot.hand.find(r=>r.uid===uid)!.id].name;
  const monster=(uid:string)=>CARDS[before.dungeon.find(r=>r.uid===uid)!.id].name;
  const party=(a.party??[]).map(unitName);
  const team=party.length>2?`${party[0]} 팀`:party.join(', ');
  switch(a.type){
    case 'attack':{
      const target=object(CARDS[getUnit(foe,a.target)!.card.id].name);
      const call=a.unit===bot.leader.card.uid?'':unitName(a.unit!)+', ';
      return `${call}${party.length?'다 같이 ':''}${target} 노리자!`;
    }
    case 'hunt':return `${team}, ${object(monster(a.target!))} 잡으러 가자!`;
    case 'move':return `${unitName(a.unit!)}, ${a.zone==='dungeon'?'던전으로 가자!':'결투장으로 돌아가자!'}`;
    case 'party':return party.length?`${team}, 같이 막아 줘!`:'이번엔 지원 없이 막아 볼게.';
    case 'boost':{
      const cards:string[]=[];
      if(a.skill!==undefined)cards.push(CARDS[bot.slots[a.skill]!.card.id].name);
      if(a.event)cards.push(played(a.event));
      const defense=before.combat?.stage==='defenseBoost';
      if(!cards.length)return defense?'카드는 아끼고 이대로 막아 볼게.':'더 쓰진 않을게. 이대로 간다!';
      const combo=cards.length===2?particle(cards[0],'이랑','랑')+' '+cards[1]:cards[0];
      return `${using(combo)} ${defense?'막아 볼게!':'밀어붙일게!'}`;
    }
    case 'summon':return `${played(a.card!)}, 나와 줘!`;
    case 'register':return `${object(played(a.card!))} ${a.slot!+1}번 자리에 준비해 둘게.`;
    case 'level':{
      const ally=getUnit(after.players[1],a.unit)!;
      return `${object(unitName(a.unit!))} 레벨 ${level(ally)}까지 키웠어!`;
    }
    case 'event':{
      const card=played(a.card!);
      if(a.target&&before.dungeon.some(m=>m.uid===a.target))return `${using(card)} ${object(monster(a.target))} 데려올게!`;
      return `이번엔 ${object(card)} 쓸게!`;
    }
    case 'kazan':return '덱에서 한 장 버리고 경험치 1을 챙길게.';
    case 'recovery':return '견습 모험가, 다시 힘을 빌려줘!';
    case 'advance':{
      const drawn=after.players[1].hand.length-bot.hand.length;
      if(before.phase==='draw'&&drawn>0)return `카드 ${drawn}장 뽑았어. 내 차례야!`;
      if(before.phase==='end'&&!after.result)return '여기까지 할게. 이제 네 차례야!';
      return null;
    }
    case 'resolve':return null;
  }
}
