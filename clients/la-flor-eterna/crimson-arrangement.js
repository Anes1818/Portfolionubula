/* Crimson Velvet: authored anchors, independent blooms, reusable smoke wrap. */
(function(g){'use strict';
const root='assets/client/crimson-velvet/';
const wrap={url:root+'smoke-wrap.png',width:1122,height:1402};
const rose={url:root+'rose-crimson.png',width:1024,height:1024};
// One current red-rose photograph throughout the picker and all bouquet modes.
// Preserve the existing item ID so saved designs, quantities and prices survive.
Object.assign(g.NEBULA_META.flowers.rose_red,{
 head:rose.url,headWidth:1024,headHeight:1024,heads:[rose.url],
 classicBloom:rose.url,classicBlooms:[rose.url],bloomWidth:1024,bloomHeight:1024,
 domeHeads:[rose.url],domeEdgeHeads:[],domeStyle:'natural',romanceHeads:[rose.url,rose.url]
});
const active=s=>s?.mode==='classic'&&s.finishes.roseArtwork==='crimson-classic-v1';
function assets(s){return active(s)&&s.items.some(n=>n.id==='rose_red')?[rose.url]:[];}
function flowers(s,sc){
 if(!active(s))return;
 sc.nodes=sc.nodes.map(n=>{
  if(n.id!=='rose_red')return n;
  const k=Number(n.uid.slice(1));
  // Keep the authored arrangement, using the same current rose throughout.
  const w=112+(k%3-1)*5;
  return {...n,url:rose.url,w,h:w*rose.height/rose.width,d:w,flipX:n.x>360,rot:(n.x-360)/1600+Math.sin(k*2.4)*.10,z:n.y};
 });
}
function paper(s,f){
 const w=630,h=w*wrap.height/wrap.width,x=f.center.x,y=455;
 const back={uid:'paper',url:wrap.url,x,y,w,h,d:w,rot:0,bright:1,untinted:s.finishes.paper==='ivory'||s.finishes.paper==='black'};
 const front={...back,uid:'paper-front',petalMask:'M 182 601 L 260 684 L 340 720 L 410 746 L 491 786 L 560 824 L 650 753 L 756 728 L 850 664 L 978 529 L 1122 1402 L 0 1402 Z',maskWidth:1122,maskHeight:1402};
 if(!back.untinted){front.paperTone=s.finishes.paper;front.paperTint=s.finishes.tint;}
 return {back,front};
}
function create(){
 const M=g.NebulaModel,s=M.empty();s.title='Crimson Velvet';s.frames.classic=g.NebulaClassic.frame();
 Object.assign(s.finishes,{roseArtwork:'crimson-classic-v1',paper:'black',studio:{v:1,wrap:'smoke-upright',breath:2},ribbon:'none'});
 const points=[[249,215],[333,195],[407,223],[474,241],[207,296],[289,277],[370,300],[448,308],[507,334],[218,378],[305,359],[386,378],[467,396],[510,416],[255,451],[338,438],[416,465],[476,475],[318,514],[398,524]];
 s.items=points.map(([x,y])=>{const n=M.newItem(s,'rose_red');n.anchors.classic={x,y,manual:true};return n;});
 const d=g.NebulaDetails.types.satin_black;
 s.finishes.decorations=[{id:'satin_black',x:d.x,y:d.y,scale:.94,rotation:-4,layer:'front'}];
 return s;
}
g.NebulaCrimson={active,assets,flowers,paper,create,wrap,rose};
g.NebulaClassic.recipes.push({id:'crimson-velvet',en:'Crimson Velvet',es:'Terciopelo carmesí',description:'Red roses, airy white accents and smoke-black wrapping.',count:20,preview:true});
const original=g.NebulaClassic.create;
g.NebulaClassic.create=id=>id==='crimson-velvet'?create():original(id);
})(window);
