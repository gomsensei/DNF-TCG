import {paintTargetArrow} from './targetArrow.ts';

// Original pixel scenery and figures for the fixed core hunting lesson.
type Brush = CanvasRenderingContext2D;
export const WIDTH = 576;
export const HEIGHT = 176;
export const GALE_X = 109;
export const APPRENTICE_X = 208;
export const MONSTER_X = 382;
const FLOOR = 145;

function rect(c: Brush, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function pine(c: Brush, x: number, y: number, h: number, color: string) {
  for (let row = 0; row < h; row += 2) {
    const radius = Math.floor(row * .22 * (.67 + .33 * ((row % 12) / 12)));
    rect(c, color, x-radius, y-h+row, radius*2+1, 2);
  }
  rect(c, color, x-1, y-4, 3, 7);
}

export function paintForest(c: Brush) {
  let seed = 2971;
  function random(n: number) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * n);
  }
  const sky = ['#66647e','#90778a','#bb8a87','#dda18a','#f3bb89','#f8d49d'];
  const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  sky.forEach((tone,i) => {
    rect(c,tone,0,i*8,WIDTH,i===5?HEIGHT:8);
    if(i) for(let y=0;y<3;y++) for(let x=0;x<WIDTH;x++) {
      if(bayer[(y%4)*4+x%4] > y*5) rect(c,sky[i-1],x,i*8+y,1,1);
    }
  });
  for(let y=-15;y<=15;y++){
    const radius=Math.floor(Math.sqrt(15*15-y*y));
    rect(c,'#ffe4a6',337-radius,16+y,radius*2,1);
  }
  for(let i=0;i<18;i++) rect(c,'#f5bf9c',random(WIDTH),3+random(29),7+random(37),1);
  for(const [y,size,color] of [[42,8,'#ac8788'],[53,14,'#806f80'],[65,20,'#546571']] as const) {
    for(let x=0;x<WIDTH;x+=2){
      const ridge=Math.round(y+4*Math.sin(x/53+y)+3*Math.sin(x/18));
      rect(c,color,x,ridge,2,HEIGHT-ridge);
      if(x%4===0) pine(c,x,ridge+5,6+random(size),color);
    }
  }
  // Raised, broken aqueduct in the far clearing, cut into a pixel arch.
  for(let i=0;i<4;i++){
    const x=283+i*14, top=41+Math.abs(2-i)*2;
    rect(c,'#6e6873',x,top,14,5);
    rect(c,'#726c75',x,top,3,27);
    rect(c,'#726c75',x+3,top+4,2,4);
    rect(c,'#a68b86',x,top,13,1);
  }
  for(const side of [0,1]) {
    for(let i=0;i<8;i++){
      const x=side ? WIDTH-i*10 : i*10;
      pine(c,x,76+random(11),40+random(31),'#283f49');
    }
  }
  for(let x=0;x<WIDTH;x++){
    const top=Math.round(65+3*Math.sin(x/29)+2*Math.sin(x/12));
    rect(c,'#677968',x,top,1,HEIGHT-top);
    rect(c,'#839073',x,top+7,1,HEIGHT-top-7);
  }
  // A narrow trail opens into a broad clearing under both rows of fighters.
  // The receding verges, stones and tufts give depth only to the ground plane.
  for(let y=64;y<HEIGHT;y++){
    const d=(y-64)/(HEIGHT-64), bend=299+20*Math.sin(d*5.4);
    const half=9+360*Math.pow(d,.94),left=Math.round(bend-half+3*Math.sin(y*.35));
    const right=Math.round(bend+half+4*Math.cos(y*.27));
    rect(c,'#99977c',left-6,y,right-left+12,1);
    rect(c,d<.21?'#aba084':d<.5?'#bca887':'#c6ac89',left,y,right-left,1);
    const stride=4+Math.round(d*10);
    for(let x=random(stride);x<WIDTH;x+=stride+random(stride)){
      const path=x>left+2&&x<right-3;
      if(random(5)===0)rect(c,path?'#a79579':'#728066',x,y,1+Math.floor(d*4),1);
    }
    if(y%5===0){
      for(const edge of [left,right]){
        const w=1+Math.round(d*5);
        rect(c,'#787e69',edge-w,y,2*w,1+Math.round(d));
        rect(c,'#bcb59a',edge-w,y-1,w+1,1);
      }
    }
  }
  for(let i=0;i<78;i++){
    const y=75+random(100),x=random(WIDTH),d=(y-64)/112;
    rect(c,'#98876f',x,y,2+Math.round(d*5),1+Math.floor(d*1.3));
    rect(c,'#d2c19c',x+1,y-1,1+Math.round(d*3),1);
  }
  for(const side of [0,1]) for(let i=0;i<5;i++){
    const x=side?WIDTH-20-i*11:4+i*13, y=103+random(24);
    rect(c,'#3c4245',x,y-80,5,92);
    for(let j=0;j<55;j++) {
      const bx=x-34+random(64), by=y-136+random(70);
      rect(c,['#41484a','#634d4d','#8a574c','#b9704c','#d89a5e'][Math.min(4,Math.floor((by-y+142)/18))],bx,by,5+random(15),3+random(8));
    }
  }
  for(let i=0;i<105;i++){
    const x=random(WIDTH), y=162+random(15);
    rect(c,'#304746',x,y,2,4);
    rect(c,'#394e48',x-2,y-2,2,4);
    if(i%6===0) rect(c,'#df9b66',x-2,y-3,2,2);
  }
  for(const [x,color] of [[32,'#4d9d98'],[539,'#af625a']] as const){
    rect(c,'#3c3e40',x,103,2,32);
    rect(c,'#e1bd80',x,101,2,2);
    rect(c,color,x+2,104,12,7);
    rect(c,color,x+2,111,8,3);
  }
}

