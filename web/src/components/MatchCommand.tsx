import {useLayoutEffect,useMemo,useState} from 'react';
import {CARDS,SLOT_COSTS} from '../data/cards.ts';
import {getUnit,validateAction,type Action,type Game,type Payment} from '../engine/game.ts';
import {actionLabel} from '../tutorial/explain.ts';
import {previewAction,unavailableReason} from '../tutorial/cardPreview.ts';

const verbs:Record<Action['type'],string>={advance:'단계 마치기',move:'동료 이동',hunt:'사냥',attack:'결투',summon:'동료 소환',register:'스킬 등록',event:'이벤트',level:'레벨업',party:'방어 파티',boost:'스킬·이벤트',kazan:'카잔 능력',resolve:'결과 처리',recovery:'재건'};
function distinct<T,>(list:T[]){return [...new Set(list)];}
function resourceName(g:Game,id?:string){
  const ref=g.players[0].farm.find(f=>f.card.uid===id)?.card??g.dungeon.find(r=>r.uid===id);
  return ref?CARDS[ref.id].name:'';
}
function label(g:Game,a:Action){
  let text=actionLabel(g,a);
  if(a.type==='event'&&a.target)text+=' · '+resourceName(g,a.target);
  if(a.type==='level')text+=' · '+resourceName(g,a.card)+' 부착';
  if(a.type==='register')text+=` · 사용 비용 ${SLOT_COSTS[a.slot!]}`;
  if(a.type==='attack'&&a.party?.length)text+=' · '+a.party.map(id=>CARDS[getUnit(g.players[0],id)!.card.id].name).join(', ');
  return text;
}
function paymentCost(pay:Payment){return pay.bank+pay.rest.length+pay.discard.length;}

