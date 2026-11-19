import {useLayoutEffect,useMemo,useRef} from 'react';
import {CARDS} from '../data/cards.ts';
import {type Action,type Game,type Unit} from '../engine/game.ts';
import {figure,HEIGHT} from './huntPixels.ts';
import {FIELD_WIDTH,paintMatchScenery} from './matchScenery.ts';
import {paintTargetArrow} from './targetArrow.ts';

export type MatchFrame={game:Game;previous?:Game};
type Actor={uid:string;id:string;x:number;y:number;scale:number;rest:boolean;flip:boolean};

function fieldTarget(g:Game,a:Action|null){
  if(!a)return null;
  if(a.type==='hunt'&&a.target&&a.party?.length)return {sources:a.party,target:a.target};
  if(a.type==='attack'&&a.target&&a.unit)return {sources:[a.unit,...a.party??[]],target:a.target};
  if(g.combat&&(a.type==='boost'||a.type==='party'))
    return {sources:[g.combat.attacker,...g.combat.attackParty],target:g.combat.target};
  if(a.type==='event'&&g.dungeon.some(m=>m.uid===a.target))return {sources:[],target:a.target!};
  return null;
}

function formation(g:Game,focus:(string|undefined)[]){
  const actors:Actor[]=[];
  g.players.forEach((p,side)=>{
    function add(u:Unit,x:number,y:number,scale:number){
      actors.push({uid:u.card.uid,id:u.card.id,x:side?FIELD_WIDTH-x:x,y,scale,rest:u.rest,flip:!!side});
    }
    add(p.leader,40,155,2.05);
    for(const zone of ['arena','dungeon'] as const){
      const units=p.allies.filter(u=>u.zone===zone);
      // Preserve ordinary formation order. Only displace a reserve when it acts.
      const priority=[...new Set(focus)].filter(uid=>units.some(u=>u.card.uid===uid)).slice(0,4);
      const visible=units.slice(0,4);
      for(const u of units.slice(4).filter(u=>priority.includes(u.card.uid))){
        const seat=visible.findLastIndex(other=>!priority.includes(other.card.uid));
        if(seat>=0)visible[seat]=u;
      }
      visible.forEach((u,i)=>{
        const front=i>=2;
        const x=zone==='arena'?(front?88:77)+36*(i%2):(front?45:55)+37*(i%2);
        const y=zone==='arena'?(front?166:140):(front?108:83);
        add(u,x,y,1.55);
      });
    }
  });
  g.dungeon.forEach((m,i)=>{
    const x=FIELD_WIDTH/2+(i-(g.dungeon.length-1)/2)*36;
    actors.push({uid:m.uid,id:m.id,x,y:Math.abs(x-FIELD_WIDTH/2)>36?102:94,scale:1.28,rest:false,flip:x>=FIELD_WIDTH/2});
  });
  return actors;
}
export function MatchField({frame,draft=null}:{frame:MatchFrame;draft?:Action|null}){
  const canvas=useRef<HTMLCanvasElement>(null),scenery=useRef<HTMLCanvasElement|null>(null);
  const clock=useRef<{frame:MatchFrame;start:number}|null>(null);
  const aiming=useMemo(()=>fieldTarget(frame.game,draft),[frame.game,draft]);
  useLayoutEffect(()=>{
    const ctx=canvas.current?.getContext('2d');
    if(!ctx)return;
    if(!scenery.current){
      const bg=document.createElement('canvas');
      bg.width=FIELD_WIDTH;bg.height=HEIGHT;
      const b=bg.getContext('2d');
      if(!b)return;
      paintMatchScenery(b);scenery.current=bg;
    }
    const {game,previous}=frame,action=game.actions.at(-1);
    const fight=action?.type==='attack'||action?.type==='hunt'||action?.type==='resolve';
    const actor=action?.unit??action?.party?.[0]??previous?.combat?.attacker;
    const target=action?.target??previous?.combat?.target;
    const focus=[aiming?.target,...aiming?.sources??[],actor,target,game.combat?.attacker,game.combat?.target];
    const current=formation(game,focus);
    const before=previous&&(fight||action?.type==='move')?formation(previous,focus):current;
    const origin=action?.type==='move'?before.find(a=>a.uid===actor):undefined;
    function draw(t:number){
      if(!ctx||!scenery.current)return;
      ctx.drawImage(scenery.current,0,0);
      const actors=fight&&t<.85?before:current;
      const aim=actors.find(a=>a.uid===target);
      const positions=actors.map(a=>{
        if(a.uid!==actor)return a;
        if(origin){
          const step=t*t*(3-2*t);
          return {...a,x:origin.x+(a.x-origin.x)*step,y:origin.y+(a.y-origin.y)*step};
        }
        if(fight&&aim){
          const reach=Math.sin(Math.min(1,t/.8)*Math.PI);
          const gap=Math.min(21,Math.abs(aim.x-a.x)) * Math.sign(aim.x-a.x);
          return {...a,x:a.x+(aim.x-gap-a.x)*reach,y:a.y+(aim.y-a.y)*reach};
        }
        return a;
      });
      const marked=aiming&&t===1?positions.find(a=>a.uid===aiming.target):null;
      if(aiming&&marked){
        const sources=aiming.sources.flatMap(uid=>positions.filter(a=>a.uid===uid));
        paintTargetArrow(ctx,sources,marked);
      }
      for(const a of positions.sort((a,b)=>a.y-b.y)){
        ctx.save();ctx.translate(Math.round(a.x),Math.round(a.y));if(a.flip)ctx.scale(-1,1);
        figure(ctx,a.id,0,0,a.rest,a.scale);ctx.restore();
      }
      if(aim&&fight&&t>.28&&t<.55){
        ctx.fillStyle='#fff1b4';
        for(let i=0;i<7;i++)ctx.fillRect(aim.x-7+i*2,aim.y-18-i,4,2);
      }
    }
    let handle=0;
    if(clock.current?.frame!==frame)clock.current={frame,start:performance.now()};
    if((!fight&&!origin)||!previous||matchMedia('(prefers-reduced-motion: reduce)').matches)draw(1);
    else{
      const start=clock.current.start;
      const tick=(now:number)=>{const t=Math.min(1,(now-start)/360);draw(t);if(t<1)handle=requestAnimationFrame(tick);};
      tick(performance.now());
    }
    return ()=>cancelAnimationFrame(handle);
  },[frame,aiming]);
  const g=frame.game;
  const sides=g.players.map((p,i)=>`${i?'오른쪽':'왼쪽'} ${CARDS[p.leader.card.id].name}, 결투장 동료 ${p.allies.filter(u=>u.zone==='arena').length}명, 던전 동료 ${p.allies.filter(u=>u.zone==='dungeon').length}명`);
  const cards=[...g.dungeon,...g.players.flatMap(p=>[p.leader.card,...p.allies.map(u=>u.card)])];
  const nameOf=(uid:string)=>CARDS[cards.find(c=>c.uid===uid)!.id].name;
  const aimText=aiming?` ${aiming.sources.length?'공격 미리보기 '+aiming.sources.map(nameOf).join(', ')+' →':'선택한 대상'} ${nameOf(aiming.target)}.`:'';
  return <canvas className="match-field" ref={canvas} width={FIELD_WIDTH} height={HEIGHT} role="img" aria-label={`앞쪽 돌바닥은 결투장, 뒤쪽 숲길은 던전. 중앙 몬스터 ${g.dungeon.length}장. ${sides.join('. ')}${aimText}`}/>;
}
