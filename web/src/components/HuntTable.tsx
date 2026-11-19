'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Flag,Pause,Play,RotateCcw,SkipForward,Swords,X} from 'lucide-react';
import {CARDS} from '../data/cards.ts';
import {applyAction,available,level,personal,type Game,type Ref} from '../engine/game.ts';
import {choicesFor,explainAction} from '../tutorial/explain.ts';
import {lessonGame} from '../tutorial/lessons.ts';
import {APPRENTICE_X,GALE_X,MONSTER_X,WIDTH,HEIGHT,paintForest,paintBattle,type HuntFigure} from './huntPixels.ts';
import './huntTable.css';

const names={ally:'동료',leader:'리더',monster:'몬스터',skill:'스킬',event:'이벤트'};
const cardName=(card:Ref)=>CARDS[card.id].name;
type Panel={card:Ref}|{player:number}|'log'|'choices';

function Forest({figures,monster,won,t}:{figures:HuntFigure[];monster:string;won:boolean;t:number}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const scenery=useRef<HTMLCanvasElement|null>(null);
  useLayoutEffect(()=>{
    const c=canvas.current?.getContext('2d');
    if(!c)return;
    if(!scenery.current){
      const layer=document.createElement('canvas');
      layer.width=WIDTH;layer.height=HEIGHT;
      const ctx=layer.getContext('2d');
      if(!ctx)return;
      paintForest(ctx);scenery.current=layer;
    }
    paintBattle(c,scenery.current,figures,monster,won,t);
  },[figures,monster,won,t]);
  return <canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-hidden="true"/>;
}

function Hands({g,open}:{g:Game;open:(p:Panel)=>void}){
  return <div className="ht-hands">{g.players.map((p,i)=><section key={i} aria-label={cardName(p.leader.card)+' 손패'}>
    <button className="ht-leader" onClick={()=>open({player:i})}><span>{i?'B':'A'} 진영</span><b>{cardName(p.leader.card)}</b><small>손패 {p.hand.length}장</small></button>
    <div className="ht-hand-cards">{p.hand.map(card=><button key={card.uid} className={'ht-card '+CARDS[card.id].type} onClick={()=>open({card})}>
      <small>{names[CARDS[card.id].type]} · 비용 {CARDS[card.id].cost}</small><strong>{cardName(card)}</strong>
    </button>)}</div>
    <div className="ht-stats">리더 Lv.{level(p.leader)} · 히트 {p.hit.length}/5 · 덱 {p.deck.length} · 버림 {p.discard.length}<span>등록 스킬 · {p.slots.filter(s=>s!==null).map(s=>cardName(s.card)).join(" / ")}</span></div>
  </section>)}</div>;
}