export function MatchCommand({game,actions,card,onClear,onAct,onDraft}:{game:Game;actions:Action[];card:string|null;onClear:()=>void;onAct:(a:Action)=>void;onDraft:(a:Action|null)=>void}){
  const p=game.players[0];
  const visible=card?actions.filter(a=>a.card===card||a.event===card):actions;
  const types=distinct(visible.map(a=>a.type)).sort((a,b)=>Number(a==='advance')-Number(b==='advance'));
  const [kind,setKind]=useState<Action['type']|null>(null),[index,setIndex]=useState(0);
  const [party,setParty]=useState<string[]|null>(null),[pay,setPay]=useState<Payment|null>(null);
  const type=kind&&types.includes(kind)?kind:types[0];
  const options=visible.filter(a=>a.type===type),base=options[index]??options[0];
  const action=useMemo(()=>base?{...base,...(party?{party}:{}),...(pay?{payment:pay}:{})}:null,[base,party,pay]);
  let invalid='';
  if(action){try{validateAction(game,action);}catch(e){invalid=e instanceof Error?e.message:String(e);}}
  useLayoutEffect(()=>{
    onDraft(invalid?null:action);
    return ()=>onDraft(null);
  },[action,invalid,onDraft]);
  function reset(){setParty(null);setPay(null);}
  function chooseType(t:Action['type']){setKind(t);setIndex(0);reset();}
  const partyMode=type==='attack'||type==='hunt'||type==='party';
  const allies=base&&partyMode?p.allies.filter(u=>{
    // Eligibility comes from the engine, so this also works for parties larger than the bot enumerates.
    try{validateAction(game,{...base,party:[u.card.uid]});return true;}catch{return false;}
  }):[];
  const chosenParty=action?.party??[];
  const cost=base?.payment?paymentCost(base.payment):0;
  const picked=p.hand.find(r=>r.uid===card);
  const preview=action&&!invalid?previewAction(game,action):[];
  if(invalid&&action?.payment&&paymentCost(action.payment)!==cost){
    invalid=`필요한 경험치는 ${cost}. 지금 고른 자원으로는 ${paymentCost(action.payment)}만큼 낼 수 있어.`;
  }else if(invalid&&picked?.id==='EV4'){
    invalid='지불 후에도 대상이 파밍존에 휴식 상태로 남아야 해. 다른 자원을 골라 봐.';
  }
  function adjustFarm(uid:string,n:number){
    if(!base?.payment)return;
    const current=pay??base.payment,farm=p.farm.find(f=>f.card.uid===uid)!;
    const rest=current.rest.filter(id=>id!==uid),discard=current.discard.filter(id=>id!==uid);
    if(!farm.rest&&n>=1)rest.push(uid);
    if(n===2||farm.rest&&n===1)discard.push(uid);
    setPay({bank:current.bank,rest,discard});
  }
  const heading=game.combat?({defenseParty:'누가 함께 막을까요?',attackBoost:'공격에 힘을 더할까요?',defenseBoost:'어떻게 방어할까요?',resolve:'결투 판정'})[game.combat.stage]:
    ({hunt:'누구를 사냥에 보낼까요?',duel:'누구와 결투할까요?',manage:'어떤 카드를 낼까요?',level:'누구를 성장시킬까요?',start:'턴 시작',draw:'드로우',refill:'던전 보충',end:'턴 종료'})[game.phase];
  return <div className="match-command">
    {picked?<div className="match-picked"><h2>{CARDS[picked.id].name}</h2><button className="match-clear" onClick={onClear}>손패 선택 해제</button></div>:<h2>{heading}</h2>}
    {game.combat&&<p>{CARDS[getUnit(game.players[game.active],game.combat.attacker)!.card.id].name}의 공격 · {CARDS[getUnit(game.players[1-game.active],game.combat.target)!.card.id].name} 방어</p>}
    {!options.length?<div className="match-forecast blocked" role="status"><strong>지금 못 쓰는 이유</strong><p>{picked?unavailableReason(game,picked):'현재 고를 수 있는 행동이 없어.'}</p></div>:<>
      {(!picked||types.length>1)&&<div className="match-types">{types.map(k=><button key={k} aria-pressed={type===k} onClick={()=>chooseType(k)}>{verbs[k]}</button>)}</div>}
      {options.length>1?<label>행동 선택<select aria-label="행동 선택" value={options.indexOf(base)} onChange={e=>{setIndex(+e.target.value);reset();}}>{options.map((a,i)=><option key={i} value={i}>{label(game,a)}</option>)}</select></label>:!picked&&<p>{label(game,base)}</p>}
      {partyMode&&allies.length>0&&<details><summary>참여 동료 조정 · {chosenParty.length}명</summary><div className="match-checks">{allies.map(u=><label key={u.card.uid}><input type="checkbox" checked={chosenParty.includes(u.card.uid)} onChange={e=>setParty(e.target.checked?[...chosenParty,u.card.uid]:chosenParty.filter(id=>id!==u.card.uid))}/>{CARDS[u.card.id].name}</label>)}</div></details>}
      {cost>0&&base.payment&&<details><summary>지불 자원 조정</summary><div className="match-checks">
        {p.bank>0&&<label>임시 경험치<select value={action!.payment!.bank} onChange={e=>setPay({...action!.payment!,bank:+e.target.value})}>{Array.from({length:Math.min(p.bank,cost)+1},(_,i)=><option key={i}>{i}</option>)}</select></label>}
        {p.farm.map(f=>{const id=f.card.uid,payment=action!.payment!,n=Number(payment.rest.includes(id))+Number(payment.discard.includes(id));return <label key={id}>{CARDS[f.card.id].name}<select value={n} onChange={e=>adjustFarm(id,+e.target.value)}><option value={0}>보존</option><option value={1}>{f.rest?'소모':'레스트'} · 1</option>{!f.rest&&<option value={2}>소모 · 2</option>}</select></label>;})}
      </div></details>}
      {action&&<div className={'match-forecast'+(invalid?' blocked':'')} role="status" aria-atomic="true"><strong>{invalid?'확정할 수 없는 이유':'확정하면'}</strong>
        {invalid?<p>{invalid}</p>:preview.length?preview.map(line=><p key={line}>{line}</p>):<p>{type==='level'?'활성 몬스터 1장을 부착해 레벨을 올려.':type==='advance'?'이번 단계의 남은 행동을 마쳐.':label(game,action)}</p>}
      </div>}
      <button className="match-primary" disabled={!!invalid||!action} onClick={()=>action&&onAct(action)}>{type==='advance'?'다음 단계로':verbs[type]+' 확정'}</button>
    </>}
  </div>;
}
