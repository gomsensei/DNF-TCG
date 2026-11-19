type Point={x:number;y:number;scale:number};

// Draw on the ground layer, before the figures, so the arc never hides a face.
export function paintTargetArrow(c:CanvasRenderingContext2D,sources:Point[],target:Point){
  c.save();
  c.lineJoin='round';
  c.lineCap='round';
  function ring(p:Point,color:string){
    c.beginPath();
    c.ellipse(p.x,p.y+1,Math.max(11,p.scale*9),4,0,0,Math.PI*2);
    c.strokeStyle='#473332';c.lineWidth=3.4;c.stroke();
    c.strokeStyle=color;c.lineWidth=1.7;c.stroke();
  }
  ring(target,'#ff9877');
  sources.forEach(p=>ring(p,'#ffe3a0'));
  const source=sources[0];
  if(source){
    const dir=Math.sign(target.x-source.x)||1;
    const start={x:source.x+dir*source.scale*6,y:source.y-1};
    const end={x:target.x-dir*target.scale*9,y:target.y-6};
    const mid={x:(start.x+end.x)/2,y:Math.min(start.y,end.y)-Math.min(32,Math.abs(end.x-start.x)*.16)};
    const join={x:(start.x+2*mid.x+end.x)/4,y:(start.y+2*mid.y+end.y)/4};
    for(const p of sources.slice(1)){
      c.beginPath();c.moveTo(p.x+dir*p.scale*6,p.y);
      c.quadraticCurveTo((p.x+join.x)/2,join.y-3,join.x,join.y);
      c.lineWidth=3;c.strokeStyle='#603a34';c.stroke();
      c.lineWidth=1.5;c.strokeStyle='#f6ba7b';c.stroke();
    }
    const angle=Math.atan2(end.y-mid.y,end.x-mid.x);
    const base={x:end.x-8*Math.cos(angle),y:end.y-8*Math.sin(angle)};
    c.beginPath();c.moveTo(start.x,start.y);c.quadraticCurveTo(mid.x,mid.y,base.x,base.y);
    c.lineWidth=5;c.strokeStyle='#65322f';c.stroke();
    c.lineWidth=3;c.strokeStyle='#f57752';c.stroke();
    c.translate(end.x,end.y);c.rotate(angle);
    c.beginPath();c.moveTo(0,0);c.lineTo(-11,-5);c.lineTo(-8,0);c.lineTo(-11,5);c.closePath();
    c.lineWidth=2;c.strokeStyle='#65322f';c.stroke();c.fillStyle='#ffbb7d';c.fill();
  }
  c.restore();
}
