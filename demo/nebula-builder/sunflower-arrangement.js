/* Opt-in Classic artwork. Positions remain model anchors; quantities stay editable. */
(function(g){'use strict';
const root='assets/client/sunflower-family/',url=n=>root+n+'.webp';
const active=s=>s?.mode==='classic'&&g.NebulaClassic?.active(s)&&s.finishes.roseArtwork==='sunflower-classic-v1';
const sizes={'sunflower-front-a':[688,753],'sunflower-front-b':[772,763],'sunflower-oblique-a':[629,741],'sunflower-oblique-b':[611,691]};
function assets(s){return s.mode==='classic'&&(active(s)||s.items.some(i=>i.id==='sunflower'))?[...Object.keys(sizes).map(url),url('sunflower-leaf-stem'),...(active(s)&&!g.NebulaCustomization&&s.finishes.collar&&s.finishes.paper==='ivory'?[url('wrap-yellow-back'),url('wrap-yellow-front')]:[]),...(s.finishes.ribbon==='blush'?['assets/client/lily-family/bow-blush-long-tails.webp']:[])]:[];}
function flower(n,center=360){
 if(n.id!=='sunflower')return n;
 // Restore the approved face-forward balance. Mirrored side views on both
 // edges made this compact bouquet look pinched and turned away from camera.
 const k=Number(n.uid.slice(1)),name=n.x<center-60?(k%2?'sunflower-oblique-a':'sunflower-oblique-b'):(k%2?'sunflower-front-a':'sunflower-front-b');
 const [w0,h0]=sizes[name],h=n.d*1.12;
 return {...n,url:url(name),w:h*w0/h0,h,flipX:false,rot:(n.x-center)/1400+Math.sin(k*2.4)*.08,z:n.y};
}
function complete(s,sc){
 if(!active(s))return;
 sc.nodes=sc.nodes.map(n=>flower(n)).sort((a,b)=>a.z-b.z);
 const blooms=sc.nodes.filter(n=>!n.decorative),sunflowers=blooms.filter(n=>n.id==='sunflower');
 // Stable paper and camera: moving a single bloom must not recenter the bouquet.
 const cx=360,w=560,bottom=810;
 if(s.finishes.collar&&s.finishes.paper==='ivory'){
  const h=w*951/763;
  sc.collar={uid:'paper',url:url('wrap-yellow-back'),x:cx,y:bottom-h/2,w,h,d:w,rot:0,bright:1,untinted:true};
  const fw=w*.86,fh=fw*779/1058;
  sc.finishes.unshift({uid:'sunflower-front-paper',url:url('wrap-yellow-front'),x:cx,y:bottom-fh/2,w:fw,h:fh,d:fw,rot:0,bright:1});
 }else if(!s.finishes.collar)sc.collar=null;
 // Attached foliage is part of each selected sunflower, not extra paid stems.
 const leaves=sunflowers.map(n=>({uid:n.uid+'-foliage',parentFlower:n.uid,url:url('sunflower-leaf-stem'),x:n.x+(cx-n.x)*.16,y:n.y+n.h*.44,w:n.h*.63,h:n.h*.63*1001/714,d:n.h*.63,rot:(n.x-cx)/900,bright:1,z:n.y-200,softDetail:true}));
 sc.greenery=leaves;sc.layeredFlowers=[...leaves,...sc.nodes];
 const ribbon=sc.finishes.find(n=>n.uid==='ribbon');if(ribbon){
  ribbon.x=cx;ribbon.y=bottom-8;
  if(s.finishes.ribbon==='blush'){ribbon.url='assets/client/lily-family/bow-blush-long-tails.webp';ribbon.w=100;ribbon.h=100*1088/599;ribbon.y=bottom+ribbon.h*.28;}
 }
}
function create(){
 const M=g.NebulaModel,s=M.empty();s.title='Sunflower study — Nebula';s.frames.classic=NebulaClassic.frame();
 Object.assign(s.finishes,{roseArtwork:'sunflower-classic-v1',paper:'ivory',ribbon:'burgundy'});
 const points=[[322,235],[430,290],[237,330],[352,365],[470,410],[275,455],[392,490]];
 s.items=points.map(([x,y])=>{const n=M.newItem(s,'sunflower');n.anchors.classic={x,y,manual:true};return n;});return s;
}
let panel;
function renderControls(s,lang,ready){
 const host=document.getElementById('panel-flowers');if(!host||!g.NEBULA_SHOP?.demo)return;
 if(!panel){panel=document.createElement('div');panel.className='rose-artwork-control';panel.id='sunflowerArtworkControl';
  for(const value of ['original','sunflower-classic-v1']){const b=document.createElement('button');b.type='button';b.dataset.sunflowerArtwork=value;
   b.onclick=()=>{const next=NebulaApp.state;if(next.mode!=='classic')return;if(value==='original')delete next.finishes.roseArtwork;else next.finishes.roseArtwork=value;NebulaApp.setState(next);};panel.append(b);}
  const note=document.createElement('small');note.textContent='Yellow paper replaces Ivory in this artwork study. Other paper colors remain selectable.';panel.append(note);host.prepend(panel);
 }
 panel.hidden=s.mode!=='classic'||!s.items.some(n=>n.id==='sunflower');
 for(const b of panel.querySelectorAll('button')){const v=b.dataset.sunflowerArtwork;b.textContent=v==='original'?'Original':lang==='es'?'Girasoles + papel amarillo':'Sunflowers + yellow paper';b.disabled=!ready;b.setAttribute('aria-pressed',String(v===(active(s)?'sunflower-classic-v1':'original')));}
}
g.NebulaSunflower={active,assets,complete,create,renderControls,flower};
})(window);
