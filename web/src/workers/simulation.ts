import {runExperiment} from '../tutorial/experiment.ts';
import type {LeaderId} from '../data/cards.ts';
import type {ProfileId} from '../data/profiles.ts';
self.onmessage=(e:MessageEvent<{count:number;seed:number;leaders:[LeaderId,LeaderId];profile:ProfileId}>)=>{
  try{const {count,seed,leaders,profile}=e.data;const result=runExperiment(count,seed,leaders,profile,n=>self.postMessage({type:'progress',completed:n}));self.postMessage({type:'done',...result});}
  catch(error){self.postMessage({type:'error',message:String(error)});}
};