export function HuntTable({onLab,onPlay}:{onLab:(game:Game,after?:Game)=>void;onPlay:()=>void}){
  const initial=useMemo(()=>lessonGame('hunt'),[]);
  const options=useMemo(()=>choicesFor(initial).filter(c=>c.action.type==='hunt'),[initial]);
  const [index,setIndex]=useState(0),[t,setT]=useState(0),[playing,play]=useState(false),[speed,setSpeed]=useState(1);
  const [panel,setPanel]=useState<Panel|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const elapsed=useRef(0);
  const option=options[index],action=option.action;
  const after=useMemo(()=>applyAction(initial,action),[initial,action]);
  const explanation=useMemo(()=>explainAction(initial,action,after),[initial,action,after]);
  const done=t>=1, current=done?after:initial;
  const p=initial.players[0],target=initial.dungeon.find(c=>c.uid===action.target)!;
  const party=p.allies.filter(u=>action.party?.includes(u.card.uid));
  const total=party.reduce((sum,u)=>sum+personal(p,u,'hunt'),0);
  const won=after.players[0].farm.some(f=>f.card.uid===target.uid);
  const figures=useMemo(()=>initial.players[0].allies.map(u=>{
    const next=after.players[0].allies.find(v=>v.card.uid===u.card.uid);
    return {id:u.card.id,x:u.card.id==='A01'?APPRENTICE_X:GALE_X,hunter:!!action.party?.includes(u.card.uid),rest:!!next?.rest,lost:!next};
  }),[initial,after,action]);
  const survivorNames=after.players[0].allies.filter(u=>!u.rest).map(u=>cardName(u.card));
  const casualties=p.allies.filter(u=>!after.players[0].allies.some(v=>v.card.uid===u.card.uid));
  const outcome=[won?cardName(target)+' 확보':'사냥 실패',...casualties.map(u=>cardName(u.card)+' 손실'),...survivorNames.map(n=>n+' 준비')].join(' · ');
  const recommended=explanation.recommended;
  const why=recommended&&party.length===1&&!casualties.length
    ? `혼자서도 살아남아요. ${survivorNames.join('·')}는 다음 행동에 남겨둘 수 있어요.`
    : `사냥 파워 ${total}로 ${cardName(target)}(${CARDS[target.id].power})에 도전합니다.`;
  function seek(value:number){elapsed.current=value;setT(value);}
  function open(p:Panel){play(false);setPanel(p);}
  function restart(){play(false);seek(0);}
  function toggle(){
    if(playing){play(false);return;}
    if(done)seek(0);
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){seek(1);return;}
    play(true);
  }
  useEffect(()=>{
    if(!playing)return;
    let frame=0,last=performance.now();
    function tick(now:number){
      const next=Math.min(1,elapsed.current+(now-last)*speed/2000);
      last=now;seek(next);
      if(next===1)play(false);else frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[playing,speed]);
  useEffect(()=>{
    if(panel!==null&&!dialog.current?.open)dialog.current?.showModal();
    if(panel===null&&dialog.current?.open)dialog.current.close();
  },[panel]);
  const stage=done?'사냥 결과':t>=.53?'전장 정리':t>=.22?'파워 판정':'사냥 선언';
  const farm=current.players[0].farm;
  return <main className="hunt-table">
    <header className="ht-head"><div className="ht-brand"><Swords size={22}/> DNF <i>/</i> TCG</div><span>관전 튜토리얼</span><button onClick={()=>onLab(initial,done?after:undefined)}><BookOpen size={16}/>기존 분석 화면</button><button onClick={onPlay}>직접 대전</button></header>
    <div className="ht-title"><div><div className="ht-kicker"><Flag size={14}/> 코어 규칙 · 사냥</div><h1>숲의 사냥터</h1></div><p>동료를 몇 명 보내야 할까요?</p></div>
    <Hands g={current} open={open}/>
    <section className="ht-board" aria-label="사이드뷰 전장">
      <div className="ht-scene">
        <div className="ht-bubble"><span>{recommended?'풍진의 선택':'선택한 대안'}</span><p>{why}</p></div>
        <div className="ht-picture"><Forest figures={figures} monster={target.id} won={won} t={t}/>
        {p.allies.map((u,i)=>{
          const f=figures[i],spent=t>=.64&&f.rest,lost=t>=.67&&f.lost;
          return <button key={u.card.uid} style={{left:f.x/WIDTH*100+'%'}} className={'ht-name '+(f.hunter?'in-party':'')} onClick={()=>open({card:u.card})}><b>{cardName(u.card)}</b><small>{lost?'손실':spent?'휴식':f.hunter?'사냥 참여':'준비'} · {personal(p,u,'hunt')}</small></button>;
        })}
        <button className="ht-name quarry" style={{left:MONSTER_X/WIDTH*100+'%'}} onClick={()=>open({card:target})}><b>{cardName(target)}</b><small>{done&&won?'파밍존으로 이동':'사냥 대상'} · {CARDS[target.id].power}</small></button>
        </div>
      </div>
      <div className="ht-zones"><div><b>A 파밍존</b><span>{farm.length}장 · 경험치 {available(current.players[0])}</span>{done&&won&&<button className="new-trophy" onClick={()=>open({card:target})}>+ {cardName(target)}</button>}</div>
        <div><b>공용 던전</b>{initial.dungeon.map(m=><button key={m.uid} className={m.uid===target.uid?'focus':''} onClick={()=>open({card:m})}>{cardName(m)} <em>{done&&won&&m.uid===target.uid?'확보':CARDS[m.id].power}</em></button>)}</div>
        <div><b>B 파밍존</b><span>{current.players[1].farm.length}장 · 경험치 {available(current.players[1])}</span></div>
      </div>
    </section>
    <div className="ht-verdict" aria-live="polite"><span className="ht-step">{stage}</span><h2>{done?outcome:option.label}</h2><span className="ht-power">사냥 <b>{total}</b><i>/</i> 몬스터 <b>{CARDS[target.id].power}</b></span></div>
    <footer className="ht-controls"><div><button className="ht-primary" onClick={toggle}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'일시정지':done?'다시 재생':'사냥 재생'}</button>
      <button onClick={()=>{play(false);seek(1);}} disabled={done}><SkipForward size={16}/>결과 보기</button>
      <button title="행동 전으로" aria-label="행동 전으로" onClick={restart}><RotateCcw size={16}/></button>
      <select aria-label="재생 속도" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></div>
      <input aria-label="사냥 재생 위치" type="range" min={0} max={100} value={Math.round(t*100)} onChange={e=>{play(false);seek(Number(e.target.value)/100);}}/>
      <div><button onClick={()=>open('choices')}>다른 사냥 선택</button><button onClick={()=>open('log')}>판정 기록</button></div>
    </footer>
    <dialog ref={dialog} className="ht-dialog" aria-label="상세 보기" onCancel={()=>setPanel(null)} onClose={()=>setPanel(null)}>
      <button className="ht-close" aria-label="닫기" onClick={()=>setPanel(null)}><X size={20}/></button>
      {panel==='choices'?<><h2>누구를 사냥에 보낼까요?</h2><label>사냥 선택<select aria-label="사냥 선택" value={index} onChange={e=>{setIndex(Number(e.target.value));restart();}}>{options.map((o,i)=><option key={i} value={i}>{o.label}{o.rank===1?' · 봇 추천':''}</option>)}</select></label><p>{explanation.reason}</p><button className="ht-primary" onClick={()=>{setPanel(null);restart();}}>이 선택 보기</button></>:
       panel==='log'?<><h2>{stage} · 판정 기록</h2><p>{explanation.label}</p><p>{explanation.evaluation}</p>{done?<><p>{after.logs.at(-1)?.detail}</p><p>{explanation.result}</p></>:<p>재생이 끝나면 실제 판정과 자원 변화를 확인할 수 있습니다.</p>}</>:
       panel&&'card' in panel?<><span>{names[CARDS[panel.card.id].type]}</span><h2>{cardName(panel.card)}</h2><p>기본 파워 {CARDS[panel.card.id].power} · {CARDS[panel.card.id].attrs.join('·')||'공용'}</p><p>{CARDS[panel.card.id].effect}</p></>:
       panel&&'player' in panel? <><h2>{cardName(current.players[panel.player].leader.card)} 진영</h2><p>리더 Lv.{level(current.players[panel.player].leader)} · 받은 히트 {current.players[panel.player].hit.length}/5 · 덱 {current.players[panel.player].deck.length}장</p><p>파밍존 · {current.players[panel.player].farm.map(f=>cardName(f.card)+(f.rest?' (휴식)':' (활성)')).join(', ')}</p><p>등록 스킬 · {current.players[panel.player].slots.filter(s=>s!==null).map(s=>cardName(s.card)).join(', ')}</p></>:null}
    </dialog>
  </main>;
}
