/* Exact recipe thumbnails; no generated reference imagery. Run build-shop first. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const base=process.env.BUILDER_URL||'http://127.0.0.1:4174/shops/la-flor-eterna/';
const out=path.resolve(__dirname,'../../clients/la-flor-eterna/assets/thumbs');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{const page=await browser.newPage();await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.goto(base);const ids=await page.evaluate(()=>NEBULA_COLLECTIONS.map(r=>r.id));
  for(const id of ids){await page.goto(base+'studio.html?template='+id);await page.waitForFunction(()=>window.__ready);
   const image=await page.evaluate(async()=>{const s=NebulaApp.state,R=NebulaRenderer;await R.awaitAssets(s);const sc=R.scene(s),b=R.artBounds(s,sc),cv=document.createElement('canvas');cv.width=720;cv.height=892;const ctx=cv.getContext('2d');ctx.fillStyle='#fff9f6';ctx.fillRect(0,0,720,892);const k=Math.min(650/b.w,780/b.h);ctx.translate((720-b.w*k)/2-b.x*k,(892-b.h*k)/2-b.y*k);ctx.scale(k,k);R.drawArt(ctx,s,{scene:sc});return cv.toDataURL('image/webp',.86).split(',')[1];});
   fs.writeFileSync(path.join(out,id+'.webp'),Buffer.from(image,'base64'));console.log('Rendered',id);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
