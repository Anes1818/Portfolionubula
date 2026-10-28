/* Each point is exactly one physical note; no hidden repetitions or filler. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RayMoney=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 function layout(count,mode='dome'){
  if(!['dome','heart'].includes(mode)||!Number.isInteger(count)||count<1||count>100)throw Error('Use 1–100 notes in Buchón or Heart.');
  const rings=Math.max(2,Math.round(Math.sqrt(count/3))),core=Math.min(7,count),out=[];
  const point=(angle,radius,ring)=>{if(mode==='heart'){const scale=radius/190;return {x:360+Math.pow(Math.sin(angle),3)*205*scale,y:390-(13*Math.cos(angle)-5*Math.cos(2*angle)-2*Math.cos(3*angle)-Math.cos(4*angle))*13*scale,rot:angle,ring};}return {x:360+Math.cos(angle)*radius,y:390+Math.sin(angle)*radius,rot:angle+Math.PI/2,ring};};
  for(let i=0;i<core;i++){const p=point((i-1)/Math.max(1,core-1)*Math.PI*2-Math.PI/2,i?42:0,0);out.push({...p,w:53,h:80});}
  let left=count-core;const weights=rings*(rings+1)/2-1;
  for(let ring=1;ring<rings;ring++){const n=ring===rings-1?left:Math.min(left,Math.round((count-core)*(ring+1)/weights));left-=n;const radius=95+(ring-1)/Math.max(1,rings-2)*95,h=140*(.62+.38*ring/(rings-1));for(let i=0;i<n;i++)out.push({...point(i/Math.max(1,n)*Math.PI*2+(ring%2?Math.PI/Math.max(1,n):0)-Math.PI/2,radius,ring),w:h*2/3,h});}
  return out.reverse();
 }
 return {layout};
});
