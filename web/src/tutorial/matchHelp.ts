import {CARDS,SLOT_COSTS} from '../data/cards.ts';
import {actingPlayer,available,combatPower,getUnit,level,personal,type Action,type Game,type Player,type Ref} from '../engine/game.ts';

export type RuleNote={title:string;reason:string;details:string[];topic?:string;keyFact?:string};
const name=(r:Ref)=>CARDS[r.id].name;
function note(title:string,reason:string,details:string[]=[],topic?:string):RuleNote{return {title,reason,details,topic};}
function lost(before:Player,after:Player){
  return before.allies.filter(u=>!after.allies.some(v=>v.card.uid===u.card.uid)).map(u=>name(u.card));
}
function duel(before:Game,after:Game):RuleNote{
  const c=before.combat!,attacker=before.players[before.active],defender=before.players[1-before.active],next=after.players[1-before.active];
  const atk=combatPower(before,'attack'),def=combatPower(before,'defense');
  const target=getUnit(defender,c.target)!,leader=name(defender.leader.card);
  const hits=next.hit.length-defender.hit.length;
  const compare=`공격 ${atk.total}, 방어 ${def.total}`;
  const details=[`${name(getUnit(attacker,c.attacker)!.card)}의 공격 ${atk.total} = ${atk.parts.join(' + ')}`,
    `${name(target.card)}의 방어 ${def.total} = ${def.parts.join(' + ')}`,...c.breakdown,
    `${leader}의 받은 히트 · ${defender.hit.length} → ${next.hit.length}`];
  for(const [i,p] of before.players.entries()){
    const gone=lost(p,after.players[i]);
    if(gone.length)details.push(`${name(p.leader.card)} 쪽에서 잃은 동료 · ${gone.join(', ')}`);
  }
  if(c.attackParty.length&&atk.total>def.total&&def.total>atk.personal){
    details.push(`파티 덕분에 이겼지만 공격자 혼자서는 ${atk.personal}이라 방어 ${def.total}보다 약해. 그래서 공격을 도운 동료 한 명을 잃었어.`);
  }
  if(atk.total===def.total&&(c.attackParty.length||c.defenseParty.length)){
    details.push('동점이면 양쪽 전투 주체가 손실을 받아. 리더가 참여했다면 자기를 도운 파티 동료가 있을 때 한 명이 대신 쓰러져.');
  }
  if(target!==defender.leader)return note('왜 리더의 히트는 그대로지?',
    `이번 공격 대상은 동료 ${name(target.card)}야. 동료끼리의 결투는 리더 히트에 영향을 주지 않아. ${compare}.`,details,'ally-duel');
  if(hits)return note(`왜 ${leader}에게 1히트가 들어갔지?`,
    `공격 ${atk.total}이 방어 ${def.total}보다 높아서 리더에게 1히트가 들어갔어.${next.hit.length===5?' 이번이 다섯 번째라 대전도 끝났어.':''}`,details,'hit');
  if(after.result?.reason==='히트용 덱 부족')return note('왜 히트가 늘기 전에 끝났지?',
    `${compare}. 공격이 통했는데 히트로 옮길 덱 카드가 없어 ${leader} 쪽이 바로 패배했어.`,details,'empty-hit');
  if(atk.total>def.total&&c.defenseEvent==='EV8'){
    return note('공격이 더 높은데 왜 히트가 없지?',
      `${compare}. ‘${CARDS.EV8.name}’ 효과로 ${lost(defender,next).join(', ')} 동료가 대신 쓰러져서 히트는 그대로야.`,details,'replace-hit');
  }
  const blocked=note(`왜 ${leader}의 히트가 그대로지?`,atk.total===def.total
    ?`공격과 방어가 ${atk.total}으로 같아서 막혔어. 리더에게 1히트를 주려면 공격이 방어보다 높아야 해.`
    :`공격 ${atk.total}보다 방어 ${def.total}이 높아서 막혔어. 공격을 선언해도 방어를 뚫어야 히트가 들어가.`,details,atk.total===def.total?'tie':'blocked');
  const boosts=[...(c.defenseSkill!==undefined?[name(defender.slots[c.defenseSkill]!.card)]:[]),...(c.defenseEvent?[CARDS[c.defenseEvent].name]:[])];
  if(boosts.length&&c.defenseBonus)blocked.keyFact=`방어에 쓴 ${boosts.join(' + ')} 덕분에 방어 파워가 ${c.defenseBonus} 올라갔어.`;
  return blocked;
}

