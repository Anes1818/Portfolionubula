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
function thistleCount(s){
 if(s.finishes.studio?.thistles===undefined)return s.finishes.thistleCount||0;
 if(!s.finishes.studio.thistles)return 0;
 const n=s.items.filter(n=>g.NebulaConfig.CAT[n.id]?.kind==='flower').length;
 return n?Math.min(16,Math.ceil(Math.sqrt(n)*1.6)):0;
}
g.NebulaSpooky.extras=s=>{
 const lines=s.mode==='dome'?extras(s).filter(n=>n.id!=='thistleCount'):[],count=thistleCount(s);
 return count?lines.concat({id:'thistleCount',quantity:count,totalCents:count*g.NebulaConfig.CONFIG.extrasCents.thistleCount}):lines;
};
const active=s=>g.NebulaClassic.active(s);
function flower(s,n){
 if(!active(s)||n.id!=='lily')return n;
 const w=n.d*.98;
 return {...n,url:lily.url,w,h:w*lily.height/lily.width,flipX:n.x>400,rot:(n.x-360)/450+Math.sin(Number(n.uid.slice(1))*2.4)*.17,z:n.y+68};
}
g.NebulaMidnightArt={lily,thistle,active,flower,thistleCount};
})(window);
