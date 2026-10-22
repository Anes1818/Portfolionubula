/* Client-only mixed lily art. Every bloom/spray is a real editable model item. */
(function(g){'use strict';
const root='assets/client/lily-family/',url=name=>root+name+'.webp';
const active=s=>s?.mode==='dome'&&s.finishes?.roseArtwork==='lily-mixed-v1';
const {CAT,CONFIG}=NebulaConfig;
CAT.white_flower_spray={en:'White flowering spray',es:'Rama de flores blancas',family:'accents',color:null,priceCents:350,classicDiameter:126,topDiameter:98,kind:'flower',classic:false,classicOffered:false};
NEBULA_META.flowers.white_flower_spray={head:url('white-flower-spray'),headWidth:485,headHeight:950,headRadius:.45,headView:'oblique',classicAvailable:false};
// Provisional demo rates, inherited from existing spray/bow rates; owner approval pending.
CONFIG.extrasCents.satin_bow=CONFIG.extrasCents.bow;
NEBULA_META.finishes.satin_bow={url:url('bow-blush-long-tails'),width:599,height:1088};
NebulaDetails.types.satin_bow={asset:'bow-blush-long-tails',price:'satin_bow',x:-.22,y:.02,scale:1,rotation:-8,layer:'front'};
function labels(){if(g.NebulaI18n){NebulaI18n.en.satin_bow='Blush satin bow';NebulaI18n.es.satin_bow='Lazo de satén rosa';}}
if(g.NebulaI18n)labels();else document.addEventListener('DOMContentLoaded',labels,{once:true});
function assets(s){
 if(!active(s))return [];
 const result=[];
 if(s.items.some(n=>n.id==='lily'))result.push(url('lily-pink-open-a'),url('lily-pink-oblique-left'));
 if(s.items.some(n=>n.id==='rose_cream'))result.push(url('rose-ivory-open-a'),url('rose-ivory-open-b'));
 if(s.finishes.greeneryCount)result.push(url('eucalyptus-edge'));
 if(s.finishes.collar&&s.finishes.paper==='ivory')result.push(url('wrap-peach-blush'));
 return result;
}
function paper(s,f){
 if(!active(s)||!s.finishes.collar||s.finishes.paper!=='ivory')return null;
 const w=(f.radius+f.unit*.46)*2.65;
 return {uid:'paper',url:url('wrap-peach-blush'),x:f.center.x,y:f.center.y+f.unit*.12,w,h:w*786/855,d:w,rot:0,bright:1,untinted:true};
}
function flowers(s,sc){
 sc.nodes=sc.nodes.map(n=>{
  if(n.id==='lily'){
   const side=n.x<sc.frame.center.x||n.slot%3===0;
   const w=n.d*(side?1:.98),h=side?w*729/801:w*833/831;
   return {...n,url:url(side?'lily-pink-oblique-left':'lily-pink-open-a'),w,h,rot:Math.sin(n.slot*2.4)*.35,z:n.y+sc.frame.unit*.5};
  }
  if(n.id==='rose_cream'){
   const second=n.slot%2===0,w=n.d*(1.03+.055*Math.sin(n.slot*2.7));
   return {...n,url:url(second?'rose-ivory-open-b':'rose-ivory-open-a'),w,h:w*(second?823/880:846/898),rot:Math.sin(n.slot*2.1)*.3,z:n.y};
  }
  if(n.id==='white_flower_spray'){
   const h=sc.frame.unit*2.05,w=h*485/950;
   const angle=Math.atan2(n.y-sc.frame.center.y,n.x-sc.frame.center.x)+Math.PI/2-.3;
   return {...n,w,h,d:w,rot:angle,z:n.y-sc.frame.unit*.35};
  }
  return n;
 }).sort((a,b)=>a.z-b.z||a.slot-b.slot);
}
function details(s,sc){
 if(!active(s))return;
 const f=sc.frame;
 // The source tip points up-left. Aim it outward; bury the basal stem under flowers.
 const spots=[[-.70,-.55],[.73,-.48],[-.86,.25],[.86,.37],[-.38,.76],[.35,.83],[-.22,-.80],[.25,-.72],[-.47,.10],[.49,.02],[-.2,.45],[.32,.40]];
 sc.greenery=spots.slice(0,s.finishes.greeneryCount||0).map(([x,y],i)=>{
  const h=f.unit*(i<8?2.05:1.65),w=h*666/826,cy=f.center.y+y*f.radius;
  return {uid:'greenery-'+i,url:url('eucalyptus-edge'),x:f.center.x+x*f.radius,y:cy,w,h,d:w,rot:Math.atan2(y,x)+2.15,bright:1,z:cy-f.unit*.7,softDetail:true};
 });
}
g.NebulaLily={active,assets,paper,flowers,details};
})(window);