const apprentice=[
  '       00000       ','      0222220      ','     022322220     ','     022114110     ','      0111140      ','     00666600      ','    0655556660   09','   056559565110 090','   01105555500 090 ','    000888880 090  ','      0555550090   ','      055055070    ','      08800880     ','     0888008880    ','     0000000000    '];
const gale=[
  '       000000      ','    000a333230     ','    0aa33322220    ','      03114110     ','       011110      ','    00066666000    ','   0565555555660   ','  06511955591160   ','  01110055501110   ','   000088888000    ','      0555550      ','     055505550     ','    08880 08880    ','    09980 08990    ','    00000 00000    '];
const goblin=[
  '        00000     ','  00   0223220  00','  0220023322200220','   02223111322220 ','    0021a41a1200  ','      01141110    ','     021a11a120   ','   002222222220   ','  02120555550210  ','  01100559500110  ','   000088888000   ','      0222220     ','     022002220    ','    08880 08880   ','    00000 00000   '];
const troll=[
  '       0000       ','     00222200     ','    0223332220    ','    0231414120    ','   022111111220   ','  02211a11a11220  ',' 0222222222222220 ','021220522250221120','011100555555001110',' 000 05599550 000 ','     02222220     ','    0222002220    ','    01110 01110   ','    00000 00000   '];
const minotaur=[
  '  00        00   ','  0a0      0a0   ','  09a000000a90   ','   0992222990    ','    02233220     ','    02411420     ','   0221111220    ','  022155551220   ',' 02222599522220  ',' 01120555502110  ','  000088880000   ','     022220      ','    02200220     ','    08800880     ','   0000000000    '];
const lord=[
  '     00 00 00     ','     09099090     ','     09999990     ','      022220      ','      0a44a0      ','    0055555500    ','   055695596550   ','   055555555550   ','   011099990110   ','   055555555550   ','  05555555555550  ',' 0555555555555550 ',' 0000000000000000 '];
const palette:Record<string,string>={'0':'#26333d','1':'#ecc59e','2':'#724e42','3':'#c48453','4':'#493b3e','5':'#417b83','6':'#9fccb2','7':'#9c713e','8':'#514e55','9':'#f5d69d','a':'#fff3c7'};

