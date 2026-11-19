'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Flag,Play,Swords,X} from 'lucide-react';
import {CARDS,LEADERS,SLOT_COSTS,type LeaderId} from '../data/cards.ts';
import {actingPlayer,applyAction,available,playerActions,createGame,level,phaseName,type Action,type Game} from '../engine/game.ts';
import {stepBot} from '../bots/baseline.ts';
import {MatchCommand} from './MatchCommand.tsx';
import {MatchField,type MatchFrame} from './MatchField.tsx';
import {opponentSpeech} from './opponentSpeech.ts';
import {explainMatchStep,type RuleNote} from '../tutorial/matchHelp.ts';
import {cardDescription,unavailableReason} from '../tutorial/cardPreview.ts';
import './duelGame.css';

const cardTypes={leader:'리더',ally:'동료',monster:'몬스터',event:'이벤트',skill:'스킬'};
const name=(id:string)=>CARDS[id].name;
type Entry=RuleNote&{logIndex:number;turn:number;actor:string};
type PlayFrame=MatchFrame&{notes?:Entry[];firstTopic?:boolean};
function recordStep(current:PlayFrame,game:Game):PlayFrame{
  const before=current.game,notes=current.notes??[],rule=explainMatchStep(before,game);
  const entry={...rule,turn:before.turn,actor:name(before.players[actingPlayer(before)].leader.card.id),logIndex:game.logs.at(-1)!.index};
  return {game,previous:before,notes:[...notes,entry],firstTopic:!!entry.topic&&!notes.some(n=>n.topic===entry.topic)};
}
export function DuelGame({active,onGuide}:{active:boolean;onGuide:()=>void}){
  const [leaders,setLeaders]=useState<[LeaderId,LeaderId]>(['L01','L02']);
  const [frame,setFrame]=useState<PlayFrame|null>(null);
  const [draft,setDraft]=useState<{game:Game;action:Action}|null>(null);
  const [opening,setOpening]=useState(false);
  const preview=useMemo(()=>({game:createGame(20261020,leaders)}),[leaders]);
  const scene=frame??preview,g=scene.game,human=actingPlayer(g)===0;
  const showDraft=useCallback((action:Action|null)=>setDraft(action?{game:g,action}:null),[g]);
  const [card,select]=useState<string|null>(null),[handPage,pageHand]=useState(0);
  const [panel,setPanel]=useState<'field'|'logs'|'new'|'help'|null>(null),dialog=useRef<HTMLDialogElement>(null);
  const [autoHelp,setAutoHelp]=useState(true),[dismissed,setDismissed]=useState(-1),[reading,setReading]=useState<Entry|null>(null);
  const latestNote=frame?.notes?.at(-1);
  const currentPanel=panel??(active&&autoHelp&&frame?.firstTopic&&latestNote&&latestNote.logIndex!==dismissed?'help':null);
  const shownNote=panel==='help'?reading:latestNote;
  const logNotes=useMemo(()=>new Map(frame?.notes?.map(n=>[n.logIndex,n])),[frame?.notes]);
  function closePanel(){setPanel(null);setReading(null);if(latestNote)setDismissed(latestNote.logIndex);}
  function readNote(n:Entry){setReading(n);setPanel('help');}
  const actions=useMemo(()=>frame&&human&&!g.result?playerActions(g):[],[frame,human,g]);
  const forced=actions.length===1&&['advance','resolve'].includes(actions[0].type);
  const waiting=!!frame&&!opening&&!g.result&&(!human||forced);
  const [pace,setPace]=useState<'step'|'slow'|'quick'>('step');
  const speech=useMemo(()=>opponentSpeech(frame?.previous,g),[frame,g]);
  const lastAction=g.actions.at(-1);
  const readBeat=!!speech||!!lastAction&&lastAction.type!=='advance';
  const paused=waiting&&(!!card||readBeat&&pace==='step');
  const lastLog=g.logs.at(-1)!;
  const selected=g.players[0].hand.find(r=>r.uid===card);
  const maxPage=Math.max(0,Math.ceil(g.players[0].hand.length/4)-1),handAt=Math.min(handPage,maxPage);
  function start(){
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];
    setFrame({game:createGame(seed,leaders,undefined,'core','keep')});setOpening(true);select(null);pageHand(0);setPanel(null);setDismissed(-1);setReading(null);
  }
  function finishOpening(redraw:boolean){
    if(redraw)setFrame({game:createGame(g.seed,leaders,undefined,'core','redraw')});
    setOpening(false);select(null);
  }
  function commit(a:Action){
    if(!frame||waiting||g.result||currentPanel)return;
    setFrame(current=>current===frame?recordStep(frame,applyAction(g,a)):current);
    select(null);
  }
  const advance=useCallback(()=>{
    if(!active||!waiting||!frame||currentPanel)return;
    setFrame(current=>current===frame?recordStep(frame,human?applyAction(g,actions[0]):stepBot(g)):current);
    select(null);
  },[active,actions,waiting,frame,g,human,currentPanel]);
  useEffect(()=>{
    if(!active||!waiting||currentPanel||paused)return;
    const delay=pace==='quick'?490:readBeat?Math.max(3200,(speech?.length??0)*110):600;
    const timer=setTimeout(advance,delay);
    return ()=>clearTimeout(timer);
  },[active,advance,waiting,currentPanel,paused,pace,readBeat,speech]);
  useEffect(()=>{
    if(currentPanel&&!dialog.current?.open)dialog.current?.showModal();
    if(!currentPanel&&dialog.current?.open)dialog.current.close();
  },[currentPanel]);
  const [a,b]=g.players;
  function scores(pl:Game['players'][0],side:number){
    return <div className={'match-leader side-'+side}><span>{side?'상대 · 봇':'나 · 선공'}</span><strong>{name(pl.leader.card.id)} <small>Lv.{level(pl.leader)}</small></strong><div>받은 히트 <b>{pl.hit.length}/5</b> · 경험치 <b>{available(pl)}</b></div></div>;
  }
  return <main className="match-shell">
    <header className="match-head"><div className="ht-brand"><Swords size={22}/> DNF <i>/</i> TCG</div><button onClick={onGuide}><BookOpen size={15}/> 사냥 튜토리얼</button></header>
    <div className="match-title"><div><span><Flag size={14}/> 코어 대전</span><h1>그란플로리스 전장</h1></div>{frame&&<div className="match-pace"><select aria-label="대전 진행 속도" value={pace} onChange={e=>setPace(e.target.value as typeof pace)}><option value="step">한 수씩</option><option value="slow">천천히 자동</option><option value="quick">빠르게 자동</option></select><button onClick={()=>setPanel('new')}>새 대전</button></div>}</div>
    <div className="match-grid"><section className="match-board" aria-label="픽셀 전장">
      <div className="match-sides">{scores(a,0)}{scores(b,1)}</div>
      <div className="match-stage"><MatchField frame={scene} draft={active&&!waiting&&!opening&&!g.result&&!currentPanel&&draft?.game===g?draft.action:null}/>
        <div className="match-place-names" aria-hidden="true"><span>던전</span><span>결투장</span></div>
        <div role="status" aria-live="polite" aria-atomic="true">{speech&&<div className="opponent-speech"><small>상대 · {name(b.leader.card.id)}</small><p>{speech}</p></div>}</div>
      </div>
      <div className="match-quarries"><b>공용 던전</b>{g.dungeon.map(m=><span key={m.uid}>{name(m.id)} <em>{CARDS[m.id].power}</em></span>)}</div>
      {frame&&<div className="match-board-foot"><span>상대 손패 {b.hand.length}장 · 던전 덱 {g.monsterDeck.length}장</span><button onClick={()=>setPanel('field')}>양쪽 전장 상세</button></div>}
    </section>
    <section className="match-orders" aria-label="플레이어 행동">
      {latestNote&&<div className="match-rule-strip"><button onClick={()=>readNote(latestNote)} aria-label="방금 판정 도움말 열기"><BookOpen size={15}/>방금 판정 · {latestNote.actor}</button><p aria-live="polite">{latestNote.reason}</p></div>}
      {!frame?<><span className="match-kicker">1인 대전</span><h2>리더를 선택하세요</h2><p>중앙 몬스터를 사냥해 자원을 얻고, 상대 리더에게 5히트를 주면 승리합니다.</p>
        {(['내 리더','상대 리더'] as const).map((title,i)=><label key={title}>{title}<select value={leaders[i]} onChange={e=>setLeaders(i?[leaders[0],e.target.value as LeaderId]:[e.target.value as LeaderId,leaders[1]])}>{LEADERS.map(id=><option key={id} value={id}>{name(id)}</option>)}</select></label>)}
        <button className="match-primary" onClick={start}><Play size={16}/> 대전 시작</button></>:
       opening?<><span className="match-kicker">개전 준비</span><h2>시작 손패를 고르세요</h2><p>{a.hand.map(r=>name(r.id)).join(' · ')}</p><button className="match-primary" onClick={()=>finishOpening(false)}>이 손패로 시작</button><button className="match-redraw" onClick={()=>finishOpening(true)}>4장 모두 교체하고 시작</button></>:
       g.result?<><span className="match-kicker">대전 종료 · {g.turn}턴</span><h2>{g.result.winner===null?'무승부':g.result.winner===0?'승리했습니다':'패배했습니다'}</h2><p>{g.result.reason} · 받은 히트 {a.hit.length} 대 {b.hit.length}</p><button className="match-primary" onClick={()=>setPanel('new')}>다시 대전하기</button></>:
       <><div className="match-turn" aria-live="polite">{g.turn}턴 · {g.active===0?'내 턴':'상대 턴'} · {phaseName[g.phase]}</div>
       {waiting?<><h2>{readBeat?lastLog.title:human?'단계 진행 중':g.combat&&g.active===0?'상대가 대응 중':'상대 행동 중'}</h2><p>{readBeat?lastLog.detail.split('\n')[0]:lastLog.title}</p>{paused&&<button className="match-primary" onClick={advance}>다음 행동</button>}</>:
        <MatchCommand key={g.actions.length+'-'+(selected?.uid??'all')} game={g} actions={actions} card={selected?.uid??null} onClear={()=>select(null)} onAct={commit} onDraft={showDraft}/>}</>}
    </section></div>
    {frame&&<><section className="match-hand" aria-label="내 손패">
      <div className="match-hand-head"><h2>내 손패 <small>{a.hand.length}장 · 눌러서 미리보기</small></h2>{maxPage>0&&<div><button aria-label="이전 손패" disabled={!handAt} onClick={()=>{pageHand(handAt-1);select(null);}}>이전</button><span>{handAt+1}/{maxPage+1}</span><button aria-label="다음 손패" disabled={handAt===maxPage} onClick={()=>{pageHand(handAt+1);select(null);}}>다음</button></div>}</div>
      <div className="match-cards">{a.hand.slice(handAt*4,handAt*4+4).map(r=>{
        const playable=!opening&&actions.some(action=>action.card===r.uid||action.event===r.uid);
        return <button key={r.uid} aria-pressed={card===r.uid} onClick={()=>select(card===r.uid?null:r.uid)}><small>{cardTypes[CARDS[r.id].type]} · 비용 {CARDS[r.id].cost}</small><b>{name(r.id)}</b>{!opening&&!g.result&&<span className={playable?'ready':''}>{playable?(CARDS[r.id].type==='skill'?'등록 가능':'사용 가능'):'조건 보기'}</span>}</button>;
      })}{!a.hand.length&&<p>손패가 비었습니다.</p>}</div>
      {selected&&<div className="match-card-text" role="status"><b>{name(selected.id)}</b> · {cardDescription(selected)}
        {(opening||waiting||g.result)&&<p>{unavailableReason(g,selected,opening)}</p>}</div>}
    </section><div className="match-recent"><label><input type="checkbox" checked={autoHelp} onChange={e=>setAutoHelp(e.target.checked)}/> 처음 보는 주요 판정은 팝업으로 보기</label><button onClick={()=>setPanel('logs')}>대전 기록</button></div></>}
    <dialog className="match-dialog" ref={dialog} aria-label={currentPanel==='help'?'판정 도움말':'대전 상세'} onCancel={closePanel} onClose={closePanel}>
      <button className="match-close" aria-label="닫기" onClick={closePanel}><X size={18}/></button>
      {currentPanel==='help'&&shownNote?<><small>{shownNote.turn}턴 · {shownNote.actor} · 판정 도움말</small><h2>{shownNote.title}</h2><p className="rule-answer">{shownNote.reason}</p>{shownNote.keyFact&&<p>{shownNote.keyFact}</p>}{shownNote.details.length>0&&<details className="rule-calculation" key={shownNote.logIndex}><summary>수치와 카드 내역 보기</summary><ul className="rule-facts">{shownNote.details.map((s,i)=><li key={i}>{s}</li>)}</ul></details>}<button className="match-primary" onClick={closePanel}>이해했어</button></>:
       panel==='new'?<><h2>{g.result?'다음 대전':'새 대전을 준비할까요?'}</h2><p>{g.result?'리더를 고르고 새 덱 순서로 시작합니다.':'현재 대전을 종료하고 리더 선택으로 돌아갑니다.'}</p><button className="match-primary" onClick={()=>{setFrame(null);select(null);setPanel(null);}}>리더 선택으로</button></>:
       panel==='logs'?<><h2>대전 기록</h2><ol>{g.logs.slice().reverse().map(l=><li key={l.index}><b>{l.turn}턴 · {l.title}</b><p>{l.detail}</p>{logNotes.has(l.index)&&<button onClick={()=>readNote(logNotes.get(l.index)!)}>이 판정 다시 보기</button>}</li>)}</ol></>:
       panel==='field'?<><h2>양쪽 전장</h2>{g.players.map((p,i)=><section key={i}><h3>{name(p.leader.card.id)} · {i?'상대':'나'}</h3><p>리더 {p.leader.rest?'휴식':'활성'} · 덱 {p.deck.length}장 · 버림 {p.discard.length}장</p>
         <p>동료 · {p.allies.map(u=>name(u.card.id)+' Lv.'+level(u)+' ('+(u.zone==='arena'?'결투장':'던전')+' · '+(u.rest?'휴식':'활성')+')').join(', ')||'없음'}</p>
         <p>파밍존 · {p.farm.map(f=>name(f.card.id)+' ('+(f.rest?'레스트':'활성')+')').join(', ')||'없음'}</p>
         <p>스킬 · {p.slots.flatMap((s,j)=>s?[name(s.card.id)+' (비용 '+SLOT_COSTS[j]+(s.rest?' · 휴식':'')+')']:[]).join(', ')}</p></section>)}</>:null}
    </dialog>
  </main>;
}
