/* Real browser renderer regression: no accounts or external network calls. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../platform/public');
const output = path.resolve(__dirname, '../../.private/qa/satin-focal');
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);return res.end();}
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  fs.mkdirSync(output, {recursive:true});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.route('**/*',route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin + '/studio/studio.html?demo=1&flowers=satin&recipe=satin-ruby-heart');
    await page.waitForFunction(() => window.NebulaApp?.ready, {}, {timeout:45000});
    const results = await page.evaluate(async () => {
      const results=[];
      for (const mode of ['dome','heart']) for (const capacity of [7,30,85]) {
        const s=NebulaModel.defaultMode(mode);
        NebulaModel.resize(s,capacity);
        for(let slot=0;slot<capacity;slot++) NebulaModel.paintSlot(s,slot,'rose_red');
        NebulaModel.paintSlot(s,0,'rose_ivory');
        NebulaModel.paintSlot(s,1,'sunflower');
        NebulaModel.paintSlot(s,2,'sunflower');
        if(capacity===85) NebulaModel.paintSlot(s,3,'cash_usd_1');
        const snapshot=JSON.stringify(s),price=JSON.stringify(NebulaModel.price(s));
        await NebulaRenderer.awaitAssets(s);
        const sc=NebulaGeometry.nodes(s),flowers=sc.nodes.filter(n=>n.id==='sunflower');
        const layers=sc.nodes.map(n=>n.id.startsWith('cash_')?0:n.id==='sunflower'?2:1);
        const sorted=layers.every((v,i)=>!i||v>=layers[i-1]);
        const countOK=sc.nodes.length===capacity&&flowers.length===2;
        const picked=flowers.every(n=>NebulaRenderer.hit(sc,{x:n.x,y:n.y})?.uid===n.uid);
        const cv=document.createElement('canvas');cv.width=720;cv.height=820;
        NebulaRenderer.paint(cv,s);
        const unchanged=JSON.stringify(s)===snapshot&&JSON.stringify(NebulaModel.price(s))===price;
        const saved=NebulaModel.validate(JSON.parse(snapshot));
        const restored=saved&&JSON.stringify(NebulaModel.counts(saved))===JSON.stringify(NebulaModel.counts(s));
        const target=sc.slots.find(p=>p.slot===capacity-1);
        const moved=NebulaModel.move(s,flowers[0].uid,target).ok;
        const movedScene=NebulaGeometry.nodes(s);
        const stillFront=movedScene.nodes.slice(-2).every(n=>n.id==='sunflower');
        results.push({mode,capacity,sorted,countOK,picked,unchanged,restored,moved,stillFront,image:cv.toDataURL('image/png').split(',')[1]});
      }
      return results;
    });
    for(const row of results){
      const {image,...report}=row;
      fs.writeFileSync(path.join(output,`${row.mode}-${row.capacity}.png`),Buffer.from(image,'base64'));
      for(const key of ['sorted','countOK','picked','unchanged','restored','moved','stillFront'])assert.equal(row[key],true,`${row.mode}/${row.capacity}: ${key}`);
      console.log(report);
    }
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
