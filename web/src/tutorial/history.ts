import {applyAction,type Game,type Action} from '../engine/game.ts';
export function branchHistory(history:Game[],at:number,action:Action){
  if(!Number.isInteger(at)||at<0||at>=history.length)throw Error('잘못된 분기 시점');
  return [...history.slice(0,at+1),applyAction(history[at],action)];
}
