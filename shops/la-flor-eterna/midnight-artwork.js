/* Midnight reference artwork; stored stems and anchors remain editable. */
(function(g){'use strict';
const lily={url:'assets/client/midnight-oct20/lily-magenta.png',width:1308,height:1202};
const thistle={url:'assets/client/midnight-oct20/thistle-blue.png',width:1312,height:1199,crown:[.54,.45],base:[.50,.88]};
const meta=g.NEBULA_META,m=meta.flowers.blue_thistle;
Object.assign(meta.finishes['blue-thistle'],thistle);
Object.assign(m,{head:thistle.url,headWidth:thistle.width,headHeight:thistle.height,classicBloom:thistle.url,classicBlooms:[thistle.url],bloomWidth:thistle.width,bloomHeight:thistle.height});
Object.assign(g.NebulaConfig.CAT.blue_thistle,{top:false,classicOffered:false});
const valid=g.NebulaSpooky.validFinishes,extras=g.NebulaSpooky.extras;
g.NebulaSpooky.validFinishes=s=>valid(s.mode==='dome'?s:{...s,finishes:{...s.finishes,thistleCount:0}});
// Retired option: accept old links, then remove both legacy stems and accents.
function retire(s){
 if(!s)return s;
 for(const n of s.items.filter(n=>n.id==='blue_thistle'))g.NebulaModel.remove(s,n.uid);
 s.finishes.thistleCount=0;
 if(s.finishes.studio)delete s.finishes.studio.thistles;
 return s;
}
function thistleCount(){return 0;}
g.NebulaSpooky.extras=s=>s.mode==='dome'?extras(s).filter(n=>n.id!=='thistleCount'):[];
const active=s=>g.NebulaClassic.active(s);
function flower(s,n){
 if(!active(s)||n.id!=='lily')return n;
 const w=n.d*.98;
 return {...n,url:lily.url,w,h:w*lily.height/lily.width,flipX:n.x>400,rot:(n.x-360)/450+Math.sin(Number(n.uid.slice(1))*2.4)*.17,z:n.y+68};
}
g.NebulaMidnightArt={lily,thistle,active,flower,thistleCount,retire};
})(window);