const sprites:Record<string,string[]>={A01:apprentice,A04:gale,L01:gale,L02:apprentice,L03:lord,M01:goblin,M04:troll,M06:minotaur,M10:lord,M11:lord};
export function figure(c:Brush,id:string,x:number,ground:number,rest:boolean,scale:number) {
  const human=!id.startsWith('M');
  const rows=sprites[id]??(human?apprentice:goblin);
  const colors=human?(id==='L02'?{...palette,'5':'#9e4e46','6':'#d6986c'}:id==='L03'||id==='A04'?{...palette,'2':'#c6b599','3':'#efe1bd','5':'#575674','6':'#9985a2'}:palette):
    {...palette,'1':'#acc67b','2':id==='M01'?'#647949':id==='M04'?'#7f7066':'#796374','3':'#c1ba68','5':'#775345'};
  const size=scale*(id==='M01'?.87:id==='M06'?1.15:id==='M10'?1.28:1);
  const bottom=ground+(rest?2:0);
  rect(c,'#555a53',x-14,ground-1,28,3);
  rows.forEach((row,iy)=>Array.from(row).forEach((key,ix)=>{
    if(key===' ')return;
    // Resting figures crouch and lower the sword arm.
    const offsetY=rest&&ix>=13?2:0;
    const left=Math.round(x+(ix-9)*size), right=Math.round(x+(ix-8)*size);
    const dy=(iy-rows.length+offsetY)*(rest?.8:1);
    const top=Math.round(bottom+dy*size), end=Math.round(bottom+(dy+(rest?.8:1))*size);
    rect(c,colors[key as keyof typeof colors],left,top,Math.max(1,right-left),Math.max(1,end-top));
  }));
}

export type HuntFigure={id:string;x:number;hunter:boolean;rest:boolean;lost:boolean};
export function paintBattle(c:Brush,background:HTMLCanvasElement,figures:HuntFigure[],monster:string,won:boolean,t:number){
  c.drawImage(background,0,0);
  if(t===0)paintTargetArrow(c,figures.filter(f=>f.hunter).map(f=>({x:f.x,y:FLOOR,scale:2.3})),{x:MONSTER_X,y:FLOOR,scale:2.6});
  const lunge=t<.22?t/.22:t<.36?1:t<.64?1-(t-.36)/.28:0;
  for(const f of figures){
    if(f.lost&&t>=.67)continue;
    const partnerOffset=figures.filter(v=>v.hunter).length>1&&f.id==='A04'?26:0;
    const x=f.x+(f.hunter?lunge*(MONSTER_X-f.x-28-partnerOffset):0);
    figure(c,f.id,x,FLOOR-(f.hunter?Math.sin(lunge*Math.PI)*5:0),f.rest&&t>=.64,2.3);
  }
  if(!won||t<.53)figure(c,monster,MONSTER_X+(t>.22&&t<.4?4:0),FLOOR,false,2.6);
  if(t>.22&&t<.41){
    for(let i=0;i<8;i++){
      rect(c,i%2?'#ffeeb6':'#fbb96b',MONSTER_X-22+i*3,128-i*2,6,2);
      rect(c,'#ffe6ad',MONSTER_X-12+i*2,119+i*2,4,1);
    }
  }
  if(won&&t>=.53&&t<1){
    const p=(t-.53)/.47,x=MONSTER_X+(52-MONSTER_X)*p,y=120+24*p-49*Math.sin(p*Math.PI);
    rect(c,'#313c41',x-5,y-7,12,16);rect(c,'#ebd08a',x-4,y-6,10,14);
    rect(c,'#628777',x-2,y-4,6,8);
  }
  // The pennant at the left edge marks the receiving farm.
  if(won&&t>=1){rect(c,'#393e40',46,136,12,15);rect(c,'#e6c988',47,137,10,13);rect(c,'#6c8d71',49,139,6,7);}
}
