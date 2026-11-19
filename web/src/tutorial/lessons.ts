import {createGame,applyAction,paymentFor, type Game,type Ref,type Player,type Unit,type Action} from '../engine/game.ts';
import type {ProfileId} from '../data/profiles.ts';

export type LessonId='economy'|'hunt'|'growth'|'party'|'defense'|'boss'|'recovery';
export const LESSONS: {id:LessonId;title:string;question:string;takeaway:string;profile:ProfileId;action:Action['type']}[] = [
  {id:'economy',title:'동료를 내고 무엇을 남길까',question:'시작 자원 2장은 최대 경험치 4입니다. 동료를 소환한 뒤 상대 턴에 쓸 비용도 남을까요?',takeaway:'동료는 다음 수입에 대한 투자입니다. 지금 낸 동료는 레스트되어 바로 사냥하거나 방어 파티에 들어갈 수 없습니다.',profile:'core',action:'summon'},
  {id:'hunt',title:'사냥과 전투의 배분',question:'약한 몬스터를 안전하게 잡을 수 있습니다. 동료를 모두 사냥에 쓰는 것이 좋을까요?',takeaway:'사냥은 자원을 벌지만 참여 동료를 레스트합니다. 공격·방어를 위해 일부 동료를 남기는 대안도 비교하세요.',profile:'core',action:'hunt'},
  {id:'growth',title:'소비할까, 성장시킬까',question:'활성 몬스터는 비용으로 쓰거나 레벨업에 붙일 수 있습니다. 이번 성장으로 무엇이 달라질까요?',takeaway:'레벨업에 쓴 몬스터는 파밍존을 떠납니다. 리더 능력과 동료의 안전한 사냥 범위를 함께 살펴보세요.',profile:'core',action:'level'},
  {id:'party',title:'파티 공격의 대가',question:'파티를 늘리면 총파워는 높아집니다. 방어할 동료와 공격 성공 시 손실 조건도 확인했나요?',takeaway:'공격 성공만으로 이득을 판단하지 않습니다. 상대 최종 방어가 공격자 개인 파워보다 높으면 공격 파티 동료를 잃을 수 있습니다.',profile:'core',action:'attack'},
  {id:'defense',title:'막을까, 히트를 받을까',question:'상대 공격 파워는 공개되어 있습니다. 방어 스킬과 이벤트에 자원을 얼마나 쓸까요?',takeaway:'방어는 다음 턴 자원을 소비합니다. 동률이면 히트는 막지만 리더의 파티 대체 손실 규칙은 따로 적용됩니다.',profile:'core',action:'boost'},
  {id:'boss',title:'정예 보상을 노릴까',question:'실험 던전입니다. 동료 한 장을 잃더라도 정예를 잡고 추가 드로우를 받을 가치가 있을까요?',takeaway:'파워 400 이상 토벌의 추가 드로우는 실험 규칙입니다. 보상과 동료 손실을 비교하며 원본보다 좋은지 판단하세요.',profile:'elite',action:'hunt'},
  {id:'recovery',title:'자원이 끊겼을 때',question:'동료도 경험치도 없습니다. 실험 규칙의 재건 지원으로 다시 사냥을 준비할 수 있을까요?',takeaway:'자기 운영 단계·동료 0·가용 경험치 0·게임당 1회 조건입니다. 소환된 견습은 다음 자기 턴부터 활동합니다.',profile:'recovery',action:'recovery'},
];

function take(p:Player,id:string):Ref {
  for(const pool of [p.hand,p.deck,p.discard]){const i=pool.findIndex(r=>r.id===id);if(i>=0)return pool.splice(i,1)[0];}
  throw Error(`학습 배치에 필요한 카드 없음: ${id}`);
}
function monster(g:Game,id:string):Ref {const i=g.monsterDeck.findIndex(r=>r.id===id);if(i<0)throw Error(`학습 몬스터 없음: ${id}`);return g.monsterDeck.splice(i,1)[0];}
function ally(p:Player,id:string,zone:Unit['zone']='arena') {const result:Unit={card:take(p,id),rest:false,zone,levels:[],leveled:false};p.allies.push(result);return result;}
function hand(p:Player,ids:string[]){p.deck.push(...p.hand);p.hand=[];p.hand=ids.map(id=>take(p,id));}
function dungeon(g:Game,ids:string[]){g.monsterDeck.push(...g.dungeon);g.dungeon=[];g.dungeon=ids.map(id=>monster(g,id));}
export function lessonGame(id:LessonId):Game {
  const lesson=LESSONS.find(l=>l.id===id);if(!lesson)throw Error('알 수 없는 학습 장면');
  let g=createGame(20261020,['L01','L02'],undefined,lesson.profile);
  const p=g.players[0];
  if(id==='economy'){g.phase='manage';hand(p,['A04','A03','S01','EV1']);}
  if(id==='hunt'){g.phase='hunt';ally(p,'A01','dungeon');ally(p,'A04','dungeon');dungeon(g,['M01','M04','M06','M10']);}
  if(id==='growth'){g.phase='level';ally(p,'A03');p.farm.push({card:monster(g,'M06'),rest:false});}
  if(id==='party'){g.phase='duel';ally(p,'A03');ally(p,'A05');}
  if(id==='defense'){
    g.phase='duel';g.active=1;
    p.slots[1]={card:take(p,'S02'),rest:false};hand(p,['EV2','A01','S03','EV1']);
    const enemy=g.players[1];enemy.leader.levels.push(monster(g,'M01'));enemy.slots[2]={card:take(enemy,'S10'),rest:false};
    g=applyAction(g,{type:'attack',unit:enemy.leader.card.uid,target:p.leader.card.uid,party:[]});
    g=applyAction(g,{type:'party',party:[]});
    g=applyAction(g,{type:'boost',skill:2,payment:paymentFor(g.players[1],2)!});
  }
  if(id==='boss'){g.phase='hunt';ally(p,'A02','dungeon');ally(p,'A03','dungeon');dungeon(g,['M10','M11','M08','M09']);}
  if(id==='recovery'){g.phase='manage';p.discard.push(...p.farm.map(f=>f.card));p.farm=[];hand(p,['S07','S06','A06','EV6']);}
  g.actions=[];
  g.logs=[{index:0,turn:g.turn,player:g.active,phase:'학습 장면',title:lesson.title,detail:'학습을 위한 고정 배치입니다. 이후 행동과 판정은 실제 엔진으로 진행합니다.',cards:[]}];
  return g;
}
export function lessonComplete(id:LessonId,g:Game){const l=LESSONS.find(l=>l.id===id)!;return g.actions.some(a=>a.type===(id==='party'||id==='defense'?'resolve':l.action));}
