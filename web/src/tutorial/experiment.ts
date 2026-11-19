import {createGame,type Game} from '../engine/game.ts';
import {runGame,BOT_VERSION} from '../bots/baseline.ts';
import type {LeaderId} from '../data/cards.ts';
import {LAB_VERSION,type ProfileId} from '../data/profiles.ts';

export type ExperimentRow={profile:ProfileId;version:string;wins:number[];reasons:Record<string,number>;averageTurns:number;hunts:number;eliteHunts:number;recoveries:number};
export type Experiment={count:number;seed:number;leaders:[LeaderId,LeaderId];bot:string;lab:string;rows:ExperimentRow[]};
export function runExperiment(count:number,seed:number,leaders:[LeaderId,LeaderId],profile:ProfileId,onProgress?:(n:number)=>void):Experiment {
  if(![20,100,500].includes(count)||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('실험 설정 오류');
  const profiles:ProfileId[]=profile==='core'?['core']:['core',profile];
  const rows=profiles.map(p=>({profile:p,version:createGame(seed,leaders,undefined,p).version,wins:[0,0,0],reasons:{} as Record<string,number>,averageTurns:0,hunts:0,eliteHunts:0,recoveries:0}));
  for(let i=0;i<count;i++){
    const flipped=i%2===1,pair:[LeaderId,LeaderId]=flipped?[leaders[1],leaders[0]]:leaders;
    for(const row of rows){
      const g:Game=runGame(createGame((seed+Math.floor(i/2))>>>0,pair,undefined,row.profile));
      const winner=g.result!.winner;
      row.wins[winner===null?2:flipped?1-winner:winner]++;
      row.averageTurns+=g.turn/count;
      row.reasons[g.result!.reason]=(row.reasons[g.result!.reason]??0)+1;
      row.hunts+=g.actions.filter(a=>a.type==='hunt').length;
      row.eliteHunts+=g.logs.filter(l=>l.title==='정예 토벌 보상').length;
      row.recoveries+=g.actions.filter(a=>a.type==='recovery').length;
    }
    if(i%2===1)onProgress?.(i+1);
  }
  return {count,seed,leaders,bot:BOT_VERSION,lab:LAB_VERSION,rows};
}
