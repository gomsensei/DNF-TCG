import {CARDS, MONSTER_COUNTS, SLOT_COSTS, deckFor, matches, validateDeck, type LeaderId, type Timing} from '../data/cards.ts';
import {PROFILES, ELITE_COUNTS, LAB_VERSION, type ProfileId} from '../data/profiles.ts';
export const RULE_VERSION='dnf-core-sim-0.1';
export type Ref={uid:string;id:string};
export type Unit={card:Ref;rest:boolean;zone:'arena'|'dungeon';levels:Ref[];leveled:boolean};
export type Player={leader:Unit;deck:Ref[];hand:Ref[];hit:Ref[];discard:Ref[];allies:Unit[];farm:{card:Ref;rest:boolean}[];slots:({card:Ref;rest:boolean}|null)[];bank:number;kazanUsed:boolean;recoveryUsed?:boolean};
export type Payment={rest:string[];discard:string[];bank:number};
export type Combat={attacker:string;target:string;attackParty:string[];defenseParty:string[];stage:'defenseParty'|'attackBoost'|'defenseBoost'|'resolve';attackSkill?:number;defenseSkill?:number;attackEvent?:string;defenseEvent?:string;attackBonus:number;defenseBonus:number;breakdown:string[]};
export type Phase='start'|'draw'|'hunt'|'duel'|'manage'|'refill'|'level'|'end';
export type Action={type:'advance'|'move'|'hunt'|'attack'|'party'|'boost'|'resolve'|'summon'|'register'|'event'|'level'|'kazan'|'recovery';unit?:string;target?:string;party?:string[];card?:string;slot?:number;skill?:number;event?:string;payment?:Payment;zone?:'arena'|'dungeon';loss?:string;defenseLoss?:string;replacement?:string};
export type Log={index:number;turn:number;player:number;phase:string;title:string;detail:string;cards:string[]};
export type Game={version:string;profile:ProfileId;seed:number;rng:number;turn:number;active:0|1;phase:Phase;players:[Player,Player];monsterDeck:Ref[];dungeon:Ref[];combat:Combat|null;result:null|{winner:0|1|null;reason:string};logs:Log[];actions:Action[]};
export type Observation={version:string;seed:number;turn:number;active:0|1;phase:Phase;self:Player;opponent:Omit<Player,'deck'|'hand'|'hit'> & {deckCount:number;handCount:number;hitCount:number};dungeon:Ref[];monsterCount:number;combat:Combat|null};
export const phaseName:Record<Phase,string>={start:'턴 시작',draw:'드로우',hunt:'사냥',duel:'결투',manage:'운영',refill:'던전 보충',level:'레벨업',end:'턴 종료'};
function rand(s:{rng:number}){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function shuffle<T>(s:{rng:number},a:T[]){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function level(u:Unit){return u.levels.length+1;}
export function units(p:Player){return[p.leader,...p.allies];}
export function getUnit(p:Player,uid?:string){return units(p).find(u=>u.card.uid===uid);}
function unique(a:string[]){return new Set(a).size===a.length;}
function ref(id:string,uid:string):Ref{return{id,uid};}
function unit(card:Ref):Unit{return{card,rest:false,zone:'arena',levels:[],leveled:false};}
function log(g:Game,title:string,detail='',cards:string[]=[]){g.logs.push({index:g.logs.length,turn:g.turn,player:g.active,phase:phaseName[g.phase],title,detail,cards});}
function lose(g:Game,p:number,reason:string){g.result={winner:(1-p) as 0|1,reason};log(g,'대전 종료',`${p===0?'A':'B'} 패배 · ${reason}`);}
function draw(g:Game,p:number,n:number,to:'hand'|'hit'='hand'){for(let i=0;i<n;i++){const card=g.players[p].deck.shift();if(!card){lose(g,p,to==='hit'?'히트용 덱 부족':'드로우 실패');break;}g.players[p][to].push(card);}if(g.players[p].hit.length>=5)lose(g,p,'5히트');}
function summon(p:Player,card:Ref){const u=unit(card);u.rest=true;p.allies.push(u);}
export function createGame(seed=20261020,leaders:[LeaderId,LeaderId]=['L01','L02'],decks?:[string[],string[]],profile:ProfileId='core',openingA:'auto'|'keep'|'redraw'='auto'):Game{
 if(!PROFILES[profile])throw Error('알 수 없는 규칙 프로필');
 const g:Game={version:profile==='core'?RULE_VERSION:`${RULE_VERSION}+${LAB_VERSION}`,profile,seed,rng:seed>>>0,turn:1,active:0,phase:'start',players:[] as unknown as [Player,Player],monsterDeck:[],dungeon:[],combat:null,result:null,logs:[],actions:[]};
 g.players=leaders.map((id,i):Player=>{const ids=decks?.[i]??deckFor(id);const errors=validateDeck(ids,id);if(errors.length)throw Error(errors.join(' '));return{leader:unit(ref(id,`p${i}-leader`)),deck:shuffle(g,ids.map((c,j)=>ref(c,`p${i}-${j}`))),hand:[],hit:[],discard:[],allies:[],farm:[],slots:[{card:ref('B01',`p${i}-basic-a`),rest:false},{card:ref('B02',`p${i}-basic-d`),rest:false},null,null,null,null],bank:0,kazanUsed:false};}) as [Player,Player];
 (PROFILES[profile].elite?ELITE_COUNTS:MONSTER_COUNTS).forEach((count,i)=>{for(let j=0;j<count;j++)g.monsterDeck.push(ref(`M${String(i+1).padStart(2,'0')}`,`m${i}-${j}`));});shuffle(g,g.monsterDeck);
 g.players.forEach((p,i)=>{for(let j=0;j<i+2;j++){const at=g.monsterDeck.findIndex(c=>CARDS[c.id].power===100);p.farm.push({card:g.monsterDeck.splice(at,1)[0],rest:false});}draw(g,i,4);
 // Baseline bot mulligan: redraw a hand with no affordable ally, once.
 const automatic=i===1||openingA==='auto';
 const redraw=automatic?!p.hand.some(c=>CARDS[c.id].type==='ally'&&CARDS[c.id].cost<=3):openingA==='redraw';
 if(redraw){p.deck.push(...p.hand);p.hand=[];shuffle(g,p.deck);draw(g,i,4);log(g,`${i?'B':'A'} 멀리건`,automatic?'저비용 동료가 없어 손패 전체 교체':'플레이어가 시작 손패 전체 교체');}});
 while(g.dungeon.length<4)g.dungeon.push(g.monsterDeck.shift()!);
 log(g,'대전 준비 완료',`시드 ${seed} · A 선공 · 시작 파밍 A 2 / B 3`);return g;
}
export function observe(g:Game,p:number):Observation{const other=g.players[1-p];const{deck,hand,hit,...publicPlayer}=other;return structuredClone({version:g.version,seed:g.seed,turn:g.turn,active:g.active,phase:g.phase,self:{...g.players[p],deck:[]},opponent:{...publicPlayer,deckCount:deck.length,handCount:hand.length,hitCount:hit.length},dungeon:g.dungeon,monsterCount:g.monsterDeck.length,combat:g.combat});}
export function available(p:Player){return p.bank+p.farm.reduce((n,f)=>n+(f.rest?1:2),0);}
export function paymentFor(p:Player,cost:number):Payment|null{
 if(available(p)<cost)return null;const pay:Payment={rest:[],discard:[],bank:Math.min(cost,p.bank)};let n=cost-pay.bank;
 for(const f of p.farm.filter(f=>f.rest)){if(!n)break;pay.discard.push(f.card.uid);n--;}
 for(const f of p.farm.filter(f=>!f.rest)){if(!n)break;pay.rest.push(f.card.uid);n--;}
 for(const id of pay.rest){if(!n)break;pay.discard.push(id);n--;}
 return n?null:pay;
}
export function validPayment(p:Player,pay:Payment|undefined,cost:number){if(!pay)return cost===0; if(!unique(pay.rest)||!unique(pay.discard)||pay.bank<0||!Number.isInteger(pay.bank)||pay.bank>p.bank)return false;if(pay.rest.length+pay.discard.length+pay.bank!==cost)return false;
 return pay.rest.every(id=>p.farm.some(f=>f.card.uid===id&&!f.rest))&&pay.discard.every(id=>p.farm.some(f=>f.card.uid===id&&(f.rest||pay.rest.includes(id))));}
function spend(p:Player,pay:Payment|undefined){if(!pay)return;p.bank-=pay.bank;for(const id of pay.rest)p.farm.find(f=>f.card.uid===id)!.rest=true;for(const id of pay.discard){const i=p.farm.findIndex(f=>f.card.uid===id);p.discard.push(p.farm.splice(i,1)[0].card);}}
function destroy(p:Player,uid:string){const i=p.allies.findIndex(u=>u.card.uid===uid);if(i>=0){const u=p.allies.splice(i,1)[0];p.discard.push(u.card,...u.levels);}}
function findCard(p:Player,uid?:string){return p.hand.find(c=>c.uid===uid);}
function contextMatches(when:Timing,ctx:Timing){return when===ctx||when==='duel'&&(ctx==='attack'||ctx==='defense');}
export function personal(p:Player,u:Unit,ctx:Timing){const c=CARDS[u.card.id],l=level(u),leader=p.leader.card.id;let n=c.power;
 if(c.type==='leader'){
 if((leader==='L01'||leader==='L02')&&l>=5)n+=100;
 if(leader==='L01'&&l>=3&&ctx==='defense')n+=100;
 if(leader==='L02'&&(ctx==='attack'||ctx==='defense'&&l>=4))n+=Math.min(l>=5?400:200,p.hit.length*100);
 if(leader==='L03'&&l>=4)n+=p.allies.filter(a=>CARDS[a.card.id].summon).length*100;
 }else{if(l>=2)n+=100;if(l>=3&&(ctx==='attack'&&['연계형','기습형','공격형'].includes(c.role??'')||ctx==='defense'&&c.role==='방어형'))n+=100;if(c.bonus&&contextMatches(c.bonus.when,ctx))n+=c.bonus.value;if(leader==='L03'&&c.summon)n+=level(p.leader)>=5?200:100;}
 for(const m of u.levels){const b=CARDS[m.id].bonus;if(b&&contextMatches(b.when,ctx))n+=b.value;}return n;
}
export function allowed(p:Player,cid:string){const c=CARDS[cid];return !c.attrs.length||matches(c.attrs,CARDS[p.leader.card.id].attrs);}
function legalSkill(p:Player,u:Unit,slot:number,side:'attack'|'defense'){const s=p.slots[slot];if(!s||s.rest)return false;const c=CARDS[s.card.id];return c.use===side&&level(p.leader)>=c.level&&(!c.attrs.length||matches(c.attrs,CARDS[u.card.id].attrs));}
function memberPower(p:Player,u:Unit,ctx:'attack'|'defense',isParty=false){return personal(p,u,ctx)+(ctx==='attack'&&isParty&&p.leader.card.id==='L01'&&matches(CARDS[u.card.id].attrs,CARDS.L01.attrs)?100:0);}
export function combatPower(g:Game,side:'attack'|'defense'){const c=g.combat;if(!c)return{total:0,personal:0,parts:[] as string[]};const p=g.players[side==='attack'?g.active:1-g.active];const u=getUnit(p,side==='attack'?c.attacker:c.target)!;const party=(side==='attack'?c.attackParty:c.defenseParty).map(id=>getUnit(p,id)!).filter(Boolean);const base=personal(p,u,side),support=party.reduce((n,a)=>n+memberPower(p,a,side,true),0),bonus=side==='attack'?c.attackBonus:c.defenseBonus;return{total:base+support+bonus,personal:base,parts:[`${CARDS[u.card.id].name} 개인 ${base}`,`파티 ${support}`,`스킬·이벤트 ${bonus}`]};}
function skillValue(g:Game,p:Player,u:Unit,slot:number,side:'attack'|'defense'){const card=p.slots[slot]!.card,c=CARDS[card.id],combat=g.combat!;const party=(side==='attack'?combat.attackParty:combat.defenseParty).map(id=>getUnit(p,id)!).filter(Boolean);let n=c.power;
 if(u.card.id==='L01'&&level(u)>=2&&c.attrs.length&&matches(c.attrs,CARDS.L01.attrs))n+=100;
 if(c.id==='S04'&&party.filter(a=>matches(CARDS[a.card.id].attrs,CARDS[u.card.id].attrs)).length>=2)n+=200;
 if(c.id==='S06'&&!party.length)n+=200;if(c.id==='S11'&&p.hit.length>=2)n+=200;if(c.id==='S17'&&level(p.leader)>=4)n+=200;if(c.id==='S18'&&party.filter(a=>CARDS[a.card.id].summon).length>=2)n+=200;if(c.id==='S20'&&p.farm.filter(f=>!f.rest).length>=2)n+=200;return n;
}
export function eventValue(p:Player,u:Unit,id:string,party:string[]){if(id==='EV1'||id==='EV2')return 200;if(id==='EV5')return u.card.id.startsWith('L')&&!party.length?300:0;if(id==='EV6')return Math.min(300,party.filter(uid=>matches(CARDS[getUnit(p,uid)!.card.id].attrs,CARDS[u.card.id].attrs)).length*100);if(id==='EV10')return Math.min(300,party.filter(uid=>CARDS[getUnit(p,uid)!.card.id].summon).length*100);return 0;}
export function actingPlayer(g:Game):0|1{return g.combat&&(g.combat.stage==='defenseParty'||g.combat.stage==='defenseBoost')?(1-g.active) as 0|1:g.active;}
function ensure(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message);}
function validParty(p:Player,list:string[],zone:string,exclude:string){return unique(list)&&list.every(id=>id!==exclude&&p.allies.some(u=>u.card.uid===id&&u.zone===zone&&!u.rest));}
export function validateAction(g:Game,a:Action){
 ensure(!g.result,'이미 종료된 대전입니다.');const p=g.players[actingPlayer(g)],enemy=g.players[1-g.active],c=g.combat;
 if(c){const attacker=getUnit(g.players[g.active],c.attacker)!,target=getUnit(enemy,c.target)!;
 if(a.type==='party'){ensure(c.stage==='defenseParty','방어 파티 단계가 아닙니다.');ensure(validParty(p,a.party??[],target.zone,target.card.uid),'방어 파티가 올바르지 않습니다.');return;}
 if(a.type==='boost'){ensure(c.stage==='attackBoost'||c.stage==='defenseBoost','스킬 단계가 아닙니다.');const side=c.stage==='attackBoost'?'attack':'defense',user=side==='attack'?attacker:target;let cost=0;
 if(a.skill!==undefined){ensure(Number.isInteger(a.skill)&&legalSkill(p,user,a.skill,side),'사용 불가 스킬입니다.');ensure(!(side==='defense'&&c.attackEvent==='EV7'),'방어 스킬이 차단됐습니다.');cost+=SLOT_COSTS[a.skill];}
 if(a.event){const card=findCard(p,a.event);ensure(card&&CARDS[card.id].type==='event'&&CARDS[card.id].use===side&&CARDS[card.id].level<=level(p.leader)&&allowed(p,card.id),'사용 불가 이벤트입니다.');cost+=CARDS[card.id].cost;}
 ensure(validPayment(p,a.payment,cost),'지불할 경험치가 올바르지 않습니다.');return;}
 if(a.type==='resolve'){ensure(c.stage==='resolve','결과 처리 단계가 아닙니다.');for(const [choice,list]of [[a.loss,c.attackParty],[a.defenseLoss,c.defenseParty]] as [string|undefined,string[]][]){if(choice)ensure(list.includes(choice),'파티 손실 대상이 올바르지 않습니다.');}if(a.replacement)ensure(enemy.allies.some(u=>u.card.uid===a.replacement&&u.zone==='arena'),'히트 대체 대상이 올바르지 않습니다.');return;}
 ensure(a.type==='kazan'&&actingPlayer(g)===g.active&&c.stage==='attackBoost','현재 결투 단계에서 할 수 없는 행동입니다.');
 }
 if(a.type==='kazan'){ensure(g.active===actingPlayer(g)&&p.leader.card.id==='L02'&&level(p.leader)>=2&&!p.kazanUsed&&p.deck.length>0,'카잔 능력 사용 불가.');return;}
 ensure(!c,'결투 처리 중입니다.');
 if(a.type==='recovery'){ensure(PROFILES[g.profile].recovery&&g.phase==='manage'&&!p.recoveryUsed&&!p.allies.length&&available(p)===0,'재건 지원 조건을 충족하지 않습니다.');ensure([...p.discard,...p.deck].some(r=>r.id==='A01'),'찾을 견습 모험가가 없습니다.');return;}
 if(a.type==='advance')return;
 if(a.type==='move'){ensure(g.phase==='hunt','사냥 단계에만 이동 가능합니다.');const u=p.allies.find(u=>u.card.uid===a.unit);ensure(u&&a.zone&&a.zone!==u.zone,'이동 대상이 올바르지 않습니다.');return;}
 if(a.type==='hunt'){ensure(g.phase==='hunt','사냥 단계가 아닙니다.');const party=a.party??[];ensure(party.length&&validParty(p,party,'dungeon',''),'사냥 파티가 올바르지 않습니다.');ensure(g.dungeon.some(m=>m.uid===a.target),'몬스터가 없습니다.');if(a.loss)ensure(party.includes(a.loss),'손실 대상이 잘못됐습니다.');return;}
 if(a.type==='attack'){ensure(g.phase==='duel','결투 단계가 아닙니다.');const u=getUnit(p,a.unit),t=getUnit(enemy,a.target);ensure(u&&t&&!u.rest,'공격 대상 또는 공격자가 잘못됐습니다.');ensure(u.zone===t.zone,'서로 다른 존은 공격할 수 없습니다.');ensure(t.card.id.startsWith('L')||!u.card.id.startsWith('L'),'리더는 동료를 공격할 수 없습니다.');ensure(u.zone!=='dungeon'||CARDS[u.card.id].raid,'습격 능력이 없습니다.');ensure(validParty(p,a.party??[],u.zone,u.card.uid),'공격 파티가 올바르지 않습니다.');ensure((a.party??[]).every(id=>personal(p,getUnit(p,id)!,'attack')<=personal(p,u,'attack')),'공격자보다 강한 동료는 참여할 수 없습니다.');return;}
 if(a.type==='summon'||a.type==='register'||a.type==='event'){ensure(g.phase==='manage','운영 단계가 아닙니다.');const card=findCard(p,a.card);ensure(card&&allowed(p,card.id),'손패에 없거나 속성이 맞지 않습니다.');const def=CARDS[card.id];ensure(validPayment(p,a.payment,def.cost),'경험치 지불 오류.');if(a.type==='summon')ensure(def.type==='ally','동료가 아닙니다.');if(a.type==='register')ensure(def.type==='skill'&&Number.isInteger(a.slot)&&a.slot!>=0&&a.slot!<6,'스킬 또는 슬롯 오류.');if(a.type==='event'){ensure(def.type==='event'&&def.use==='manage'&&def.level<=level(p.leader),'운영 이벤트 조건 오류.');const preview=structuredClone(p);spend(preview,a.payment);if(def.id==='EV3')ensure(g.dungeon.length&&g.dungeon.some(m=>m.uid===a.target&&CARDS[m.id].power===Math.min(...g.dungeon.map(m=>CARDS[m.id].power))),'가장 약한 몬스터를 골라야 합니다.');if(def.id==='EV4')ensure(preview.farm.some(f=>f.card.uid===a.target&&f.rest),'지불 후 남은 레스트 몬스터를 골라야 합니다.');if(def.id==='EV9'&&a.target){const pool=preview.discard.some(r=>CARDS[r.id].summon&&CARDS[r.id].cost<=2)?preview.discard:preview.deck;ensure(pool.some(r=>r.uid===a.target&&CARDS[r.id].summon&&CARDS[r.id].cost<=2),'소환수 탐색 대상 오류.');}}return;}
 if(a.type==='level'){ensure(g.phase==='level','레벨업 단계가 아닙니다.');const u=getUnit(p,a.unit);ensure(u&&!u.leveled&&level(u)<(u===p.leader?5:3),'레벨업 대상 오류.');ensure(p.farm.some(f=>f.card.uid===a.card&&!f.rest),'활성 몬스터가 필요합니다.');return;}
 throw Error('지원하지 않는 행동입니다.');
}
function searchSummon(g:Game,p:Player,mode:'hand'|'summon',target?:string){const eligible=(r:Ref)=>!!CARDS[r.id].summon&&(mode==='summon'?CARDS[r.id].cost===2:CARDS[r.id].cost<=2);const fromDiscard=p.discard.some(eligible),pool=fromDiscard?p.discard:p.deck;const idx=target?pool.findIndex(r=>r.uid===target&&eligible(r)):pool.findIndex(eligible);if(idx>=0){const card=pool.splice(idx,1)[0];if(mode==='hand')p.hand.push(card);else summon(p,card);log(g,mode==='hand'?'소환수 탐색':'케이트 Lv2 무료 소환',`${CARDS[card.id].name} · ${fromDiscard?'디스카드':'덱'}에서`,[card.uid]);}if(!fromDiscard)shuffle(g,p.deck);}
export function applyAction(g:Game,a:Action):Game{
 validateAction(g,a);const s=structuredClone(g);s.actions.push(structuredClone(a));const owner=actingPlayer(s),p=s.players[owner],enemy=s.players[1-s.active];const c=s.combat;
 if(a.type==='recovery'){const fromDiscard=p.discard.some(r=>r.id==='A01'),pool=fromDiscard?p.discard:p.deck,at=pool.findIndex(r=>r.id==='A01'),card=pool.splice(at,1)[0];summon(p,card);p.recoveryUsed=true;if(!fromDiscard)shuffle(s,p.deck);log(s,'재건 지원',`${CARDS[card.id].name} 무료 레스트 소환 · 다음 자기 턴부터 활동 · 게임당 1회`,[card.uid]);return s;}
 if(a.type==='kazan'){p.discard.push(p.deck.shift()!);p.bank++;p.kazanUsed=true;log(s,'카잔 능력','덱 1장 디스카드 · 턴 한정 경험치 +1');return s;}
 if(c){
 if(a.type==='party'){c.defenseParty=a.party??[];for(const id of c.defenseParty)getUnit(p,id)!.rest=true;c.stage='attackBoost';log(s,'방어 파티 구성',c.defenseParty.length?`${c.defenseParty.length}장 레스트`:'단독 방어',c.defenseParty);}
 if(a.type==='boost'){const side=c.stage==='attackBoost'?'attack':'defense';const user=getUnit(p,side==='attack'?c.attacker:c.target)!;let bonus=0;const used:string[]=[];
 if(a.skill!==undefined){bonus+=skillValue(s,p,user,a.skill,side);const slot=p.slots[a.skill]!;if(!slot.card.id.startsWith('B'))slot.rest=true;used.push(CARDS[slot.card.id].name);c[side==='attack'?'attackSkill':'defenseSkill']=a.skill;}
 if(a.event){const i=p.hand.findIndex(r=>r.uid===a.event),card=p.hand.splice(i,1)[0];bonus+=eventValue(p,user,card.id,side==='attack'?c.attackParty:c.defenseParty);c[side==='attack'?'attackEvent':'defenseEvent']=card.id;p.discard.push(card);used.push(CARDS[card.id].name);}
 spend(p,a.payment);c[side==='attack'?'attackBonus':'defenseBonus']=bonus;c.breakdown.push(`${side==='attack'?'공격':'방어'}: ${used.join(' + ')||'추가 사용 없음'} (+${bonus})`);c.stage=side==='attack'?'defenseBoost':'resolve';log(s,`${side==='attack'?'공격':'방어'} 스킬·이벤트`,c.breakdown.at(-1),[user.card.uid]);}
 if(a.type==='resolve'){
 const ap=s.players[s.active],dp=enemy,att=getUnit(ap,c.attacker)!,tar=getUnit(dp,c.target)!;const atk=combatPower(s,'attack'),def=combatPower(s,'defense');let detail=`공격 ${atk.total} ${atk.total>def.total?'>':atk.total<def.total?'<':'='} 방어 ${def.total}\n${atk.parts.join(' + ')}\n${def.parts.join(' + ')}\n${c.breakdown.join(' / ')}`;
 const cheapest=(pl:Player,ids:string[])=>[...ids].sort((a,b)=>personal(pl,getUnit(pl,a)!,'attack')-personal(pl,getUnit(pl,b)!,'attack'))[0];
 if(atk.total>def.total){if(tar===dp.leader){const replacement=a.replacement??dp.allies.filter(u=>u.zone==='arena').sort((a,b)=>CARDS[a.card.id].power-CARDS[b.card.id].power)[0]?.card.uid;if(c.defenseEvent==='EV8'&&replacement){destroy(dp,replacement);detail+='\nEV8: 히트 대신 동료 파괴';}else{const hits=dp.hit.length;draw(s,1-s.active,1,'hit');detail+=dp.hit.length>hits?'\n리더 히트 +1':'\n히트로 옮길 카드가 없어 패배';}}else{destroy(dp,tar.card.uid);detail+='\n방어 동료 파괴';}if(c.attackParty.length&&def.total>atk.personal){destroy(ap,a.loss??cheapest(ap,c.attackParty));detail+='\n공격 파티 동료 1장 손실';}}
 else if(atk.total<def.total){if(att!==ap.leader)destroy(ap,att.card.uid);else if(c.attackParty.length)destroy(ap,a.loss??cheapest(ap,c.attackParty));detail+='\n방어 성공';}
 else{if(att!==ap.leader)destroy(ap,att.card.uid);else if(c.attackParty.length)destroy(ap,a.loss??cheapest(ap,c.attackParty));if(tar!==dp.leader)destroy(dp,tar.card.uid);else if(c.defenseParty.length)destroy(dp,a.defenseLoss??cheapest(dp,c.defenseParty));detail+='\n동률 · 리더 히트 없음';}
 log(s,'결투 결과',detail,[c.attacker,c.target]);s.combat=null;}
 return s;
 }
 if(a.type==='advance'){
 if(s.phase==='start'){for(const u of units(p)){u.rest=false;u.leveled=false;}for(const slot of p.slots)if(slot)slot.rest=false;p.kazanUsed=false;s.phase='draw';log(s,'활성화','리더·동료·스킬 활성화. 파밍은 활성화하지 않음.');}
 else if(s.phase==='draw'){const count=s.turn===1?1:2;draw(s,s.active,count);log(s,'드로우',`${count}장 드로우`);s.phase='hunt';}
 else if(s.phase==='hunt'){s.phase='duel';log(s,'결투 단계 시작');}
 else if(s.phase==='duel'){s.phase='manage';log(s,'운영 단계 시작');}
 else if(s.phase==='manage'){s.phase='refill';log(s,'운영 종료');}
 else if(s.phase==='refill'){let n=0;while(s.dungeon.length<4&&s.monsterDeck.length){s.dungeon.push(s.monsterDeck.shift()!);n++;}s.phase='level';log(s,'던전 보충',`${n}장 보충 · 남은 몬스터덱 ${s.monsterDeck.length}`);}
 else if(s.phase==='level'){s.phase='end';log(s,'레벨업 종료');}
 else{p.bank=0;if(!s.monsterDeck.length){const [pa,pb]=s.players;const score=(pb.hit.length-pa.hit.length)||level(pa.leader)-level(pb.leader);s.result={winner:score>0?0:score<0?1:null,reason:'몬스터덱 소진'};log(s,'대전 종료','몬스터덱 소진 · 받은 히트 수, 리더 레벨 순 비교');}else{s.active=(1-s.active) as 0|1;s.turn++;s.phase='start';log(s,'다음 턴',`${s.active?'B':'A'} · ${CARDS[s.players[s.active].leader.card.id].name}`);}}
 }
 if(a.type==='move'){const u=getUnit(p,a.unit)!;u.zone=a.zone!;log(s,'동료 이동',`${CARDS[u.card.id].name} → ${a.zone==='dungeon'?'던전':'결투장'}`,[u.card.uid]);}
 if(a.type==='hunt'){const party=a.party!.map(id=>getUnit(p,id)!),monster=s.dungeon.find(m=>m.uid===a.target)!;const sorted=[...party].sort((a,b)=>personal(p,b,'hunt')-personal(p,a,'hunt'));const total=party.reduce((n,u)=>n+personal(p,u,'hunt'),0),mp=CARDS[monster.id].power,top=personal(p,sorted[0],'hunt');for(const u of party)u.rest=true;let loss:string|undefined;if(total>=mp){s.dungeon=s.dungeon.filter(m=>m.uid!==monster.uid);p.farm.push({card:monster,rest:false});}if(total<=mp)loss=sorted[0].card.uid;else if(top<=mp)loss=a.loss??sorted.at(-1)!.card.uid;if(loss)destroy(p,loss);if(total>=mp&&mp>=400&&PROFILES[s.profile].elite){draw(s,s.active,1);log(s,'정예 토벌 보상','파워 400 이상 몬스터 사냥 성공 · 추가 드로우 1장',[monster.uid]);}log(s,'사냥 '+(total>=mp?'성공':'실패'),`${party.map(u=>CARDS[u.card.id].name).join(' + ')} ${total} / ${CARDS[monster.id].name} ${mp}${loss?' · 동료 1장 손실':' · 동료 생존'}`,[...a.party!,monster.uid]);}
 if(a.type==='attack'){const u=getUnit(p,a.unit)!;u.rest=true;for(const id of a.party??[])getUnit(p,id)!.rest=true;s.combat={attacker:a.unit!,target:a.target!,attackParty:a.party??[],defenseParty:[],stage:'defenseParty',attackBonus:0,defenseBonus:0,breakdown:[]};log(s,'결투 선언',`${CARDS[u.card.id].name} → ${CARDS[getUnit(enemy,a.target)!.card.id].name} · 공격 파티 ${a.party?.length??0}장`,[a.unit!,a.target!]);}
 if(a.type==='summon'||a.type==='register'||a.type==='event'){spend(p,a.payment);const i=p.hand.findIndex(r=>r.uid===a.card),card=p.hand.splice(i,1)[0],def=CARDS[card.id];if(a.type==='summon'){summon(p,card);log(s,'동료 소환',`${def.name} · 경험치 ${def.cost} · 레스트`,[card.uid]);}else if(a.type==='register'){const old=p.slots[a.slot!];if(old&&!old.card.id.startsWith('B'))p.discard.push(old.card);p.slots[a.slot!]={card,rest:false};log(s,'스킬 등록',`${def.name} → ${a.slot!+1}번 슬롯 · 등록 ${def.cost} / 사용 ${SLOT_COSTS[a.slot!]}`,[card.uid]);}else{p.discard.push(card);if(card.id==='EV3'){const m=s.dungeon.find(m=>m.uid===a.target)!;s.dungeon=s.dungeon.filter(m=>m.uid!==a.target);p.farm.push({card:m,rest:false});}if(card.id==='EV4')p.farm.find(f=>f.card.uid===a.target)!.rest=false;if(card.id==='EV9')searchSummon(s,p,'hand',a.target);log(s,'이벤트 사용',`${def.name} · 경험치 ${def.cost}`,[card.uid]);}}
 if(a.type==='level'){const u=getUnit(p,a.unit)!,i=p.farm.findIndex(f=>f.card.uid===a.card),m=p.farm.splice(i,1)[0].card;u.levels.push(m);u.leveled=true;log(s,'레벨업',`${CARDS[u.card.id].name} Lv.${level(u)} · ${CARDS[m.id].name} 부착`,[u.card.uid,m.uid]);if(u.card.id==='L03'&&level(u)===2)searchSummon(s,p,'summon');}
 return s;
}
// Candidate lists bound combinatorial search for the baseline bot; validateAction accepts
// every legal explicit party/payment, independently of this candidate heuristic.
function groups(ids:string[]){const out:string[][]=[[]];for(const id of ids)out.push([id]);for(let i=0;i<Math.min(ids.length,10);i++)for(let j=i+1;j<Math.min(ids.length,10);j++)out.push([ids[i],ids[j]]);if(ids.length>2)out.push(ids);return out;}
export function candidates(g:Game):Action[]{
 if(g.result)return[];const p=g.players[actingPlayer(g)],other=g.players[1-g.active],c=g.combat;const out:Action[]=[];
 if(p.leader.card.id==='L02'&&level(p.leader)>=2&&!p.kazanUsed&&p.deck.length&&actingPlayer(g)===g.active&&(!c||c.stage==='attackBoost'))out.push({type:'kazan'});
 if(c){if(c.stage==='defenseParty'){const target=getUnit(p,c.target)!;for(const party of groups(p.allies.filter(u=>!u.rest&&u.zone===target.zone&&u.card.uid!==target.card.uid).map(u=>u.card.uid)))out.push({type:'party',party});}
 else if(c.stage==='resolve')out.push({type:'resolve'});
 else{const side=c.stage==='attackBoost'?'attack':'defense',u=getUnit(p,side==='attack'?c.attacker:c.target)!;const skills:(number|undefined)[]=[undefined,...p.slots.flatMap((_,i)=>legalSkill(p,u,i,side)&&!(side==='defense'&&c.attackEvent==='EV7')?[i]:[])];const events:(Ref|undefined)[]=[undefined,...p.hand.filter(r=>CARDS[r.id].type==='event'&&CARDS[r.id].use===side&&CARDS[r.id].level<=level(p.leader))];for(const skill of skills)for(const event of events){const cost=(skill===undefined?0:SLOT_COSTS[skill])+(event?CARDS[event.id].cost:0),payment=paymentFor(p,cost);if(payment)out.push({type:'boost',skill,event:event?.uid,payment});}}
 }else{
 out.push({type:'advance'});
 if(PROFILES[g.profile].recovery&&g.phase==='manage')out.push({type:'recovery'});
 if(g.phase==='hunt'){const active=p.allies.filter(u=>!u.rest);for(const u of active)out.push({type:'move',unit:u.card.uid,zone:u.zone==='arena'?'dungeon':'arena'});for(const party of groups(active.filter(u=>u.zone==='dungeon').map(u=>u.card.uid)).filter(x=>x.length))for(const m of g.dungeon)out.push({type:'hunt',party,target:m.uid});}
 if(g.phase==='duel')for(const u of units(p).filter(u=>!u.rest))for(const target of units(other).filter(t=>t.zone===u.zone&&(t===other.leader||u!==p.leader))){if(u.zone==='dungeon'&&!CARDS[u.card.id].raid)continue;const ids=p.allies.filter(a=>!a.rest&&a!==u&&a.zone===u.zone&&personal(p,a,'attack')<=personal(p,u,'attack')).map(a=>a.card.uid);for(const party of groups(ids))out.push({type:'attack',unit:u.card.uid,target:target.card.uid,party});}
 if(g.phase==='manage')for(const card of p.hand){const def=CARDS[card.id],payment=paymentFor(p,def.cost);if(!payment)continue;if(def.type==='ally')out.push({type:'summon',card:card.uid,payment});if(def.type==='skill')for(let slot=0;slot<6;slot++)out.push({type:'register',card:card.uid,slot,payment});if(def.type==='event'&&def.use==='manage'&&def.level<=level(p.leader)){if(card.id==='EV3'&&g.dungeon.length){const power=Math.min(...g.dungeon.map(m=>CARDS[m.id].power));for(const m of g.dungeon.filter(m=>CARDS[m.id].power===power))out.push({type:'event',card:card.uid,target:m.uid,payment});}if(card.id==='EV4'){const after=structuredClone(p);spend(after,payment);for(const f of after.farm.filter(f=>f.rest))out.push({type:'event',card:card.uid,target:f.card.uid,payment});}if(card.id==='EV9')out.push({type:'event',card:card.uid,payment});}}
 if(g.phase==='level')for(const u of units(p).filter(u=>!u.leveled&&level(u)<(u===p.leader?5:3)))for(const f of p.farm.filter(f=>!f.rest))out.push({type:'level',unit:u.card.uid,card:f.card.uid});
 }
 return out.filter(a=>{try{validateAction(g,a);return true;}catch{return false;}});
}
// A player can reserve a specific monster for EV4 even if the bot's default payment spends it.
export function playerActions(g:Game):Action[]{
 const actions=candidates(g);
 if(g.result||g.combat||g.phase!=='manage')return actions;
 const p=g.players[g.active];
 for(const card of p.hand.filter(r=>r.id==='EV4')){
   for(const farm of p.farm){
     const target=farm.card.uid;
     if(actions.some(a=>a.card===card.uid&&a.target===target))continue;
     const payment=farm.rest?paymentFor({...p,farm:p.farm.filter(f=>f!==farm)},CARDS.EV4.cost):{rest:[target],discard:[],bank:0};
     if(!payment)continue;
     const choice:Action={type:'event',card:card.uid,target,payment};
     try{validateAction(g,choice);}catch{continue;}
     actions.push(choice);
   }
 }
 return actions;
}
export function checkInvariants(g:Game){const refs=[...g.monsterDeck,...g.dungeon,...g.players.flatMap(p=>[...p.deck,...p.hand,...p.hit,...p.discard,...p.farm.map(f=>f.card),...units(p).flatMap(u=>[u.card,...u.levels]),...p.slots.flatMap(s=>s?[s.card]:[])])];const ids=refs.map(r=>r.uid);ensure(unique(ids),'카드가 중복 배치됐습니다.');ensure(refs.filter(r=>CARDS[r.id].type==='monster').length===50,'몬스터 총수가 바뀌었습니다.');for(let i=0;i<2;i++)ensure(refs.filter(r=>r.uid.startsWith(`p${i}-`)&&!r.uid.includes('leader')&&!r.uid.includes('basic')).length===50,'플레이 카드 총수가 바뀌었습니다.');return true;}
