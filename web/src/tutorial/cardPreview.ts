import {CARDS,SLOT_COSTS} from '../data/cards.ts';
import {actingPlayer,allowed,applyAction,available,combatPower,eventValue,getUnit,level,personal,phaseName,type Action,type Game,type Ref} from '../engine/game.ts';

const name=(r:Ref)=>CARDS[r.id].name;
const sideLabel={attack:'공격',defense:'방어'} as const;

export function unavailableReason(g:Game,card:Ref,opening=false){
  const def=CARDS[card.id],p=g.players[0];
  const timing=def.type==='event'&&def.use!=='manage'?def.use:undefined;
  const window=timing?`내가 ${sideLabel[timing]}할 때 스킬·이벤트를 고르는 순서`:'내 턴의 운영 단계';
  const use=def.type==='ally'?'소환할':def.type==='skill'?'등록할':'쓸';
  const when=`${window}에 ${use} 수 있어.`;
  if(g.result)return '대전이 끝났어. 손패는 여기서 다시 살펴볼 수 있어.';
  if(opening)return `지금은 시작 손패를 고르는 중이야. ${when}`;
  const c=g.combat;
  const correctTiming=timing?c?.stage===(timing==='attack'?'attackBoost':'defenseBoost'):g.phase==='manage'&&!c;
  const reasons:string[]=[];
  if(actingPlayer(g)!==0||!correctTiming){
    const stage=c?({defenseParty:'방어 파티 선택',attackBoost:'공격 강화',defenseBoost:'방어 강화',resolve:'결투 판정'})[c.stage]:phaseName[g.phase];
    reasons.push(`지금은 ${actingPlayer(g)===0?'내':'상대'} ${stage} 차례야. ${when}`);
  }
  if(!allowed(p,card.id))reasons.push(`이 카드는 ${def.attrs.join('·')} 속성 리더가 필요해.`);
  if(def.type==='event'&&level(p.leader)<def.level)reasons.push(`리더가 Lv.${def.level}이어야 해. 지금은 Lv.${level(p.leader)}야.`);
  if(available(p)<def.cost)reasons.push(`필요한 경험치는 ${def.cost}, 지금 쓸 수 있는 경험치는 ${available(p)}. ${def.cost-available(p)} 부족해.`);
  if(correctTiming&&actingPlayer(g)===0){
    if(card.id==='EV3'&&!g.dungeon.length)reasons.push('공용 던전이 비어서 데려올 몬스터가 없어.');
    if(card.id==='EV4'&&!reasons.length)reasons.push('경험치를 낸 뒤에 다시 활성화할 휴식 몬스터가 남아 있어야 해.');
  }
  return reasons.join(' ');
}

export function cardDescription(r:Ref){
  const c=CARDS[r.id];
  if(c.type==='skill')return `등록 후 ${c.use==='attack'?'공격':'방어'} 스킬로 기본 +${c.power} · 리더 Lv.${c.level}부터 사용${c.effect==='추가 효과 없음.'?'':` · ${c.effect}`}`;
  if(c.type==='ally')return `기본 파워 ${c.power} · ${c.effect?.split(' · Lv2')[0]} · 소환하면 다음 내 턴에 움직일 수 있어.`;
  return c.effect;
}