function payment(a:Action,p:Player,next:Player){
  if(!a.payment)return [];
  const pay=a.payment,labels=(uids:string[])=>uids.map(uid=>name(p.farm.find(f=>f.card.uid===uid)!.card)).join(', ');
  const lines=[`지불한 경험치 ${pay.rest.length+pay.discard.length+pay.bank} · 행동 전후 가용 경험치 ${available(p)} → ${available(next)}`];
  if(pay.rest.length)lines.push(`활성 카드를 쉬게 해서 장당 경험치 1 · ${labels(pay.rest)}`);
  if(pay.discard.length)lines.push(`쉬는 카드를 버려서 장당 경험치 1 · ${labels(pay.discard)}`);
  if(pay.bank)lines.push(`임시 경험치 ${pay.bank} 사용`);
  return lines;
}

export function explainMatchStep(before:Game,after:Game):RuleNote{
  const a=after.actions.at(-1)!,actor=actingPlayer(before),p=before.players[actor],next=after.players[actor];
  const own=(id?:string)=>name(getUnit(p,id)!.card);
  const paid=payment(a,p,next);
  switch(a.type){
    case 'resolve':return duel(before,after);
    case 'attack':return note('공격했는데 벌써 맞은 걸까?',
      '지금은 공격할 대상을 정했어. 방어 파티를 고르고 양쪽이 스킬과 이벤트를 쓴 뒤에 히트를 판정해.',
      [`공격자 ${own(a.unit)} · 대상 ${name(getUnit(before.players[1-actor],a.target)!.card)}`,'공격에 나선 리더와 동료는 쉬는 상태가 돼.']);
    case 'party':return note('누가 방어에 힘을 보탰지?',a.party?.length
      ?`${a.party.map(own).join(', ')} 합류! 방어 파워에 보태고, 참여한 동료는 쉬게 돼.`
      :'도와줄 동료를 보내지 않아서 공격받은 캐릭터가 혼자 막아. 이제 양쪽이 스킬과 이벤트를 고를 차례야.');
    case 'boost':{
      const side=before.combat!.stage==='attackBoost'?'attack':'defense',label=side==='attack'?'공격':'방어';
      const event=a.event?CARDS[p.hand.find(r=>r.uid===a.event)!.id]:undefined;
      const cards=[...(a.skill!==undefined?[name(p.slots[a.skill]!.card)]:[]),...(event?[event.name]:[])];
      const start=combatPower(before,side).total,end=combatPower(after,side).total;
      return note(`왜 ${label} 파워가 이렇게 됐지?`,cards.length
        ?`‘${cards.join(' + ')}’ 사용 후 ${label} 파워는 ${start} → ${end}이야.`
        :`추가 카드를 쓰지 않아서 ${label} 파워는 ${end} 그대로야.`,[...paid,...(event?.effect?[event.effect]:[])]);
    }
    case 'hunt':{
      const m=before.dungeon.find(r=>r.uid===a.target)!,power=CARDS[m.id].power;
      const hunters=a.party!.map(id=>getUnit(p,id)!),total=hunters.reduce((n,u)=>n+personal(p,u,'hunt'),0);
      const won=next.farm.some(f=>f.card.uid===m.uid),gone=lost(p,next);
      const details=[`참여 동료 · ${hunters.map(u=>name(u.card)+' '+personal(p,u,'hunt')).join(' + ')}`,
        `파밍존 ${p.farm.length} → ${next.farm.length}장 · 가용 경험치 ${available(p)} → ${available(next)}`];
      if(gone.length)details.push(won&&total>power?'합계로 이겨도 혼자 몬스터보다 강한 동료가 없으면 한 명을 잃어.':'동점이거나 사냥 파워가 낮으면 가장 강한 참여 동료 한 명을 잃어.');
      details.push('살아남은 참여 동료도 쉬어야 해서 다음 자기 턴 전까지 방어 파티를 도울 수 없어.');
      return note('사냥해서 무엇을 얻고 잃었지?',`사냥 ${total}, ${name(m)} ${power}. ${won?'몬스터를 파밍존에 확보했어.':'파워가 모자라 몬스터는 던전에 남았어.'} ${gone.length?gone.join(', ')+' 동료는 쓰러졌어.':'참여한 동료는 이제 쉬어.'}`,details,gone.length?'hunt-loss':'hunt');
    }
    case 'move':return note('이동하면 바로 쉬어야 할까?',
      `${own(a.unit)}의 위치가 ${a.zone==='dungeon'?'던전':'결투장'}으로 바뀌었어. 이동만으로는 활성·휴식 상태가 바뀌지 않아.`);
    case 'summon':{
      const card=CARDS[p.hand.find(r=>r.uid===a.card)!.id];
      return note('방금 낸 동료는 왜 움직일 수 없지?',
        `${card.name} 소환에 쓴 경험치는 ${card.cost}야. 새 동료는 쉬면서 등장해서 다음 자기 턴부터 움직일 수 있어.`,paid,'summon');
    }
    case 'register':return note('등록한 스킬은 언제 발동하지?',
      `지금 낸 경험치는 스킬을 ${a.slot!+1}번 슬롯에 준비하는 비용이야. 결투 중에 이 슬롯의 사용 비용 ${SLOT_COSTS[a.slot!]}을 내야 발동해.`,paid,'register');
    case 'level':{
      const u=getUnit(next,a.unit)!,m=p.farm.find(f=>f.card.uid===a.card)!.card;
      return note('성장했는데 왜 자원이 줄었지?',`${name(m)} 카드를 붙여서 ${name(u.card)}의 레벨이 ${level(u)-1} → ${level(u)}이 됐어. 붙인 카드는 파밍존을 떠나 비용으로 쓸 수 없어.`,[`가용 경험치 ${available(p)} → ${available(next)}`],'level');
    }
    case 'event':{
      const card=p.hand.find(r=>r.uid===a.card)!;
      const outcome=card.id==='EV3'?`가장 약한 몬스터 ${name(before.dungeon.find(r=>r.uid===a.target)!)} 확보! 동료를 사냥에 보내지 않고 파밍존에 넣었어.`
        :card.id==='EV4'?`${name(next.farm.find(f=>f.card.uid===a.target)!.card)} 카드가 다시 활성화돼서 성장에도 쓸 수 있어.`
        :next.hand.length===p.hand.length?'조건에 맞는 소환수 한 장을 찾아 손패에 넣었어.':'찾을 소환수가 없어서 손패에 추가된 카드는 없어.';
      return note(name(card)+'의 효과',outcome,[...paid,'사용한 이벤트 카드는 버림 더미로 가.']);
    }
    case 'kazan':return note('이번 경험치는 어디서 생겼지?','카잔이 덱 한 장을 버려 임시 경험치 1을 얻었어. 이번 턴이 끝나면 남은 임시 경험치는 사라져.');
    case 'recovery':return note('견습은 어떻게 돌아왔지?','동료와 가용 경험치가 모두 0이라 재건 지원을 썼어. 견습 모험가는 쉬는 상태로 돌아와.');
    case 'advance':{
      if(before.phase==='start')return note('새 턴에 무엇이 다시 준비될까?','자기 턴이 시작돼서 리더·동료·스킬이 다시 활성화됐어. 쉬고 있는 파밍 카드는 그대로야.');
      if(before.phase==='draw')return after.result?note('왜 여기서 대전이 끝났지?','뽑아야 하는 카드를 덱에서 다 뽑을 수 없어서 패배했어.'):note('왜 이만큼 뽑았지?',before.turn===1?'선공의 첫 턴이라 한 장을 뽑았어. 이후 턴부터는 두 장씩 뽑아.':'첫 턴이 지났기 때문에 이번에는 두 장을 뽑았어.');
      if(before.phase==='refill')return note('몬스터는 언제 다시 나오지?',`운영이 끝나서 던전의 빈자리를 채웠어. 이번에 새로 나온 몬스터는 ${after.dungeon.length-before.dungeon.length}장이야.`);
      if(before.phase==='end')return after.result?note('던전 덱이 다 떨어지면 누가 이기지?','턴이 끝날 때 몬스터 덱이 비었어. 받은 히트가 적은 쪽이 이기고, 같으면 리더 레벨을 비교해. 둘 다 같으면 무승부야.'):note('왜 차례가 넘어갔지?',`${name(p.leader.card)}의 턴이 끝났어. 이제 ${name(after.players[after.active].leader.card)} 쪽이 카드를 준비해.`);
      if(before.phase==='hunt'){
        if(!p.allies.length)return note('왜 사냥을 건너뛰었지?','리더는 사냥에 나갈 수 없어. 보낼 동료가 없어서 결투 단계로 넘어왔어.');
        if(p.allies.every(u=>u.rest))return note('왜 사냥을 더 못 하지?','동료가 모두 쉬고 있어서 사냥을 더 할 수 없어. 이제 결투할 차례야.');
        return note('왜 이제 사냥을 못 하지?','사냥 단계를 마쳐 결투로 넘어왔어. 사냥에 나가 쉬고 있는 동료는 이번 결투를 도울 수 없어.');
      }
      if(before.phase==='duel')return note('지금은 어떤 카드를 낼 수 있지?','결투를 마치고 운영 단계에 들어왔어. 경험치를 써서 동료를 소환하거나 스킬을 등록할 수 있어.');
      if(before.phase==='manage')return note('운영 다음에는 뭘 할까?','카드를 내는 단계를 마쳤어. 던전의 빈자리를 채운 뒤 활성 파밍 카드를 붙여 레벨을 올릴 수 있어.');
      return note('왜 이제 레벨을 못 올리지?','레벨업 단계를 마쳐서 이번 턴의 성장 기회가 끝났어.');
    }
  }
}
