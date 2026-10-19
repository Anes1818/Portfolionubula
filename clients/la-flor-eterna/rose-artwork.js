/* An opt-in photographic finish in the existing editor. No new layout or count.
   The finish is serialized, so old designs keep their original artwork. */
(function(g){'use strict';
const root='assets/client/pink-family/';
const names=['rose-blush-open-a','rose-blush-open-b','rose-blush-edge-left','rose-blush-edge-right'];
const sizes=[[647,551],[668,529],[570,514],[464,455]];
const cups=[[323/647,201/551],[342/668,190/529],[273/570,163/514],[271/464,136/455]];
const masks=[
 'M0 0H647V400L575 433L510 470L455 492L429 512L385 531L333 538L278 531L230 508L192 511L180 486L164 466L90 445L0 440Z',
 'M0 0H668V460L490 480L435 500L426 493L390 505L350 514L275 502L267 516L215 504L140 466L0 440Z',
 'M0 0H570V450L460 461L390 481L340 490L298 499L250 496L216 486L193 491L130 480L0 430Z',
 'M0 0H464V390L360 418L300 432L245 438L210 443L161 435L120 414L82 401L55 385L0 380Z'
];
const urls=names.map(n=>root+n+'.png');
const referenceUrls=['rose-salmon-reference-center-v1','rose-salmon-reference-center-b-v1'].map(n=>root+n+'.png');
const paperUrl=root+'wrap-gingham-ivory-reference-v1.png';
const tuftUrl=root+'breath-compact-reference-v1.png';
const lilyUrl='assets/client/lily-family/lily-pink-open-a.webp';
const lilyTrial=s=>s?.finishes?.roseArtwork==='lily-study-v1';
const supported=s=>s?.mode==='dome'&&!s.photographic&&['organic','garden'].includes(s.template?.layout);
const active=s=>supported(s)&&s.finishes.roseArtwork==='blush-v1';
const reference=s=>supported(s)&&['reference-v1','reference-v2','reference-v3','lily-study-v1','lily-mixed-v1'].includes(s.finishes.roseArtwork);
const compact=s=>reference(s)&&['reference-v2','reference-v3'].includes(s.finishes.roseArtwork);
const mixed=s=>reference(s)&&s.finishes.roseArtwork==='reference-v3';
function assets(s){return reference(s)?[...referenceUrls,...(g.NebulaLily?.active(s)||s.finishes.roseArtwork==='reference-v3'?urls:[]),paperUrl,...(g.NebulaLily?.assets(s)||[]),...(lilyTrial(s)&&s.items.some(n=>n.id==='lily')?[lilyUrl]:[]),...(compact(s)&&s.finishes.fillerCount?[tuftUrl]:[]),...(mixed(s)&&s.finishes.fillerCount?['assets/fall/breath-airy.webp','assets/fall/breath-wide.webp']:[])]:active(s)&&s.items.some(n=>n.id==='rose_pink')?urls:[];}
function paper(s,f){
 if(g.NebulaLily?.active(s))return NebulaLily.paper(s,f);
 if(!reference(s)||s.finishes.paper!=='ivory'||s.finishes.collar===false)return null;
 const w=(f.radius+f.unit*.42)*2.75;
 return {uid:'paper',url:paperUrl,x:f.center.x,y:f.center.y+f.unit*.14,w,h:w,d:w,rot:0,bright:1,untinted:true};
}
function apply(s,sc){
 if(reference(s)){
  sc.nodes=sc.nodes.map(n=>{
   if(lilyTrial(s)&&n.id==='lily')return {...n,url:lilyUrl,w:n.d*831/833,h:n.d,rot:Math.sin(n.slot*2.4)*.28,z:n.y+1000};
   if(n.id!=='rose_pink')return {...n,z:n.y+(['lily','sunflower'].includes(n.id)?1000:0)};
   if(g.NebulaLily?.active(s)||(s.finishes.roseArtwork==='reference-v3'&&(n.slot%3!==0||Math.abs(n.x-sc.frame.center.x)>sc.frame.radius*.70))){
    // The florist reference shows upright rose cups. Use actual oblique
    // photographs rather than rotating the face-on spiral used by Pink Promise.
    const edge=(n.x-sc.frame.center.x)/sc.frame.radius;
    const view=edge<-.65?2:edge>.65?3:n.slot%2,[mw,mh]=sizes[view],w=n.d*1.10;
    return {...n,url:urls[view],w,h:w*mh/mw,rot:edge*.18,z:n.y,flowerCup:cups[view],
     petalMask:masks[view],maskWidth:mw,maskHeight:mh};
   }
   const view=n.slot*7%5<2?0:1,w=n.d*(1.01+.095*Math.sin(n.slot*2.7));
   const edge=Math.min(1,Math.hypot(n.x-sc.frame.center.x,n.y-sc.frame.center.y)/sc.frame.radius);
   return {...n,url:referenceUrls[view],w,h:w*(view?753/774:790/782)*(1-.055*edge*edge),rot:Math.sin(n.slot*3.4)*.34,z:n.y+Math.sin(n.slot*1.8)*7};
  }).sort((a,b)=>a.z-b.z||a.slot-b.slot);
  if(g.NebulaLily?.active(s))NebulaLily.flowers(s,sc);
  return;
 }
 if(!active(s)||!s.items.some(n=>n.id==='rose_pink'))return;
 sc.nodes=sc.nodes.map(n=>{
  if(n.id!=='rose_pink')return {...n,z:n.y};
  const radius=sc.frame.radius,r=Math.hypot(n.x-360,n.y-390)/radius;
  const view=r>.82&&n.x<360-radius*.55?2:r>.82&&n.x>360+radius*.55?3:(n.slot*7%5<2?0:1);
  const [mw,mh]=sizes[view],w=n.d*1.15*(.94+.10*Math.sin(n.slot*2.7));
  return {...n,url:urls[view],w,h:w*mh/mw*.93,rot:Math.sin(n.slot*3.4)*.17,z:n.y+Math.sin(n.slot*1.8)*16,
   petalMask:masks[view],maskWidth:mw,maskHeight:mh};
 }).sort((a,b)=>a.z-b.z||a.slot-b.slot);
}
function complete(s,sc){
 if(!reference(s))return;
 if(g.NebulaLily?.active(s))NebulaLily.details(s,sc);
 // Real branching art is tucked into the depth order, rather than punched
 // around circular holes over the roses. Keep the requested sprig count.
 sc.filler=sc.filler.map((n,i)=>{
  if(!n.uid.startsWith('filler-'))return {...n,z:n.y,softDetail:true};
  if(compact(s)){
   const w=sc.frame.unit*(.44+.045*Math.sin(i*2.7));
   return {...n,url:tuftUrl,w,h:w*588/618,d:w,rot:Math.sin(i*2.4+s.seed)*.8,z:n.y+sc.frame.unit*.35,softDetail:true,protectCenters:true};
  }
  const scale=i%3===0?1.24:i%3===1?1.08:.94;
  return {...n,w:n.w*scale,h:n.h*scale,rot:Math.sin(i*2.4+s.seed)*.65,z:n.y+sc.frame.unit*.15,softDetail:true,protectCenters:true};
 });
 // One selected filler unit has two coordinated art layers, not two items.
 // The open branching layer sits behind its compact crown and nearby petals.
 const branches=mixed(s)?sc.filler.filter(n=>n.uid.startsWith('filler-')).map((n,i)=>{
  const m=NEBULA_META.finishes[i%2?'breath-wide':'breath-airy'];
  const angle=n.rot+(i%2?-.5:.5),w=sc.frame.unit*(.76+.08*Math.sin(i*1.7));
  return {...n,uid:n.uid+'-branch',parentFiller:n.uid,url:m.url,
   x:n.x+Math.sin(angle)*sc.frame.unit*.10,y:n.y-sc.frame.unit*.08,
   w,h:w*m.height/m.width,d:w,rot:angle,z:n.y+sc.frame.unit*.12};
 }):[];
 sc.layeredFlowers=[...sc.nodes,...branches,...sc.filler,...sc.greenery.map(n=>({...n,z:n.z??n.y,softDetail:true}))].sort((a,b)=>a.z-b.z);
 const mask=sc.finishes.find(n=>n.uid==='scream-mask');
 // Satin bows belong on the flower face; only character props need face clearance.
 const toys=sc.finishes.filter(n=>(n.detailId&&n.detailId!=='satin_bow')||n.uid==='pumpkin');
 for(const toy of toys){
  for(const flower of sc.nodes.filter(n=>['lily','sunflower'].includes(n.id))){
   if(Math.abs(toy.x-flower.x)<toy.w*.5+flower.w*.15&&Math.abs(toy.y-flower.y)<toy.h*.5+flower.h*.15){
    toy.y=Math.min(toy.y,flower.y-flower.h*.18-toy.h*.5-8);
   }
  }
 }
 if(mask){
  for(const toy of toys){
   if(Math.abs(toy.x-mask.x)<(toy.w+mask.w)*.5+8&&Math.abs(toy.y-mask.y)<(toy.h+mask.h)*.5){
    const side=toy.x<mask.x?-1:1;
    toy.x=mask.x+side*((mask.w+toy.w)*.5+10);
   }
  }
  // The mask's reserved flower positions extend beyond the ordinary dome.
  if(sc.collar?.untinted){
   const radius=Math.max(...sc.nodes.map(n=>Math.hypot(n.x-sc.frame.center.x,n.y-sc.frame.center.y)+Math.max(n.w,n.h)*.4));
   sc.collar.w=sc.collar.h=Math.max(sc.collar.w,radius*2.3);
  }
 }
 const sash=sc.finishes.find(n=>n.uid==='sash');
 if(sash){
  const halfHeight=Math.abs(Math.sin(sash.rot))*sash.w/2+Math.abs(Math.cos(sash.rot))*sash.h/2;
  // Keep the banner below toy faces while allowing it over their lower bodies.
  for(const toy of toys)if(Math.abs(toy.x-sash.x)<(toy.w+sash.w)*.5&&sash.y-halfHeight<toy.y&&sash.y+halfHeight>toy.y-toy.h*.5)sash.y=Math.max(sash.y,toy.y+halfHeight+8);
  sc.finishes=sc.finishes.filter(n=>n!==sash).concat(sash);
 }
}
let panel,busy=false;
function renderControls(s,lang,ready){
 const host=document.getElementById('panel-flowers');if(!host||!NEBULA_SHOP.demo)return;
 if(!panel){
  panel=document.createElement('div');panel.className='rose-artwork-control';panel.id='roseArtworkControl';
  const label=document.createElement('span');label.className='size-label';panel.append(label);
  const buttons=document.createElement('div');buttons.className='rose-artwork-buttons';panel.append(buttons);
  for(const value of ['original','blush-v1','reference-v3','lily-mixed-v1']){
   const b=document.createElement('button');b.type='button';b.dataset.roseArtwork=value;
   b.onclick=async()=>{
    if(busy)return;busy=true;renderControls(NebulaApp.state,NebulaApp.lang,false);
    try{
     const next=NebulaApp.state;if(value==='original')delete next.finishes.roseArtwork;else next.finishes.roseArtwork=value;
     await NebulaRenderer.awaitAssets(next);
     const current=NebulaApp.state;if(!supported(current))return;
     if(value==='original')delete current.finishes.roseArtwork;else current.finishes.roseArtwork=value;
     NebulaApp.setState(current);panel.querySelector('[role=status]').textContent='';
    }catch{panel.querySelector('[role=status]').textContent=NebulaApp.lang==='es'?'No se pudieron cargar las rosas. Inténtalo de nuevo.':'Could not load the roses. Please try again.';}
    finally{busy=false;renderControls(NebulaApp.state,NebulaApp.lang,NebulaApp.ready);}
   };buttons.append(b);
  }
  const status=document.createElement('small');status.setAttribute('role','status');panel.append(status);host.prepend(panel);
 }
 panel.hidden=!supported(s)||!s.items.some(n=>n.id==='rose_pink');
 panel.firstChild.textContent=lang==='es'?'COMPARAR ROSAS':'COMPARE ROSES';
 for(const b of panel.querySelectorAll('button')){
  const value=b.dataset.roseArtwork;
  b.textContent=value==='reference-v3'?(lang==='es'?'Rosas + papel vichy':'Roses + gingham'):lang==='es'?(value==='blush-v1'?'Rosas nuevas':'Original'):(value==='blush-v1'?'New roses':'Original');
  if(value==='lily-mixed-v1')b.textContent=lang==='es'?'Lirios + durazno':'Lilies + peach';
  b.setAttribute('aria-pressed',String(value===(s.finishes.roseArtwork||'original')));b.disabled=!ready||busy;
 }
}
g.NebulaRoseArt={active,reference,supported,assets,apply,complete,paper,renderControls};
})(window);
