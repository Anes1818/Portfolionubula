/* Check a bud directly over a rose: visible pixels, picking, real pointer drag,
 * undo/redo and saved placements. All requests remain on the local test server. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../platform/public');
const output=path.resolve(__dirname,'../../.private/qa/lily-bud-foreground');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:950},hasTouch:mobile});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
   await page.goto(origin+'/studio/studio.html?demo=1&flowers=fresh&recipe=pink-promise');
   await page.waitForFunction(()=>window.NebulaApp?.ready,{},{timeout:45000});
   const cdp=await context.newCDPSession(page);
   for(const mode of ['classic','dome','heart']){
    await page.evaluate(async mode=>{
     const s=NebulaApp.createScenario(mode,Array(mode==='classic'?12:30).fill('rose_red'));
     s.finishes.studio={v:1,buds:1,breath:0};
     await NebulaRenderer.awaitAssets(s);
     const sc=NebulaRenderer.scene(s),rose=[...sc.nodes].sort((a,b)=>Math.hypot(a.x-sc.frame.center.x,a.y-sc.frame.center.y)-Math.hypot(b.x-sc.frame.center.x,b.y-sc.frame.center.y))[0];
     s.finishes.studio.placements={'bud-option-0':[rose.x,rose.y,0]};
     NebulaApp.setState(s);NebulaApp.stopBrush();
     if(matchMedia('(max-width:820px)').matches)NebulaApp.setFocusPreview(true);
    },mode);
    await page.locator('#bouquet').scrollIntoViewIfNeeded();
    const target=await page.evaluate(mobile=>{
     const R=NebulaRenderer,s=NebulaApp.state,sc=R.scene(s),n=sc.layeredFlowers.find(n=>n.uid==='bud-option-0');
     const rect=document.getElementById('bouquet').getBoundingClientRect(),v=R.view(s,NebulaApp.camera),scale=rect.width/720*v.scale;
     const cv=()=>{const c=document.createElement('canvas');c.width=720;c.height=820;return c;};
     const actual=cv(),expected=cv(),ctx=expected.getContext('2d');
     ctx.translate(n.x,n.y);ctx.rotate(n.rot);ctx.drawImage(R.decoded(n.url),-n.w/2,-n.h/2,n.w,n.h);
     R.drawArt(actual.getContext('2d'),s,{scene:sc});
     const a=actual.getContext('2d').getImageData(0,0,720,820).data,b=expected.getContext('2d').getImageData(0,0,720,820).data;
     const without=cv(),plain=JSON.parse(JSON.stringify(s));plain.finishes.studio.buds=0;
     R.drawArt(without.getContext('2d'),plain);
     const ground=without.getContext('2d').getImageData(0,0,720,820).data;
     let stemSamples=0,stemMatches=0;
     for(let y=Math.ceil(n.y+n.h*.41);y<Math.min(820,n.y+n.h*.5);y++)for(let x=Math.max(0,Math.floor(n.x-n.w/2));x<Math.min(720,n.x+n.w/2);x++){
      const i=(y*720+x)*4;if(b[i+3]>150){stemSamples++;if([0,1,2].every(k=>Math.abs(a[i+k]-ground[i+k])<3))stemMatches++;}
     }
     const covered=p=>sc.nodes.some(f=>NebulaInfill.alphaAt({...NebulaInfill.shape(f),mask:R.footprint(f)},p)>.8);
     let samples=0,matches=0,grab=null,halo=null;
     const screen=p=>({x:rect.left+(p.x*v.scale+v.x)/720*rect.width,y:rect.top+(p.y*v.scale+v.y)/820*rect.height});
     const visible=p=>{const q=screen(p);return q.x>12&&q.x<innerWidth-12&&q.y>12&&q.y<innerHeight-12;};
     const tol=10/Math.max(.1,scale);
     for(let y=Math.max(0,Math.floor(n.y-n.h*.65));y<Math.min(820,n.y+n.h*.65);y++)for(let x=Math.max(0,Math.floor(n.x-n.w*.75));x<Math.min(720,n.x+n.w*.75);x++){
      const i=(y*720+x)*4,p={x:x+.5,y:y+.5};
      if(b[i+3]>250&&covered(p)&&p.y<n.y+n.h*.04){
       samples++;if([0,1,2].every(c=>Math.abs(a[i+c]-b[i+c])<=12))matches++;
       if(!grab&&visible(p)&&NebulaFillerOptions.hit(sc,p)?.uid===n.uid)grab=screen(p);
      }
      if(mobile&&!halo&&b[i+3]===0&&covered(p)&&visible(p)&&!NebulaFillerOptions.hit(sc,p)&&NebulaFillerOptions.hit(sc,p,tol)?.uid===n.uid)halo=screen(p);
     }
     return {stemSamples,stemMatches,point:mobile?halo:grab,halo:!!halo,samples,ratio:matches/Math.max(1,samples),occlude:n.occlude.length,
      aboveFlowers:sc.layeredFlowers.indexOf(n)>Math.max(...sc.layeredFlowers.map((f,i)=>sc.nodes.some(flower=>flower.uid===f.uid)?i:-1)),
      state:JSON.stringify(s),counts:NebulaModel.counts(s),price:NebulaModel.price(s).totalCents};
    },mobile);
    assert.ok(target.occlude>0,mode+' lower bud tucks behind neighbours');
    assert.ok(target.stemSamples>0);assert.equal(target.stemMatches,target.stemSamples,'stem is concealed');
    assert.ok(target.aboveFlowers,mode+' foreground layer');
    assert.ok(target.samples>30,mode+' substantial visible bud overlaps rose');
    assert.ok(target.ratio>.97,mode+' actual bud pixels visible: '+target.ratio);
    assert.ok(target.point,mode+' accessible '+(mobile?'touch halo':'bud')+' target');
    const p=target.point,end={x:p.x+20,y:p.y+18};
    if(mobile){
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
     for(let step=1;step<=6;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+(end.x-p.x)*step/6,y:p.y+(end.y-p.y)*step/6}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}
    const moved=await page.evaluate(()=>({state:JSON.stringify(NebulaApp.state),placement:NebulaApp.state.finishes.studio.placements['bud-option-0'],counts:NebulaModel.counts(NebulaApp.state),price:NebulaModel.price(NebulaApp.state).totalCents}));
    assert.notDeepEqual(moved.placement,JSON.parse(target.state).finishes.studio.placements['bud-option-0'],'actual pointer moves bud');
    assert.deepEqual(moved.counts,target.counts);assert.equal(moved.price,target.price);
    await page.evaluate(()=>NebulaApp.undo());assert.equal(await page.evaluate(()=>JSON.stringify(NebulaApp.state)),target.state,'undo');
    await page.evaluate(()=>NebulaApp.redo());assert.equal(await page.evaluate(()=>JSON.stringify(NebulaApp.state)),moved.state,'redo');
    const restored=await page.evaluate(()=>{
     NebulaFillerOptions.select('bud-option-0');NebulaFillerOptions.editSelected(.26);
     const s=NebulaApp.state,round=NebulaLink.decode(NebulaLink.encode(s)).design,n=NebulaRenderer.scene(round).layeredFlowers.find(n=>n.uid==='bud-option-0');
     return {saved:round.finishes.studio.placements['bud-option-0'],original:s.finishes.studio.placements['bud-option-0'],occlude:n.occlude.length};
    });
    assert.deepEqual(restored.saved,restored.original);assert.ok(restored.occlude>0,'rotation and shared link retain lower-head tuck');
    await page.locator('#bouquet').screenshot({path:path.join(output,`${mobile?'phone':'desktop'}-${mode}.png`)});
    console.log('PASS',mobile?'phone touch':'desktop pointer',mode,'visible overlap',target.samples,'pixels; foreground, drag, undo, rotation, share and price');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
