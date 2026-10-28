require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='.private/qa/la-flor-eterna/next-phase/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const p=await b.newPage({viewport:{width:1100,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 const result=await p.evaluate(async()=>{
  const issues=[],shots=[],check=(yes,msg)=>{if(!yes)issues.push(msg);};
  for(const ids of [['kitty'],['kitty','pumpkin_plush'],['kitty','pumpkin_plush','chocolate-box'],['snoopy','kitty','pumpkin_plush','snoopy_topper','chocolate-box']]){
   const s=NebulaSunflower.create();s.finishes.decorations=ids.filter(id=>id!=='chocolate-box').map(id=>NebulaDetails.create(id));s.finishes.chocolateBox=ids.includes('chocolate-box');s.finishes.studio={v:1,breath:2,sprays:2};await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s),gifts=sc.finishes.filter(n=>n.grounded),paper=sc.collar,front=sc.layeredFlowers.find(n=>n.uid==='paper-front');
   check(sc.nodes.filter(n=>n.x>405).every(n=>!n.flipX&&n.url.includes('front')),'Right-side sunflowers retain the previous front-facing balance');
   check(sc.nodes.filter(n=>n.x<300).every(n=>!n.flipX&&n.url.includes('oblique')),'Left-side sunflowers must keep the original source');
   check(['x','y','w','h'].every(k=>paper[k]===front[k]),'Paper layers must remain registered');
   check(gifts.length===ids.length,'Every gift renders once');
   const box=gifts.find(n=>n.uid==='chocolate-box');if(box){check(box.url.endsWith('chocolate-box-gold.webp'),'User-accepted chocolate source is used');check(Math.abs(box.h/box.w-494/948)<1e-9,'Chocolate preserves the supplied photograph aspect ratio');}
   check(gifts.every(n=>n.y-n.h/2>Math.max(...sc.nodes.map(a=>a.y+a.h*.5))),'Gifts stay below flower canopy');
   for(let i=0;i<gifts.length;i++)for(let j=i+1;j<gifts.length;j++){const a=gifts[i],c=gifts[j];check(Math.abs(a.x-c.x)>(a.w+c.w)/2+5||Math.abs(a.y-c.y)>(a.h+c.h)/2+5,'Default gifts overlap: '+a.uid+' / '+c.uid);}
   check(Math.min(...gifts.map(n=>n.y+n.h/2))<paper.y+paper.h/2+30,'Gifts should sit near the paper base');
   const cv=document.createElement('canvas');cv.width=900;cv.height=1025;NebulaRenderer.paint(cv,s);const c=cv.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#fff9f6';c.fillRect(0,0,900,1025);shots.push({name:'refined-sunflower-'+ids.length,png:cv.toDataURL(),link:NebulaLink.encode(s)});
   check(JSON.stringify(NebulaRenderer.scene(NebulaLink.decode(NebulaLink.encode(s)).design))===JSON.stringify(sc),'Scene survives fresh link reconstruction');
  }
  const s=NebulaSunflower.create();NebulaModel.replace(s,s.items[0].uid,'rose_pink');s.finishes.studio={v:1,sprays:3,breath:1};await NebulaRenderer.awaitAssets(s);const sc=NebulaRenderer.scene(s);
  check(sc.nodes.some(n=>n.id==='rose_pink'&&n.url.endsWith('rose-salmon-oblique.webp')),'New Classic rose source');check(sc.layeredFlowers.filter(n=>n.uid.startsWith('spray-accent-')).every(n=>n.url.endsWith('white-stock-tip.webp')),'New compact white filler source');
  const cv=document.createElement('canvas');cv.width=900;cv.height=1025;NebulaRenderer.paint(cv,s);const c=cv.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#fff9f6';c.fillRect(0,0,900,1025);shots.push({name:'refined-salmon-mix',png:cv.toDataURL(),link:NebulaLink.encode(s)});
  // Compare picking against the actual mirrored bitmap alpha, including asymmetric edges.
  let samples=0,differing=0;for(const n of sc.nodes.filter(n=>n.id==='sunflower'&&n.url.includes('oblique')).map(n=>({...n,flipX:true}))){const im=NebulaRenderer.image(n.url),cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const c=cv.getContext('2d');c.drawImage(im,0,0);const a=c.getImageData(0,0,cv.width,cv.height).data;
   for(let y=10;y<im.height-10;y+=23)for(let x=10;x<im.width-10;x+=23){const lx=((x+.5)/im.width-.5)*n.w,ly=((y+.5)/im.height-.5)*n.h,px=n.x+lx*Math.cos(n.rot)-ly*Math.sin(n.rot),py=n.y+lx*Math.sin(n.rot)+ly*Math.cos(n.rot),mirror=im.width-1-x;const expected=a[(y*im.width+mirror)*4+3]>60,plain=a[(y*im.width+x)*4+3]>60;if(plain!==expected)differing++;check(!!NebulaRenderer.hit({...sc,nodes:[n]},{x:px,y:py})===expected,'Mirrored silhouette picking mismatch');samples++;}
  }check(samples>100&&differing>10,'Mirror test exercises asymmetric edges');
  return {issues,shots,samples,differing};
 });
 assert.deepEqual(result.issues,[]);for(const s of result.shots){fs.writeFileSync(out+s.name+'.png',Buffer.from(s.png.split(',')[1],'base64'));fs.writeFileSync(out+s.name+'-link.txt',base+'studio.html#b='+s.link+'\n');}delete result.shots;assert.deepEqual(errors,[]);fs.writeFileSync(out+'refinements-oct19-results.json',JSON.stringify(result,null,2));console.log('PASS refined assets, aligned wrapper, restored front-facing sunflower balance; generic reflection picking + '+result.samples+' alpha picks, 1/2/3/5 gifts near base without overlap, link roundtrip.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
