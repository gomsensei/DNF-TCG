import {CARDS,SLOT_COSTS,matches} from '../data/cards.ts';
import {type Game,type Observation,type Action,type Player,type Unit,candidates,observe,actingPlayer,applyAction,personal,level,getUnit,available} from '../engine/game.ts';
export const BOT_VERSION='baseline-0.2-explained';
function opponent(o:Observation):Player{return{...o.opponent,deck:[],hand:[],hit:Array.from({length:o.opponent.hitCount},(_,i)=>({id:'hidden',uid:`hidden-${i}`}))};}
function maxSkill(p:Player,u:Unit,side:'attack'|'defense'){return Math.max(0,...p.slots.flatMap((slot,i)=>{if(!slot||slot.rest)return[];const c=CARDS[slot.card.id];return c.use===side&&c.level<=level(p.leader)&&(!c.attrs.length||matches(c.attrs,CARDS[u.card.id].attrs))&&SLOT_COSTS[i]<=available(p)?[c.power]:[];}));}
export function rankBot(o:Observation,actions:Action[]):{action:Action;score:number;rank:number}[]{
 if(!actions.length)throw Error('선택 가능한 행동 없음');const p=o.self,enemy=opponent(o);const own=(id?:string)=>getUnit(p,id)!;
 function score(a:Action){const c=o.combat;
 if(a.type==='advance')return 0;
 if(a.type==='recovery')return 150;
 if(a.type==='kazan')return p.bank===0&&p.farm.filter(f=>!f.rest).length<2?35:-10;
 if(a.type==='move'){const u=own(a.unit),canHunt=o.dungeon.some(m=>personal(p,u,'hunt')>CARDS[m.id].power);return a.zone==='dungeon'?(canHunt?30:-20):(!canHunt?20:-20);}
 if(a.type==='hunt'){const us=a.party!.map(own),mp=CARDS[o.dungeon.find(m=>m.uid===a.target)!.id].power,total=us.reduce((n,u)=>n+personal(p,u,'hunt'),0),top=Math.max(...us.map(u=>personal(p,u,'hunt')));return total>mp?(top>mp?130:45)-us.length*4:total===mp?12:-100;}
 if(a.type==='attack'){const u=own(a.unit),target=getUnit(enemy,a.target)!,party=(a.party??[]).map(own);const attack=personal(p,u,'attack')+party.reduce((n,u)=>n+personal(p,u,'attack')+(p.leader.card.id==='L01'&&matches(CARDS[u.card.id].attrs,CARDS.L01.attrs)?100:0),0)+maxSkill(p,u,'attack'),defense=personal(enemy,target,'defense');if(attack<=defense)return -30;return 55+(target===enemy.leader?30:CARDS[target.card.id].cost*5)+(attack-defense)/30-party.length*6;}
 if(a.type==='party'){const target=own(c!.target),attackUser=getUnit(enemy,c!.attacker)!;const danger=personal(enemy,attackUser,'attack')+c!.attackParty.reduce((n,id)=>n+personal(enemy,getUnit(enemy,id)!,'attack'),0)+maxSkill(enemy,attackUser,'attack');const defense=personal(p,target,'defense')+(a.party??[]).reduce((n,id)=>n+personal(p,own(id),'defense'),0)+maxSkill(p,target,'defense');return defense>=danger?50-(a.party?.length??0)*5:-20+(a.party?.length??0);}
 if(a.type==='boost'){
 const attack=c!.stage==='attackBoost',side=attack?'attack':'defense',user=own(attack?c!.attacker:c!.target),party=attack?c!.attackParty:c!.defenseParty;let power=personal(p,user,side)+party.reduce((n,id)=>n+personal(p,own(id),side)+(attack&&p.leader.card.id==='L01'&&matches(CARDS[own(id).card.id].attrs,CARDS.L01.attrs)?100:0),0);let cost=0;
 if(a.skill!==undefined){const d=CARDS[p.slots[a.skill]!.card.id];power+=d.power;cost+=SLOT_COSTS[a.skill];if(user.card.id==='L01'&&level(user)>=2&&d.attrs.length)power+=100;if(d.id==='S06'&&!party.length)power+=200;if(d.id==='S11'&&p.hit.length>=2)power+=200;if(d.id==='S17'&&level(p.leader)>=4)power+=200;if(d.id==='S20'&&p.farm.filter(f=>!f.rest).length>=2)power+=200;if((d.id==='S04'&&party.filter(id=>matches(CARDS[own(id).card.id].attrs,CARDS[user.card.id].attrs)).length>=2)||(d.id==='S18'&&party.filter(id=>CARDS[own(id).card.id].summon).length>=2))power+=200;}
 const ev=a.event?CARDS[p.hand.find(r=>r.uid===a.event)!.id]:undefined;
 if(ev){cost+=ev.cost;if(ev.id==='EV1'||ev.id==='EV2')power+=200;if(ev.id==='EV5'&&user===p.leader&&!party.length)power+=300;if(ev.id==='EV6')power+=Math.min(300,party.filter(id=>matches(CARDS[own(id).card.id].attrs,CARDS[user.card.id].attrs)).length*100);if(ev.id==='EV10')power+=Math.min(300,party.filter(id=>CARDS[own(id).card.id].summon).length*100);}
 const otherUser=getUnit(enemy,attack?c!.target:c!.attacker)!,otherSide=attack?'defense':'attack';const otherParty=attack?c!.defenseParty:c!.attackParty;let against=personal(enemy,otherUser,otherSide)+otherParty.reduce((n,id)=>n+personal(enemy,getUnit(enemy,id)!,otherSide)+(!attack&&enemy.leader.card.id==='L01'&&matches(CARDS[getUnit(enemy,id)!.card.id].attrs,CARDS.L01.attrs)?100:0),0);
 against+=attack?(ev?.id==='EV7'?0:maxSkill(enemy,otherUser,'defense')):c!.attackBonus;
 const win=attack?power>against:power>=against;return(win?120:0)-cost*8+(ev?.id==='EV8'&&!win&&user===p.leader&&p.allies.some(u=>u.zone==='arena')?80:0)+(power-against)/1000;
 }
 if(a.type==='resolve')return 100;
 if(a.type==='summon'){const card=CARDS[p.hand.find(r=>r.uid===a.card)!.id],active=p.farm.filter(f=>!f.rest).length;return 75-card.cost*4+(p.allies.length<2?30:0)-(active<2&&p.allies.length>=3?100:0);}
 if(a.type==='register'){const card=CARDS[p.hand.find(r=>r.uid===a.card)!.id],old=p.slots[a.slot!],oldPower=old?CARDS[old.card.id].power:0;if(p.slots.some(s=>s?.card.id===card.id))return -10;if(card.level>level(p.leader)+1)return -20;return 30+(card.power-oldPower)/20-SLOT_COSTS[a.slot!]*6-(old&&!old.card.id.startsWith('B')?25:0);}
 if(a.type==='event'){const card=CARDS[p.hand.find(r=>r.uid===a.card)!.id];return card.id==='EV4'?24:card.id==='EV3'?15:p.allies.length<3?15:-5;}
 if(a.type==='level'){const u=own(a.unit),m=p.farm.find(f=>f.card.uid===a.card)!.card;return(u===p.leader?60:15)+(CARDS[m.id].bonus?8:0);}
 return -100;
 }
 return actions.map((a,i)=>({a,i,score:score(a)})).sort((a,b)=>b.score-a.score||a.i-b.i).map((r,i)=>({action:r.a,score:r.score,rank:i+1}));
}
export function chooseBot(o:Observation,actions:Action[]):Action{return rankBot(o,actions)[0].action;}
export function stepBot(g:Game){const actions=candidates(g);return applyAction(g,chooseBot(observe(g,actingPlayer(g)),actions));}
export function runGame(g:Game,maxActions=4000){let s=g;while(!s.result&&s.actions.length<maxActions)s=stepBot(s);if(!s.result)throw Error(`시뮬레이션 행동 상한 ${maxActions} 도달`);return s;}
