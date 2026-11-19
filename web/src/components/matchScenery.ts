import {HEIGHT,WIDTH,paintForest} from './huntPixels.ts';

export const FIELD_WIDTH=384;

// Project the paving into the foreground one pixel row at a time. Leaving the
// forest trail intact behind its low curb gives the dungeon a separate floor.
export function paintMatchScenery(c:CanvasRenderingContext2D){
  c.save();
  c.translate(-(WIDTH-FIELD_WIDTH)/2,0);
  paintForest(c);
  c.restore();
  const top=117,bottom=HEIGHT-3,mid=FIELD_WIDTH/2;
  const half=(y:number)=>Math.min(mid,148+Math.floor((y-top)*1.65));
  for(let y=top;y<=bottom+2;y++){
    const w=half(y);
    c.fillStyle=y===top?'#d4c29e':y===top+1||y>bottom?'#796e67':y<133?'#aca39b':y<152?'#b6aca1':'#c1b4a5';
    c.fillRect(mid-w,y,w*2,1);
    if(y<=bottom){
      c.fillStyle='#938981';
      c.fillRect(mid-w+2,y,1,1);c.fillRect(mid+w-3,y,1,1);
    }
  }
  // Stagger the joints and stretch the stones towards the near edge.
  const courses=[top+3,130,146,170];
  for(let i=0;i<courses.length-1;i++){
    const y0=courses[i],y1=courses[i+1],w=half(y1);
    c.fillStyle='#a0958c';c.fillRect(mid-w+3,y1,w*2-6,1);
    for(let col=-3;col<=3;col++){
      const u=(col+(i%2?.5:0))/3.5;
      for(let y=y0+1;y<y1;y++){
        const x=mid+Math.round(u*(150+(y-top)*.95));
        if(Math.abs(x-mid)<half(y)-5)c.fillRect(x,y,1,1);
      }
    }
  }
  // A few broken highlights keep the warm stone from reading like a grid overlay.
  for(const [x,y,w] of [[mid-86,131,14],[mid+43,147,23],[mid-53,171,18],[mid+94,121,9]]){
    c.fillStyle='#c9baaa';c.fillRect(x,y,w,1);
  }
}
