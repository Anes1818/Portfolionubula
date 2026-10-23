/* Pink Celebration: independent authored stems, not a flattened photo. */
(function(g){'use strict';
const root='assets/client/',bud=root+'celebration/lily-bud.png';
const active=s=>s?.mode==='classic'&&s.finishes.roseArtwork==='celebration-v1';
const C=NebulaConfig.CAT,meta=NEBULA_META;
C.lily_bud={...C.lily,en:'Pink lily bud',es:'Capullo de lirio rosa',classicDiameter:75,topDiameter:65,classic:true,classicOffered:true};
meta.flowers.lily_bud={head:bud,headWidth:1024,headHeight:1536,headRadius:.42,classicAvailable:true,classicBloom:bud,bloomWidth:1024,bloomHeight:1536};
const assets=s=>active(s)?[bud,root+'celebration/lily-pink.png',root+'lily-family/rose-ivory-open-a.webp',root+'lily-family/rose-ivory-open-b.webp',root+'lily-family/eucalyptus-edge.webp',root+'pink-family/rose-blush-open-a.png',root+'pink-family/rose-blush-open-b.png']:[];
function flowers(s,sc){if(!active(s))return;sc.nodes=sc.nodes.map(n=>{
 const k=Number(n.uid.slice(1));let url=n.url,w=n.w,h=n.h,rot=n.rot,z=n.y;
 if(n.id==='lily'){url=root+'celebration/lily-pink.png';w=174;h=174;rot=(n.x-360)/800;z=n.y+42;}
 else if(n.id==='lily_bud'){w=65;h=135;rot=n.y<260?(n.x-360)/1100:Math.atan2(n.y-410,n.x-360)+Math.PI/2;z=n.y+5;}
 else if(n.id==='rose_cream'){url=root+'lily-family/rose-ivory-open-'+(k%2?'a':'b')+'.webp';w=91;h=86;rot=Math.sin(k*2.4)*.25;}
 else if(n.id==='rose_pink'){url=root+'pink-family/rose-blush-open-'+(k%2?'a':'b')+'.png';w=87;h=73;rot=Math.sin(k)*.25;}
 else if(n.id==='eucalyptus'){url=root+'lily-family/eucalyptus-edge.webp';w=124;h=154;rot=Math.atan2(n.y-400,n.x-360)+2.15;z=n.y+12;}
 return {...n,url,w,h,d:Math.max(w,h)*.8,rot,z,flipX:n.x>360};
 });}
function create(){const M=NebulaModel,s=M.empty();s.title='Pink Celebration';s.frames.classic=NebulaClassic.frame();
 Object.assign(s.finishes,{roseArtwork:'celebration-v1',paper:'custom',tint:'#e88db5',studio:{v:1,wrap:'blush-layered',breath:0,sprays:4},ribbon:'none'});
 const add=(id,points)=>points.forEach(([x,y])=>{const n=M.newItem(s,id);n.anchors.classic={x,y,manual:true};s.items.push(n);});
 add('rose_cream',[[274,300],[345,287],[410,305],[245,365],[318,350],[389,365],[454,360],[270,428],[344,425],[415,430],[235,490],[310,493],[385,500],[285,555],[365,561],[310,610]]);
 add('rose_pink',[[240,312],[456,310],[448,476],[390,603]]);
 add('lily',[[211,264],[365,248],[498,360],[525,438],[428,604]]);
 add('lily_bud',[[265,175],[467,139],[394,184],[174,414],[162,527],[531,551],[328,610]]);
 add('eucalyptus',[[338,146],[522,235],[155,328],[570,424],[173,577],[523,610],[251,610]]);
 s.finishes.decorations=[{id:'satin_bow',x:-.28,y:.13,scale:1.16,rotation:-40,layer:'front'}];return s;}
g.NebulaCelebration={active,assets,flowers,create};
NebulaClassic.recipes.push({id:'pink-celebration',en:'Pink Celebration',es:'Celebración rosa',description:'Pink lilies and buds, ivory and blush roses, eucalyptus and layered pink paper.',count:39,preview:true});
const previous=NebulaClassic.create;NebulaClassic.create=id=>id==='pink-celebration'?create():previous(id);
})(window);
