/* Pink Celebration: independent authored stems, not a flattened photo. */
(function(g){'use strict';
const root='assets/client/',bud=root+'celebration/lily-bud.png';
const active=s=>s?.mode==='classic'&&s.finishes.roseArtwork==='celebration-v1';
const C=NebulaConfig.CAT,meta=NEBULA_META;
C.lily_bud={...C.lily,en:'Pink lily bud',es:'Capullo de lirio rosa',classicDiameter:75,topDiameter:65,classic:true,classicOffered:true};
meta.flowers.lily_bud={head:bud,headWidth:1024,headHeight:1536,headRadius:.42,classicAvailable:true,classicBloom:bud,bloomWidth:1024,bloomHeight:1536};
const assets=s=>active(s)?[bud,root+'lily-family/lily-pink-open-a.webp',root+'lily-family/lily-pink-oblique-left.webp',root+'lily-family/rose-ivory-open-a.webp',root+'lily-family/rose-ivory-open-b.webp',root+'refinements-oct19/eucalyptus-silver-tip-v2.png',root+'pink-family/rose-blush-open-a.png',root+'pink-family/rose-blush-open-b.png']:[];
function flowers(s,sc){if(!active(s))return;sc.nodes=sc.nodes.map(n=>{
 const k=Number(n.uid.slice(1));let url=n.url,w=n.w,h=n.h,rot=n.rot,z=n.y;
 if(n.id==='lily'){const side=k%3!==0;url=root+'lily-family/'+(side?'lily-pink-oblique-left':'lily-pink-open-a')+'.webp';w=166+(k%3)*7;h=w*(side?729/801:833/831);rot=(n.x-360)/900+Math.sin(k*2.4)*.17;z=n.y+38;}
 else if(n.id==='lily_bud'){w=46;h=108;rot=n.y<300?(n.x-360)/650:Math.atan2(n.y-405,n.x-360)+Math.PI/2;z=n.y-48;}
 else if(n.id==='rose_cream'){url=root+'lily-family/rose-ivory-open-'+(k%2?'a':'b')+'.webp';w=108+(k%3)*4;h=w*.95;rot=Math.sin(k*2.4)*.25;}
 else if(n.id==='rose_pink'){url=root+'pink-family/rose-blush-open-'+(k%2?'a':'b')+'.png';w=108;h=87;rot=Math.sin(k)*.25;}
 else if(n.id==='eucalyptus'){url=root+'refinements-oct19/eucalyptus-silver-tip-v2.png';w=125;h=162;rot=Math.atan2(n.y-400,n.x-360)+Math.PI/2;z=n.y+18;}
 return {...n,url,w,h,d:Math.max(w,h)*.8,rot,z,flipX:n.x>360};
 });}
function create(){const M=NebulaModel,s=M.empty();s.title='Pink Celebration';s.frames.classic=NebulaClassic.frame();
 Object.assign(s.finishes,{roseArtwork:'celebration-v1',paper:'custom',tint:'#d4a0b4',studio:{v:1,wrap:'blush-layered',breath:0,sprays:6},ribbon:'none'});
 const add=(id,points)=>points.forEach(([x,y])=>{const n=M.newItem(s,id);n.anchors.classic={x,y,manual:true};s.items.push(n);});
 add('rose_cream',[[271,306],[333,292],[399,307],[242,363],[241,310],[371,360],[435,354],[266,413],[333,413],[454,308],[444,458],[303,475],[369,474],[282,526],[400,531],[310,573]]);
 add('rose_pink',[[306,350],[402,415],[237,470],[348,531]]);
 add('lily',[[200,317],[354,254],[494,352],[490,455],[382,558]]);
 add('lily_bud',[[252,235],[426,218],[462,277],[201,407],[200,500],[515,503],[329,587]]);
 add('eucalyptus',[[306,235],[507,283],[166,354],[548,433],[183,517],[472,558],[273,591]]);
 s.finishes.decorations=[{id:'satin_bow',x:-.40,y:.13,scale:.82,rotation:-24,layer:'front'}];return s;}
g.NebulaCelebration={active,assets,flowers,create};
NebulaClassic.recipes.push({id:'pink-celebration',en:'Pink Celebration',es:'Celebración rosa',description:'Pink lilies and buds, ivory and blush roses, eucalyptus and layered pink paper.',count:39,preview:true});
const previous=NebulaClassic.create;NebulaClassic.create=id=>id==='pink-celebration'?create():previous(id);
})(window);
