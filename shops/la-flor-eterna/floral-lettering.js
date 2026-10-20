/* A floral initial has a consistent cap height and an organic blossom edge.
   Its geometry is independent of font width, saved scale and bouquet size. */
(function(g){'use strict';
const art='assets/client/lettering-oct20/white-florets.png';
const glyphs=new Map(),painted=new Map();
function glyph(letter){
 if(glyphs.has(letter))return glyphs.get(letter);
 const probe=document.createElement('canvas').getContext('2d');
 probe.font='700 440px Arial, sans-serif';
 const metrics=probe.measureText(letter),cap=metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent,k=420/cap,pad=28;
 const w=Math.ceil((metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight)*k+pad*2),h=476;
 const mask=document.createElement('canvas');mask.width=w;mask.height=h;
 const c=mask.getContext('2d',{willReadFrequently:true});
 c.font=probe.font;c.translate(pad+metrics.actualBoundingBoxLeft*k,pad+metrics.actualBoundingBoxAscent*k);c.scale(k,k);c.fillText(letter,0,0);
 const data=mask.getContext('2d').getImageData(0,0,w,h).data,points=[];
 // Hexagonal spacing and deterministic jitter avoid mechanical horizontal rows.
 for(let row=0,y=pad+3;y<h-pad;y+=15,row++)for(let x=pad+3+(row%2)*8;x<w-pad;x+=17){
  const xx=x+Math.sin(x*1.7+y*.9)*2,yy=y+Math.cos(x*.8-y*1.3)*2;
  if(data[(Math.round(yy)*w+Math.round(xx))*4+3]>150)points.push({x:xx,y:yy,turn:Math.sin(x*.7+y*1.3)*Math.PI,size:25+Math.sin(x*2+y)*3});
 }
 const result={w,h,points};glyphs.set(letter,result);return result;
}
function initialCanvas(letter,R){
 if(painted.has(letter))return painted.get(letter);
 const im=R.image(art);if(!im)return null;
 const g=glyph(letter),cv=document.createElement('canvas');cv.width=g.w;cv.height=g.h;const c=cv.getContext('2d');
 // Place whole photographed clusters, not clipped pieces of a printed letter.
 for(const p of g.points){c.save();c.translate(p.x,p.y);c.rotate(p.turn);c.drawImage(im,-p.size/2,-p.size/2,p.size,p.size);c.restore();}
 painted.set(letter,cv);return cv;
}
function initialNode(s,f){
 const a=s.finishes;if(s.mode==='classic'||!a.initial||!s.items.length)return null;
 const letter=glyph(a.initial),flowers=g.NebulaGeometry.nodes(s).nodes.filter(n=>!n.decorative);
 if(!flowers.length)return null;
 const left=Math.min(...flowers.map(n=>n.x-n.w*.48)),right=Math.max(...flowers.map(n=>n.x+n.w*.48));
 const top=Math.min(...flowers.map(n=>n.y-n.h*.48)),bottom=Math.max(...flowers.map(n=>n.y+n.h*.48));
 let h=Math.min(f.radius*1.55,(bottom-top)*.72)*a.initialScale,w=h*letter.w/letter.h;
 if(w>(right-left)*.78){h*=(right-left)*.78/w;w=(right-left)*.78;}
 const x=(left+right)/2;
 let y=top+(bottom-top)*(s.mode==='heart'?.43:.5)+a.initialOffset*f.radius;
 // Keep a complete letter inside the flower canopy at either slider extreme.
 y=Math.max(top+h*.5,Math.min(bottom-h*.5,y));
 const sample=letter.points.filter((_,i)=>i%3===0);
 const covered=(w,h)=>sample.filter(p=>{
  const px=x+(p.x/letter.w-.5)*w,py=y+(p.y/letter.h-.5)*h;
  return flowers.some(n=>{const dx=px-n.x,dy=py-n.y,c=Math.cos(n.rot||0),sn=Math.sin(n.rot||0);return ((dx*c+dy*sn)/(n.w*.58))**2+((-dx*sn+dy*c)/(n.h*.58))**2<=1;});
 }).length/Math.max(1,sample.length);
 for(let i=0;i<8&&covered(w,h)<.98;i++){w*=.94;h*=.94;}
 return {uid:'floral-initial',url:'initial '+a.initial,x,y,w,h,d:h,rot:0,bright:1,z:600};
}
g.NebulaRomance.initialCanvas=initialCanvas;
g.NebulaRomance.initialNode=initialNode;
g.NebulaFloralLettering={glyph,initialCanvas,initialNode};
})(window);
