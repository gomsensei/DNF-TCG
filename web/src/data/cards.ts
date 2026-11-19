export type LeaderId = 'L01' | 'L02' | 'L03';
export type Timing = 'attack' | 'defense' | 'duel' | 'hunt';
export type Card = { id:string; name:string; type:'leader'|'ally'|'skill'|'event'|'monster'; attrs:string[]; cost:number; power:number; level:number; role?:string; summon?:boolean; raid?:boolean; use?:'attack'|'defense'|'manage'; effect?:string; bonus?:{when:Timing;value:number} };
const all:Card[]=[];
function add(id:string,name:string,type:Card['type'],attrs:string[],cost:number,power:number,level=1,extra:Partial<Card>={}){all.push({id,name,type,attrs,cost,power,level,...extra});}
add('L01','풍진','leader',['권','술'],0,500,1,{effect:'파티의 동속성 동료 공격 +100. Lv2: 리더의 동속성 스킬 +100. Lv3: 방어 +100. Lv5: 상시 +100.'});
add('L02','카잔','leader',['검','귀'],0,500,1,{effect:'공격 시 히트당 +100(최대 +200). Lv2: 자기 턴 1회 덱 1장 버려 경험치 1. Lv4: 방어에도 적용. Lv5: 상시 +100, 히트 보정 최대 +400.'});
add('L03','케이트','leader',['둔','마'],0,500,1,{effect:'소환수 +100. Lv2 도달: 비용 2 소환수 무료 소환(디스카드 우선). Lv4: 소환수당 리더 +100. Lv5: 소환수 추가 +100.'});
const allies:[string,string,string[],number,number,string,Partial<Card>?][]=[
 ['A01','견습 모험가',[],1,200,'파밍형'],['A02','숙련 용병',[],3,400,'전투형'],
 ['A03','시즈키',['권'],1,300,'연계형',{bonus:{when:'duel',value:100}}],['A04','게일 일랩스',['권'],1,300,'기습형',{raid:true}],['A05','브리즈 일랩스',['권','술'],2,400,'방어형',{bonus:{when:'defense',value:100}}],['A06','섀넌 마이어',['권'],3,500,'공격형',{bonus:{when:'attack',value:100}}],
 ['A07','아간조',['검','귀'],2,300,'연계형',{bonus:{when:'duel',value:100}}],['A08','시란',['검','귀'],2,300,'기습형',{raid:true}],['A09','반 발슈테트',['검','귀'],3,400,'방어형',{bonus:{when:'defense',value:100}}],['A10','브왕가',['검','귀'],4,500,'공격형',{bonus:{when:'attack',value:100}}],
 ['A11','불의 정령',['둔','마'],2,300,'연계형',{summon:true,bonus:{when:'duel',value:100}}],['A12','어둠의 정령',['둔','마'],2,300,'기습형',{summon:true,raid:true}],['A13','물의 정령',['둔','마'],3,400,'방어형',{summon:true,bonus:{when:'defense',value:100}}],['A14','빛의 정령',['둔','마'],4,500,'공격형',{summon:true,bonus:{when:'attack',value:100}}]
];
for(const [id,n,a,c,p,role,extra] of allies)add(id,n,'ally',a,c,p,1,{role,...extra,effect:[role,extra?.summon?'소환수':'',extra?.raid?'습격':'',extra?.bonus?`${({attack:'공격',defense:'방어',duel:'결투',hunt:'사냥'})[extra.bonus.when]} 시 +${extra.bonus.value}`:'','Lv2 상시 +100; Lv3 연계·기습·공격형은 공격 +100, 방어형은 방어 +100.'].filter(Boolean).join(' · ')});
add('B01','발차기','skill',[],0,100,1,{use:'attack',effect:'기본 공격 스킬. 사용 시 슬롯 비용 1. 레스트되지 않음.'});
add('B02','크라우치','skill',[],0,100,1,{use:'defense',effect:'기본 방어 스킬. 사용 시 슬롯 비용 1. 레스트되지 않음.'});
const skills:[string,string,string[],number,number,number,'attack'|'defense',string?][]=[
 ['S01','정권지르기',['권'],1,200,1,'attack'],['S02','흘려내기',['권'],1,200,1,'defense'],['S03','연타',['권'],2,400,2,'attack'],['S04','기공방출',['술'],2,400,3,'attack','파티의 동속성 동료 2장 이상이면 +200.'],['S06','철벽자세',['권'],2,500,4,'defense','단독 방어면 +200.'],['S22','붕권',['권'],2,600,4,'attack'],['S07','질풍연환권',['권'],3,800,5,'attack'],
 ['S08','내려베기',['검'],1,200,1,'attack'],['S09','칼날막기',['검'],1,200,1,'defense'],['S10','가로베기연격',['검'],2,400,2,'attack'],['S11','폭주베기',['귀'],2,400,3,'attack','자기 히트 2장 이상이면 +200.'],['S12','받아넘기기',['검'],1,400,3,'defense'],['S23','원귀참',['귀'],2,500,4,'attack'],['S14','분노의 대검',['검','귀'],3,800,5,'attack'],
 ['S15','정령탄',['마'],1,200,1,'attack'],['S16','지팡이막기',['둔'],1,200,1,'defense'],['S17','쌍정령연격',['마'],2,300,2,'attack','리더 Lv4 이상이면 +200.'],['S18','정령집결',['마'],2,400,3,'attack','파티의 소환수 2장 이상이면 +200.'],['S20','정령의 가호',['둔'],2,500,4,'defense','비용 지불 전 파밍 활성 2장 이상이면 +200.'],['S24','원소폭격',['마'],2,600,4,'attack'],['S21','대정령폭발',['마'],3,800,5,'attack']
];
for(const [id,n,a,c,p,l,use,effect] of skills)add(id,n,'skill',a,c,p,l,{use,effect:effect??'추가 효과 없음.'});
const events:[string,string,string[],number,number,'attack'|'defense'|'manage',string][]=[
 ['EV1','속공',[],1,1,'attack','이번 결투 공격 측 파워 +200.'],['EV2','철벽',[],1,1,'defense','이번 결투 방어 측 파워 +200.'],['EV3','급습',[],2,2,'manage','던전에서 파워가 가장 낮은 몬스터 1장을 파밍존으로 가져온다.'],['EV4','재정비',[],1,2,'manage','자기 파밍존의 레스트 몬스터 1장을 활성화한다.'],['EV5','폭풍의 진각',['권'],2,2,'attack','리더 단독 공격이면 +300.'],['EV6','합격의 기',['술'],2,3,'attack','파티의 동속성 동료당 +100(최대 +300).'],['EV7','일도양단',['검'],2,2,'attack','상대의 방어 스킬 사용을 차단한다.'],['EV8','심연에서 돌아오다',['귀'],2,2,'defense','리더 히트 대신 자기 결투장 동료 1장 파괴. 동료가 없으면 원래 히트.'],['EV9','정령과의 계약',['둔'],1,1,'manage','비용 2 이하 소환수 1장을 손패로. 디스카드 우선, 없으면 덱 탐색 후 셔플.'],['EV10','정령공명',['마'],2,3,'attack','공격 파티의 소환수당 +100(최대 +300).']
];
for(const [id,n,a,c,l,use,effect]of events)add(id,n,'event',a,c,0,l,{use,effect});
export const MONSTER_COUNTS=[8,8,7,8,8,4,3,1,1,1,1];
const monsters:[string,number,Card['bonus']?][]=[['고블린',100],['랜드러너',100],['스켈레톤',100],['트롤',200],['오크 전사',200],['미노타우로스',300,{when:'attack',value:50}],['암흑마법사',300,{when:'defense',value:50}],['정예 A',400,{when:'hunt',value:100}],['정예 B',400,{when:'duel',value:100}],['던전군주 A',500,{when:'attack',value:100}],['던전군주 B',500,{when:'defense',value:100}]];
monsters.forEach(([n,p,bonus],i)=>add(`M${String(i+1).padStart(2,'0')}`,n,'monster',[],0,p,1,{bonus,effect:bonus?`레벨업 부착 효과: ${({attack:'공격',defense:'방어',duel:'결투',hunt:'사냥'})[bonus.when]} 시 +${bonus.value}. 사냥 중에는 효과 없음.`:'레벨업 효과 없음.'}));
export const CARDS:Record<string,Card>=Object.fromEntries(all.map(c=>[c.id,c]));
export const LEADERS:LeaderId[]=['L01','L02','L03'];
export const SLOT_COSTS=[1,1,2,2,3,3];
export function matches(a:string[],b:string[]){return a.some(x=>b.includes(x));}
export function deckFor(leader:LeaderId):string[]{
 const offset=leader==='L01'?3:leader==='L02'?7:11;
 const allyIds=['A01','A02',...Array.from({length:4},(_,i)=>`A${String(offset+i).padStart(2,'0')}`)];
 const skillIds=skills.filter(s=>matches(s[2],CARDS[leader].attrs)).map(s=>s[0]);
 const eventIds=events.filter(e=>!e[2].length||matches(e[2],CARDS[leader].attrs)).map(e=>e[0]);
 return [...allyIds.flatMap((id,i)=>Array(i===1?2:4).fill(id)),...skillIds.flatMap(id=>[id,id]),...eventIds.flatMap((id,i)=>Array(i<2?3:2).fill(id))];
}
export function validateDeck(ids:string[],leader:LeaderId){const errors:string[]=[];if(ids.length!==50)errors.push('덱은 50장이어야 합니다.');const counts:Record<string,number>={};for(const id of ids){const c=CARDS[id];counts[id]=(counts[id]??0)+1;if(!c||!['ally','skill','event'].includes(c.type)||id.startsWith('B'))errors.push(`덱에 넣을 수 없는 카드: ${id}`);else if(c.attrs.length&&!matches(c.attrs,CARDS[leader].attrs))errors.push(`속성 불일치: ${id}`);}for(const[id,n]of Object.entries(counts))if(n>4)errors.push(`동일 카드 4장 초과: ${id}`);return errors;}
