/* Local photographic study. Versioned separately from every legacy recipe.
   A flower item is a provisional rose stem; filler sprites are children of one
   unpriced inclusion. Paper is an explicitly temporary vector material study. */
(function(g){'use strict';
const id='lfe-pink-gingham',version=2,root='assets/client/pink-family/';
const views=[['rose-blush-open-a',647,551],['rose-blush-open-b',668,529],['rose-blush-edge-left',570,514],['rose-blush-edge-right',464,455]];
for(const [name,w,h] of views)NEBULA_META.crops[root+name+'.png']=[0,0,w,h];
// Authored, uneven rows with depth. The arrangement never rerolls on UI edits.
const anchors=[
 [275,220,108],[365,203,113],[455,232,103],
 [217,285,115],[308,300,125],[408,276,124],[502,305,108],
 [175,365,111],[267,375,129],[362,357,128],[459,371,122],[543,390,104],
 [164,449,109],[255,462,127],[351,449,134],[445,463,132],[539,478,109],
 [189,532,114],[282,540,126],[383,530,130],[480,550,117],[554,556,92],
 [232,608,110],[331,618,125],[431,607,122],[512,621,99],
 [308,680,108],[413,673,111]
];
const compactAnchors=[[382,427,158],[323,438,149],[380,369,160],[381,481,156],[298,386,146],[435,398,155],[315,495,156],[344,326,144],[437,482,151],[258,430,155],[432,336,143],[360,539,147],[281,329,155],[481,431,143],[260,501,144],[382,284,154],[433,540,144],[226,383,141],[486,350,152],[310,565,145],[302,274,138],[499,488,149],[211,470,146],[440,273,137],[396,589,146],[223,319,147],[529,396,136],[249,561,143]];
const active=s=>s?.photographic?.id===id&&[1,2].includes(s.photographic.version);
function valid(p,s){return !!p&&Object.keys(p).every(k=>['id','version','paper','filler','adjustments'].includes(k))&&p.id===id&&[1,2].includes(p.version)&&s.mode==='dome'&&s.template?.capacity===anchors.length&&s.items.length===anchors.length&&s.items.every((it,i)=>it.id==='rose_pink'&&it.uid==='b'+(i+1))&&s.finishes.collar===false&&s.finishes.fillerCount===0&&s.finishes.greeneryCount===0&&!s.finishes.initial&&!s.finishes.butterfly&&!s.finishes.crown&&!s.finishes.greenRim&&!s.finishes.bow&&!s.finishes.pumpkin&&!s.finishes.spookyMask&&!s.finishes.spookyBow&&!s.finishes.ghostCount&&!s.finishes.thistleCount&&s.finishes.decorations.length===0&&s.finishes.sash==='none'&&s.finishes.ribbon==='none'&&(p.version===1?['gingham','ivory','none']:['none']).includes(p.paper)&&typeof p.filler==='boolean'&&p.adjustments&&typeof p.adjustments==='object'&&!Array.isArray(p.adjustments)&&Object.entries(p.adjustments).every(([uid,a])=>s.items.some(i=>i.uid===uid)&&Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)&&Math.abs(a[0])<=24&&Math.abs(a[1])<=24&&Math.abs(a[2])<=.35);}
function create(requestedVersion=version){const M=g.NebulaModel,s=M.defaultMode('dome');M.resize(s,anchors.length);s.template.palette=['rose_pink'];s.template.accent.count=0;s.template.overrides={};M.syncTemplate(s);s.title='Pink, in bloom';s.photographic={id,version:requestedVersion,paper:requestedVersion===1?'gingham':'none',filler:true,adjustments:{}};Object.assign(s.finishes,{fillerCount:0,collar:false,paper:'ivory'});return s;}
function scene(s){
 const nodes=s.items.map((it,i)=>{const [px,py,size]=(s.photographic.version===2?compactAnchors:anchors)[i],x=s.photographic.version===2?360+(px-360)*1.08:px,y=s.photographic.version===2?420+(py-420)*.85:py,a=s.photographic.adjustments[it.uid]||[0,0,0],edge=x<(s.photographic.version===2?255:235)?2:x>(s.photographic.version===2?470:485)?3:i%2,v=views[edge],w=size*(s.photographic.version===2?.91:1)*(.97+.06*Math.sin(i*7.1+s.seed));return {uid:it.uid,id:it.id,slot:it.slot,url:root+v[0]+'.png',x:x+a[0],y:y+a[1],w,h:w*v[2]/v[1],d:w,rot:Math.sin(i*3.7+s.seed)*.20+a[2],bright:1,z:s.photographic.version===2?y+a[1]+22*(1-Math.hypot((x-360)*.85,y-420)/220):y+a[1],view:edge};});
 const filler=[];
 if(s.photographic.filler){
  const spots=[[236,221],[410,210],[498,249],[165,298],[565,331],[141,392],[570,425],[153,481],[558,502],[191,569],[540,583],[263,653],[447,667],[312,232],[223,315],[348,306],[453,310],[205,392],[304,392],[404,394],[507,401],[217,478],[317,471],[413,481],[508,486],[272,552],[372,551],[468,561],[350,625]];
  spots.forEach(([sx,sy],i)=>{const x=s.photographic.version===2?360+(sx-360)*.80:sx,y=s.photographic.version===2?420+(sy-440)*.71:sy;const m=NEBULA_META.finishes[i%3?'breath-airy':'breath-wide'],w=79+(i%4)*7;filler.push({uid:'filler-child-'+i,itemId:'filler-inclusion',url:m.url,x,y,w,h:w*m.height/m.width,d:w,rot:Math.sin(i*2.4)*1.8,bright:1,z:nodes.reduce((best,n)=>Math.hypot(x-n.x,y-n.y)<Math.hypot(x-best.x,y-best.y)?n:best,nodes[0]).y-1});});
 }
 if(s.photographic.version===2&&s.photographic.filler){
  const gaps=[[287,303],[399,313],[470,380],[254,410],[346,397],[411,446],[289,484],[362,514],[455,523],[252,548],[343,579]];
  gaps.forEach(([x,y],i)=>{const m=NEBULA_META.finishes['breath-airy'],w=68+(i%3)*8;filler.push({uid:'filler-gap-'+i,itemId:'filler-inclusion',url:m.url,x,y,w,h:w*m.height/m.width,d:w,rot:Math.sin(i*1.8)*1.5,bright:1,z:nodes.reduce((best,n)=>Math.hypot(x-n.x,y-n.y)<Math.hypot(x-best.x,y-best.y)?n:best,nodes[0]).z+2});});
 }
 return {frame:{mode:'dome',engine:'lfe-photo-v1',center:{x:360,y:425},radius:250,unit:100},nodes,filler,greenery:[],finishes:[],slots:[],collar:null};
}
function assets(s){return [...new Set([...scene(s).nodes,...scene(s).filler].map(n=>n.url))];}
function sheet(c,points,gingham,angle=0){
 c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.shadowColor='#73513c25';c.shadowBlur=9;c.shadowOffsetY=4;c.fillStyle='#f6ead6';c.fill();c.shadowColor='transparent';c.clip();
 const shade=c.createLinearGradient(110,120,580,740);shade.addColorStop(0,'#fff8e9');shade.addColorStop(.52,'#ecdfc5');shade.addColorStop(.75,'#fff9e9');shade.addColorStop(1,'#d7c4a3');c.fillStyle=shade;c.fillRect(0,0,720,820);
 if(gingham){c.save();c.translate(360,400);c.rotate(angle);c.fillStyle='#dc967355';for(let n=-900;n<900;n+=28){c.fillRect(n,-900,14,1800);c.fillRect(-900,n,1800,14);}c.restore();}
 c.restore();c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.strokeStyle='#fff8e680';c.lineWidth=1;c.stroke();c.restore();
}
function paper(c,s,front){if(s.photographic.version===2)return;if(s.photographic.paper==='none')return;const check=s.photographic.paper==='gingham';
 if(!front){
 sheet(c,[[204,122],[352,173],[452,548],[181,626],[98,286]],check,-.18);
 sheet(c,[[337,78],[518,242],[497,603],[242,532]],check,.31);
 sheet(c,[[472,136],[603,188],[641,475],[510,634],[354,418]],false);
 sheet(c,[[85,244],[235,267],[389,589],[177,657],[61,458]],false);
 sheet(c,[[596,313],[664,433],[609,638],[399,730],[415,511]],check,.21);
 sheet(c,[[126,460],[300,566],[491,694],[335,783],[133,672]],check,-.3);
 }else{
 sheet(c,[[125,570],[183,604],[294,684],[513,642],[462,731],[294,779]],check,-.27);
 sheet(c,[[433,695],[586,589],[601,655],[397,779],[331,747]],false);
 }
}
// Source-coordinate lower-petal masks hide the attachment neck inside the mound.
// They affect rendering only; inspected PNG masters remain unchanged.
const petalMasks=["M0 0H647V400L575 433L510 470L455 492L429 512L385 531L333 538L278 531L230 508L192 511L180 486L164 466L90 445L0 440Z","M0 0H668V460L490 480L435 500L426 493L390 505L350 514L275 502L267 516L215 504L140 466L0 440Z","M0 0H570V450L460 461L390 481L340 490L298 499L250 496L216 486L193 491L130 480L0 430Z","M0 0H464V390L360 418L300 432L245 438L210 443L161 435L120 414L82 401L55 385L0 380Z"];
function bloom(c,n,drawNode,opts){const matrix=c.getTransform(),v=views[n.view];c.save();c.translate(n.x,n.y);c.rotate(n.rot);c.scale(n.w/v[1],n.h/v[2]);c.translate(-v[1]/2,-v[2]/2);c.clip(new Path2D(petalMasks[n.view]));c.setTransform(matrix);drawNode(c,n,opts);c.restore();}
function draw(c,s,sc,drawNode,opts){if(!opts.alphaOnly)paper(c,s,false);const all=opts.alphaOnly?sc.nodes:[...sc.nodes,...sc.filler].sort((a,b)=>a.z-b.z);for(const n of all){const options={shadow:!opts.alphaOnly&&!n.itemId,alpha:opts.alphaOnly};if(s.photographic.version===2&&!n.itemId)bloom(c,n,drawNode,options);else drawNode(c,n,options);}if(!opts.alphaOnly)paper(c,s,true);if(opts.selected){const n=sc.nodes.find(n=>n.uid===opts.selected);if(n){c.save();c.strokeStyle='#76394e';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.ellipse(n.x,n.y,n.w*.56,n.h*.56,n.rot,0,Math.PI*2);c.stroke();c.restore();}}return sc;}
g.NebulaPhoto={active,valid,create,scene,assets,draw,id,version,boundsFor:s=>s.photographic.version===2?{x:120,y:185,w:490,h:485}:{x:45,y:60,w:635,h:735},bounds:{x:45,y:60,w:635,h:735}};
})(window);