// Project a legal draft through the same transition as confirmation. Only report public changes.
export function previewAction(g:Game,a:Action):string[]{
  if(!['summon','register','event','boost','attack','party','hunt'].includes(a.type))return [];
  const next=applyAction(g,a),who=actingPlayer(g),p=g.players[who],after=next.players[who];
  const card=p.hand.find(r=>r.uid===(a.event??a.card));
  const lines:string[]=[];
  if(a.type==='summon'&&card){
    const u=getUnit(after,card.uid)!;
    lines.push(`${name(card)} · 공격 ${personal(after,u,'attack')} / 방어 ${personal(after,u,'defense')}. 결투장에 휴식 상태로 나와. 다음 내 턴부터 움직일 수 있어.`);
  }
  if(a.type==='register'&&card){
    const slot=a.slot!,old=p.slots[slot];
    lines.push(`${slot+1}번 슬롯에 ${name(card)} 등록${old?` · 기존 ${name(old.card)} 교체`:''}. 나중에 쓸 때 내는 경험치는 ${SLOT_COSTS[slot]}이야.`);
    lines.push(cardDescription(card)!);
  }
  if(a.type==='event'&&card){
    if(card.id==='EV3')lines.push(`가장 약한 몬스터인 ${name(g.dungeon.find(m=>m.uid===a.target)!)} 1장이 던전에서 내 파밍존으로 와. 바로 경험치로 쓸 수 있어.`);
    if(card.id==='EV4')lines.push(`비용을 낸 뒤 ${name(p.farm.find(f=>f.card.uid===a.target)!.card)} 1장이 활성 상태가 돼. 다시 경험치나 레벨업에 쓸 수 있어.`);
    if(card.id==='EV9')lines.push('버림 더미부터 비용 2 이하 소환수를 찾아 손패로 가져와. 거기에 없으면 덱에서 찾은 뒤 덱을 섞어.');
  }
  if(a.type==='attack'||a.type==='boost'||a.type==='party'){
    const side=a.type==='party'||g.combat?.stage==='defenseBoost'?'defense':'attack';
    const power=combatPower(next,side).total;
    lines.push(`${sideLabel[side]} 파워 ${g.combat?`${combatPower(g,side).total} → `:''}${power} · 현재 ${side==='attack'?'방어':'공격'} ${combatPower(next,side==='attack'?'defense':'attack').total}.`);
    if(card?.id==='EV7')lines.push('이번 결투에서 상대의 방어 스킬을 막아. 방어 이벤트는 쓸 수 있어.');
    if(card?.id==='EV8')lines.push(g.combat?.target===p.leader.card.uid&&p.allies.some(u=>u.zone==='arena')?'리더가 받을 히트 1회를 결투장 동료 1장 파괴로 대신해.':'이번 대상이나 동료 배치로는 리더 히트를 대신 받을 수 없어.');
    if(card&&g.combat&&['EV5','EV6','EV10'].includes(card.id)){
      const c=g.combat,bonus=eventValue(p,getUnit(p,c.attacker)!,card.id,c.attackParty);
      lines.push(`${CARDS[card.id].effect} 지금 이 이벤트로 더해지는 파워는 ${bonus}이야.`);
    }
    if(a.type==='party')lines.push('양쪽이 스킬과 이벤트를 고르면 최종 파워가 정해져.');
    else if(side==='attack')lines.push('상대가 방어를 마쳐야 히트나 동료 손실이 정해져.');
    else if(power===combatPower(next,'attack').total)lines.push('동점이라서 리더는 히트를 받지 않아.');
    else if(power>combatPower(next,'attack').total)lines.push('방어 파워가 더 높아서 이번 공격을 막아.');
  }
  if(a.type==='hunt'){
    const monster=g.dungeon.find(m=>m.uid===a.target)!;
    const power=a.party!.reduce((sum,id)=>sum+personal(p,getUnit(p,id)!,'hunt'),0);
    const lost=p.allies.find(u=>!getUnit(after,u.card.uid));
    lines.push(`사냥 ${power} / ${name(monster)} ${CARDS[monster.id].power} · ${after.farm.some(f=>f.card.uid===monster.uid)?'포획 성공':'포획 실패'}. ${lost?`${name(lost.card)} 1장을 잃어.`:'참여 동료는 모두 살아남아 휴식해.'}`);
  }
  if(a.payment){
    const {bank,rest,discard}=a.payment,cost=bank+rest.length+discard.length;
    const farmNames=(ids:string[])=>ids.map(id=>name(p.farm.find(f=>f.card.uid===id)!.card)).join(', ');
    const kept=rest.filter(id=>!discard.includes(id));
    const paid=[bank?`임시 경험치 ${bank}`:'',kept.length?`${farmNames(kept)} 휴식`:'',discard.length?`${farmNames(discard)} 소모`:''].filter(Boolean);
    if(cost)lines.push(`비용 ${cost} · ${paid.join(' / ')} · 남는 경험치 ${available(p)} → ${available(after)}`);
  }
  return lines;
}
