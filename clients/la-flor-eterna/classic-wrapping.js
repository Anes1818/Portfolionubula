/* One fitted transform per upright paper, shared by its front, back and tie. */
(function(g){'use strict';
const definitions={
 fan:{url:'assets/halloween/black-fan-wrap.webp',width:754,height:1042,opening:.78,rim:.50,neck:.765,top:0,bottom:1,mask:'M 0 440 Q 360 610 754 430 L 754 1042 L 0 1042 Z'},
 'ivory-upright':{url:'assets/classic/wrap-ivory-back.webp',front:'assets/classic/wrap-ivory-front.webp',width:896,height:1200,opening:.80,rim:.50,neck:.70,top:.14,bottom:.86,mask:'M 0 558 Q 448 650 896 558 L 896 1200 L 0 1200 Z'},
 'kraft-upright':{url:'assets/classic/wrap-kraft-back.webp',front:'assets/classic/wrap-kraft-front.webp',width:896,height:1200,opening:.80,rim:.50,neck:.70,top:.14,bottom:.86,mask:'M 0 558 Q 448 650 896 558 L 896 1200 L 0 1200 Z'},
 'yellow-upright':{url:'assets/client/refinements-oct19/wrap-butter-yellow.webp',width:700,height:893,opening:.80,rim:.375,neck:.68,top:0,bottom:1,mask:'M 78 292 Q 350 375 620 291 L 700 893 L 0 893 Z'},
 'smoke-upright':{url:'assets/client/crimson-velvet/smoke-wrap.png',width:1122,height:1402,opening:.78,rim:.585,neck:.70,top:.02,bottom:1,mask:'M 182 601 L 260 684 L 340 720 L 410 746 L 491 786 L 560 824 L 650 753 L 756 728 L 850 664 L 978 529 L 1122 1402 L 0 1402 Z'}
};
function layout(s,f){
 const k=g.NebulaCustomization.style(s),m=definitions[k]||definitions.fan;
 const ns=g.NebulaCustomization.classicFlowers(s,g.NebulaGeometry.nodes(s).nodes).filter(n=>!n.decorative&&g.NebulaConfig.CAT[n.id]?.kind!=='greenery');
 // Measure photographed cups, not just the number of stems. The center stays
 // fixed when a single bloom is dragged; only the envelope needs to grow.
 let half=110,bottom=f.center.y+55,diameter=100;
 if(ns.length){half=0;bottom=-Infinity;diameter=ns.reduce((sum,n)=>sum+n.d,0)/ns.length;
  for(const n of ns){const c=Math.abs(Math.cos(n.rot)),sn=Math.abs(Math.sin(n.rot));half=Math.max(half,Math.abs(n.x-f.center.x)+(n.w*c+n.h*sn)*.46);bottom=Math.max(bottom,n.y+(n.h*c+n.w*sn)*.43);}
 }
 const w=Math.max(300,Math.min(1000,(2*half+26)/m.opening)),h=w*m.height/m.width;
 const mouthY=bottom-diameter*.06,top=mouthY-m.rim*h,x=f.center.x,y=top+h/2;
 const natural=['fan','smoke-upright'].includes(k)?s.finishes.paper==='black'||(k==='smoke-upright'&&s.finishes.paper==='ivory'):s.finishes.paper==='ivory';
 const back={uid:'paper',url:m.url,x,y,w,h,d:w,rot:0,bright:1,untinted:natural,visibleTop:m.top,visibleBottom:m.bottom};
 const front={...back,uid:'paper-front',url:m.front||m.url,petalMask:m.mask,maskWidth:m.width,maskHeight:m.height};
 if(!natural){front.paperTone=s.finishes.paper;front.paperTint=s.finishes.tint;}
 return {back,front,neckY:top+m.neck*h,baseY:top+m.bottom*h,mouthY,width:w};
}
g.NebulaClassicWrapping={layout,definitions};
})(window);
