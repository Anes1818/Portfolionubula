/* Render actual editable designs to lightweight catalog thumbnails.
   Requires the local preview server and Playwright (via NODE_PATH if bundled). */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage(),base=process.env.BUILDER_URL||'http://127.0.0.1:4173/builder/';
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  for(const id of ['midnight-blooms']){
   await page.goto(base+'studio.html?template='+id);await page.waitForFunction(()=>window.__ready);
   const data=await page.evaluate(async()=>{
    const s=NebulaApp.state,R=NebulaRenderer;await R.awaitAssets(s);
    const sc=R.scene(s),b=R.artBounds(s,sc),cv=document.createElement('canvas');cv.width=720;cv.height=892;
    const ctx=cv.getContext('2d');ctx.fillStyle='#f5f0e7';ctx.fillRect(0,0,720,892);
    const scale=Math.min(650/b.w,760/b.h);ctx.translate((720-b.w*scale)/2-b.x*scale,(892-b.h*scale)/2-b.y*scale);ctx.scale(scale,scale);R.drawArt(ctx,s,{scene:sc});
    return cv.toDataURL('image/webp',.85).split(',')[1];
   });
   fs.writeFileSync(path.resolve(__dirname,'../assets/catalog/thumbs/'+id+'.webp'),Buffer.from(data,'base64'));
   console.log('Rendered catalog preview:',id);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
