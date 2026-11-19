import {CARDS} from '../data/cards.ts';
import {candidates,observe,actingPlayer,applyAction,getUnit,personal,available,level,combatPower,phaseName, type Game,type Action} from '../engine/game.ts';
import {rankBot} from '../bots/baseline.ts';

export type Choice={action:Action;score:number;rank:number;label:string};
export type Explanation={player:0|1;name:string;label:string;reason:string;tradeoff:string;result:string;evaluation:string;recommended:boolean;kind:'choice'|'rule';highlights:string[]};
export const actionKey=(a:Action)=>JSON.stringify(a);
export function actionLabel(g:Game,a:Action){
  const p=g.players[actingPlayer(g)],other=g.players[1-g.active];
  const name=(uid?:string)=>{const r=[...p.hand,...p.farm.map(f=>f.card),...p.allies.map(u=>u.card),p.leader.card,...other.allies.map(u=>u.card),other.leader.card,...g.dungeon].find(r=>r.uid===uid);return r?CARDS[r.id].name:'대상';};
  if(a.type==='summon')return `${name(a.card)} 소환`;
  if(a.type==='register')return `${name(a.card)} → ${a.slot!+1}번 슬롯 등록`;
  if(a.type==='hunt')return `${(a.party??[]).map(name).join(' + ')} → ${name(a.target)} 사냥`;
  if(a.type==='move')return `${name(a.unit)} → ${a.zone==='dungeon'?'던전':'결투장'} 이동`;
  if(a.type==='attack')return `${name(a.unit)} → ${name(a.target)} · 파티 ${a.party?.length??0}장`;
  if(a.type==='party')return a.party?.length?`방어 파티 ${a.party.length}장`:'방어 파티 없이 대응';
  if(a.type==='boost')return [a.skill!==undefined?CARDS[p.slots[a.skill]!.card.id].name:'',a.event?name(a.event):''].filter(Boolean).join(' + ')||'스킬·이벤트를 쓰지 않음';
  if(a.type==='event')return `${name(a.card)} 사용`;
  if(a.type==='level')return `${name(a.unit)} Lv.${level(getUnit(p,a.unit)!)+1} 성장`;
  if(a.type==='kazan')return '덱 1장을 버려 임시 경험치 확보';
  if(a.type==='recovery')return '견습 모험가 재건 지원';
  if(a.type==='resolve')return '공개된 파워로 결투 결과 처리';
  return `${phaseName[g.phase]} 마치기`;
}
export function choicesFor(g:Game):Choice[]{if(g.result)return[];return rankBot(observe(g,actingPlayer(g)),candidates(g)).map(r=>({...r,label:actionLabel(g,r.action)}));}
export function important(a:Action){return ['summon','hunt','attack','level','event','recovery'].includes(a.type)||(a.type==='boost'&&(a.skill!==undefined||!!a.event));}
export function explainAction(before:Game,a:Action,after:Game=applyAction(before,a)):Explanation {
  const player=actingPlayer(before),p=before.players[player],next=after.players[player];
  const ranked=choicesFor(before),recommended=ranked.length>0&&actionKey(ranked[0].action)===actionKey(a);
  let reason='',tradeoff='';
  const highlights=[a.unit,a.target,a.card,a.event,...(a.party??[])].filter((x):x is string=>!!x);
  if(a.type==='summon'){
    const card=CARDS[p.hand.find(r=>r.uid===a.card)!.id];
    reason=`이 기본 봇은 동료 수를 확보하고 소환 비용을 아끼는 선택에 가중치를 줍니다. ${card.name}의 소환 비용은 ${card.cost}입니다.`;
    tradeoff='새 동료는 레스트 소환됩니다. 이번 턴 사냥·공격과 바로 다음 상대 턴의 방어 파티에는 쓸 수 없습니다.';
  } else if(a.type==='hunt'){
    const power=(a.party??[]).reduce((n,id)=>n+personal(p,getUnit(p,id)!,'hunt'),0),m=before.dungeon.find(r=>r.uid===a.target)!;
    const dead=p.allies.length-next.allies.length;
    reason=`사냥 파워 ${power}와 ${CARDS[m.id].name} ${CARDS[m.id].power}를 비교했습니다. 이 봇은 동료가 생존하는 사냥과 적은 참여 인원을 높게 평가합니다.`;
    tradeoff=`참여 동료 ${a.party?.length??0}장은 레스트됩니다. 이번 결투에 쓸 수 없으며${dead>0?` 동료 ${dead}장을 잃었습니다.`:' 다음 자기 턴 전까지 방어 파티에도 참여할 수 없습니다.'}`;
  } else if(a.type==='move'){
    const u=getUnit(p,a.unit)!,safe=before.dungeon.some(m=>personal(p,u,'hunt')>CARDS[m.id].power);
    reason=a.zone==='dungeon'?`공개된 몬스터 중 혼자 살아남으며 잡을 대상이 ${safe?'있어 사냥을 준비합니다.':'있는지 검토하는 이동입니다.'}`:'안전한 단독 사냥 대상이 부족하면 이 봇은 결투장 복귀에 가중치를 줍니다.';
    tradeoff='이동 자체는 레스트되지 않습니다. 사냥 단계가 끝나기 전에 어느 존에 남길지 결정해야 합니다.';
  } else if(a.type==='level'){
    const u=getUnit(p,a.unit)!;
    reason=`이 봇은 리더 성장을 동료 성장보다 우선하고, 부착 효과가 있는 몬스터에도 가중치를 줍니다. ${CARDS[u.card.id].name}를 Lv.${level(u)+1}로 올립니다.`;
    tradeoff='부착한 활성 몬스터는 파밍존을 떠나므로 비용으로 쓸 수 없습니다. 더 높은 레벨의 스킬도 실제로 뽑고 등록해야 사용할 수 있습니다.';
  } else if(a.type==='attack'){
    reason='자기 공격 전력과 공개된 상대 파워를 비교해 리더 히트나 동료 제거를 노립니다. 상대 손패는 보지 않았으며 방어 반응에 따라 결과가 바뀝니다.';
    tradeoff=`공격자와 파티 ${a.party?.length??0}장을 레스트합니다. 성공해도 상대 최종 방어가 공격자 개인 파워보다 높으면 파티 동료를 잃을 수 있습니다.`;
  } else if(a.type==='party'){
    reason='상대가 공개한 공격자·파티와 등록된 스킬을 보고 방어 파워를 예상합니다. 이 봇은 막을 수 있다면 지원 동료를 적게 쓰는 편을 선호합니다.';
    tradeoff='방어 파티는 먼저 확정됩니다. 이후 스킬·이벤트를 보고 동료를 추가하거나 취소할 수 없습니다.';
  } else if(a.type==='boost'){
    const defense=before.combat?.stage==='defenseBoost';
    reason=defense?'공개된 공격 파워에 대응해 방어 성공 또는 동률을 만들면서 비용을 줄이려는 평가입니다.':'공개된 방어 파티와 등록 스킬을 바탕으로 공격 성공을 예상하면서 비용을 줄이려는 평가입니다. 상대 손패의 이벤트는 알지 못합니다.';
    tradeoff=a.skill!==undefined||a.event?'지금 낸 경험치는 성장·다음 방어에 남지 않습니다. 일반 스킬은 레스트되고 이벤트는 버립니다.':'자원을 보존하지만 히트나 동료 손실을 받아들일 수 있습니다.';
    if(a.skill!==undefined)highlights.push(p.slots[a.skill]!.card.uid);
  } else if(a.type==='register'){
    reason='리더 레벨로 사용할 수 있는 시점, 기존 슬롯보다 높은 파워, 낮은 슬롯 사용 비용을 평가해 등록합니다.';
    tradeoff='등록 비용은 지금, 사용 비용은 결투마다 따로 냅니다. 기존 스킬을 덮어쓰면 그 스킬을 잃습니다.';
  } else if(a.type==='event'){
    const id=p.hand.find(r=>r.uid===a.card)!.id;
    reason=id==='EV3'?'가장 약한 공개 몬스터를 사냥 없이 확보합니다. 동료를 레스트하지 않는 대신 경험치를 냅니다.':id==='EV4'?'레스트 파밍 자원을 활성화해 다시 비용이나 레벨업에 쓸 수 있게 합니다.':'디스카드를 우선 찾아 저비용 소환수를 손패에 확보합니다. 이 봇은 동료가 적을 때 탐색을 선호합니다.';
    tradeoff='이벤트는 일회용입니다. 자원 회복이나 탐색이 곧 무료 이득을 의미하지 않으므로 지불 비용도 함께 봅니다.';
  } else if(a.type==='kazan'){
    reason='카잔 Lv2 능력입니다. 이 봇은 활성 파밍이 적고 임시 경험치가 없을 때 덱을 버려 경험치를 확보합니다.';
    tradeoff='임시 경험치는 이 자기 턴 종료 때 사라집니다. 이후 쓸 곳이 없다면 덱만 줄이는 선택이며 기본 봇이 이런 낭비를 할 수 있습니다.';
  } else if(a.type==='recovery'){
    reason='실험 규칙입니다. 동료 0·가용 경험치 0인 자기 운영 단계에 게임당 한 번만 견습 모험가를 찾아 재건합니다.';
    tradeoff='무료 소환도 레스트 상태입니다. 지금 바로 수입을 만들거나 패배를 취소하지 못하며 다음 자기 턴을 버텨야 합니다.';
  } else if(a.type==='resolve'){
    reason='이미 공개하고 지불한 공격·방어 파워로 결과를 처리합니다. 이 단계에서는 새 스킬을 끼워 넣을 수 없습니다.';
    tradeoff='히트뿐 아니라 공격자 개인 파워, 파티 손실, 리더 대체 손실과 히트 대체 이벤트를 함께 처리합니다.';
  } else {
    reason=before.phase==='hunt'?'사냥을 더 하지 않고 결투로 넘어갑니다. 사냥하지 않은 활성 동료는 전투나 방어에 남길 수 있습니다.':before.phase==='manage'?'이 봇이 지금의 소환·등록·이벤트보다 단계 종료를 높게 평가했습니다. 다음 단계에 남은 활성 몬스터로 성장할 수 있습니다.':before.phase==='level'?'이번 턴의 성장을 마치고 남은 파밍 자원을 보존합니다.':'정해진 턴 순서를 따라 활성화·드로우·보충·턴 교대를 처리합니다.';
    tradeoff=before.phase==='start'?'리더·동료·스킬은 활성화되지만 파밍 몬스터는 자동 활성화되지 않습니다.':'운영은 결투 뒤입니다. 이번 운영에 소환한 동료로 앞선 사냥·결투를 되돌려 진행할 수 없습니다.';
  }
  const xp=`가용 경험치 ${available(p)} → ${available(next)}`;
  const changes=[xp,`활성 동료 ${p.allies.filter(u=>!u.rest).length} → ${next.allies.filter(u=>!u.rest).length}`,`리더 Lv.${level(p.leader)} → Lv.${level(next.leader)}`];
  if(next.allies.length!==p.allies.length)changes.push(`동료 수 ${p.allies.length} → ${next.allies.length}`);
  if(next.hand.length!==p.hand.length)changes.push(`손패 ${p.hand.length} → ${next.hand.length}`);
  if(a.type==='boost'&&before.combat&&after.combat){const side=before.combat.stage==='attackBoost'?'attack':'defense';changes.push(`${side==='attack'?'공격':'방어'} 파워 ${combatPower(before,side).total} → ${combatPower(after,side).total}`);}
  if(a.type==='resolve')changes.push(`공격 ${combatPower(before,'attack').total} / 방어 ${combatPower(before,'defense').total}`);
  const hits=after.players.map((pl,i)=>pl.hit.length-before.players[i].hit.length);if(hits.some(Boolean))changes.push(`히트 A +${hits[0]} / B +${hits[1]}`);
  const match=ranked.find(c=>actionKey(c.action)===actionKey(a));
  const tied=ranked[1]?.score===ranked[0]?.score&&match?.score===ranked[0]?.score;
  const evaluation=match?`봇 평가 ${match.score.toFixed(2)}점 · 후보 ${ranked.length}개 중 ${match.rank}위${tied?' · 동점은 후보 생성 순서로 선택':!recommended?` · 최상위 ${ranked[0].score.toFixed(2)}점`:''}`:'봇 후보 밖에서 직접 지정한 합법 행동';
  return {player,name:CARDS[p.leader.card.id].name,label:actionLabel(before,a),reason,tradeoff,result:changes.join(' · '),evaluation,recommended,kind:important(a)?'choice':'rule',highlights};
}
export function previewChoices(g:Game,limit=4){
  const ranked=choicesFor(g);const seen=new Set<string>();const pool:Choice[]=[];
  for(const c of ranked){if(!seen.has(c.label)){seen.add(c.label);pool.push(c);}if(pool.length>=limit)break;}
  const pass=ranked.find(c=>c.action.type==='advance');if(pass&&!pool.some(c=>c.action.type==='advance'))pool.push(pass);
  return pool.map(c=>{const after=applyAction(g,c.action);return {...c,explanation:explainAction(g,c.action,after)};});
}
