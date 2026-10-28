require('../tools/qa-output.cjs').prepareLaFlor();
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:4174/shops/la-flor-eterna/',out='.private/qa/la-flor-eterna/next-phase/';
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const p=await b.newPage({viewport:{width:1100,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'studio.html');await p.waitForFunction(()=>window.__ready);
 const result=await p.evaluate(async()=>{
  const failures=[],report=[],test=(ok,msg)=>{if(!ok)failures.push(msg);};
  const grid=document.createElement('canvas');grid.width=1200;grid.height=820;const gc=grid.getContext('2d');gc.fillStyle='#fff9f6';gc.fillRect(0,0,1200,820);
  for(const mode of ['dome','heart']){
   const s=NebulaModel.defaultMode(mode),items=JSON.stringify(s.items),price=NebulaModel.price(s).totalCents;s.finishes.initial='A';await NebulaRenderer.awaitAssets(s);
   let initialPrice=null;const heights=[];
   for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
    s.finishes.initial=letter;const sc=NebulaRenderer.scene(s),n=sc.finishes.find(n=>n.uid==='floral-initial'),im=NebulaRenderer.image('initial '+letter);
    test(!!n&&!!im,mode+' '+letter+' renders');if(!n||!im)continue;
    const pixels=im.getContext('2d').getImageData(0,0,im.width,im.height).data;let minX=im.width,minY=im.height,maxX=0,maxY=0,count=0;
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(pixels[(y*im.width+x)*4+3]>80){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
    test(count>2000,letter+' visible floral pixels');test(minX>3&&minY>3&&maxX<im.width-4&&maxY<im.height-4,letter+' complete unclipped florets');
    heights.push((maxY-minY)*n.h/im.height);
    const copy=NebulaLink.decode(NebulaLink.encode(s)).design;
    test(JSON.stringify(NebulaRenderer.scene(copy).finishes.find(n=>n.uid==='floral-initial'))===JSON.stringify(n),letter+' exact link geometry');
    test(JSON.stringify(s.items)===items,letter+' unchanged paid flowers');
    const cost=NebulaModel.price(s).totalCents-price;if(initialPrice===null)initialPrice=cost;test(cost===initialPrice&&cost>0,letter+' one consistent initial price');
    if(['A','M','S'].includes(letter)){const cv=document.createElement('canvas');cv.width=400;cv.height=410;NebulaRenderer.paint(cv,s);gc.drawImage(cv,['A','M','S'].indexOf(letter)*400,mode==='heart'?410:0);}
   }
   test(Math.max(...heights)/Math.min(...heights)<1.2,mode+' consistent visible letter heights');
   for(const initial of ['I','M','W','S'])for(const initialScale of [.7,1.3])for(const initialOffset of [-.35,.35]){
    Object.assign(s.finishes,{initial,initialScale,initialOffset});const n=NebulaRenderer.scene(s).finishes.find(n=>n.uid==='floral-initial');
    test([n.x,n.y,n.w,n.h].every(Number.isFinite)&&n.x-n.w/2>0&&n.x+n.w/2<720&&n.y-n.h/2>0&&n.y+n.h/2<820,mode+' extremes fit canvas');
   }
   s.finishes.initial='';test(!NebulaRenderer.scene(s).finishes.some(n=>n.uid==='floral-initial'),mode+' None removes all lettering');test(NebulaModel.price(s).totalCents===price,mode+' removing letter restores price');
   report.push(mode+': all 26 letters; consistent heights; full alpha; scale/offset limits; flower inventory, price and link preservation');
  }
  const classic=NebulaClassic.create('midnight-blooms');classic.finishes.initial='A';test(NebulaFloralLettering.initialNode(classic,classic.frames.classic)===null,'Classic never renders lettering');
  return {failures,report,png:grid.toDataURL()};
 });assert.deepEqual(result.failures,[]);fs.writeFileSync(out+'lettering-after-oct20.png',Buffer.from(result.png.split(',')[1],'base64'));
 for(const mode of ['dome','heart']){
  await p.evaluate(mode=>{NebulaApp.setState(NebulaModel.defaultMode(mode));NebulaApp.setTab('finishing');},mode);await p.waitForFunction(()=>NebulaApp.ready);
  await p.locator('#initialEnabled').check();await p.waitForFunction(()=>NebulaApp.ready);
  await p.locator('#initialLetter').focus();await p.keyboard.type('m');assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.initial),'M');
  await p.locator('#initialLetter').fill('');assert.equal(await p.locator('#initialLetter').inputValue(),'','backspace is not overwritten');
  await p.locator('#initialLetter').fill('s');assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.initial),'S');
  const code=await p.evaluate(()=>NebulaLink.encode(NebulaApp.state));await p.reload();await p.waitForFunction(()=>window.__ready);assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.initial),'S');
  const sheet=await b.newPage();await sheet.goto(base+'order.html#b='+code);await sheet.waitForFunction(()=>!document.getElementById('orderSheet').hidden);assert.ok((await sheet.locator('body').innerText()).includes('S'));await sheet.close();
  await p.evaluate(()=>NebulaApp.setTab('finishing'));await p.locator('#initialLetter').fill('');await p.locator('#designName').focus();assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.initial),'');
  await p.evaluate(()=>NebulaApp.undo());await p.waitForFunction(()=>NebulaApp.ready);assert.equal(await p.evaluate(()=>NebulaApp.state.finishes.initial),'S');
 }
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:out+'lettering-mobile-oct20.png',fullPage:true});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log('PASS '+result.report.join('; ')+'; typing, clearing, undo, persistence, shared sheets, 390px UI.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
