/* Exercise release gates and output selection without modifying the real profile/output. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.resolve(__dirname,'../..'),tool=path.join(repo,'builder/tools/build-shop.cjs'),client=path.join(repo,'clients/la-flor-eterna/profile.json');
const profile=JSON.parse(fs.readFileSync(client,'utf8'));
function build(settings){const output=new Map(),fake={...fs,readFileSync:(file,...args)=>path.resolve(file)===client?JSON.stringify(settings):fs.readFileSync(file,...args),mkdirSync:()=>{},writeFileSync:(file,bytes)=>output.set(path.relative(path.join(repo,'shops/la-flor-eterna'),file).replaceAll('\\','/'),Buffer.from(bytes))};vm.runInNewContext(fs.readFileSync(tool,'utf8'),{__dirname:path.dirname(tool),require:id=>id==='node:fs'?fake:require(id),Buffer,URL,console:{log(){}}});return output;}
const preview=build(profile);assert.equal((preview.get('index.html').toString().match(/class="bouquet-card"/g)||[]).length,10);
assert.ok(preview.get('assets/client/logo.png').equals(fs.readFileSync(path.join(repo,'clients/la-flor-eterna/assets/logo.png'))));console.log('PASS preview retains all ten recipes and original logo bytes');
assert.throws(()=>build({...profile,demo:false}),/Owner approval/);console.log('PASS unapproved prices, catalog and fulfillment block a non-sample build');
assert.throws(()=>build({...profile,publicBaseUrl:'http://example.invalid/shop'}),/HTTPS/);console.log('PASS invalid public shop base rejected');
const live=build({...profile,demo:false,pricesApproved:true,selectionComplete:true,fulfillmentApproved:true,selectedRecipeIds:['pink-promise']});
const html=live.get('index.html').toString();assert.equal((html.match(/class="bouquet-card"/g)||[]).length,1);assert.ok(html.includes('data-id="pink-promise"'));assert.ok(!html.includes('data-id="scream-for-you"'));
const data={window:{}};vm.runInNewContext(live.get('catalog-data.js').toString(),data);assert.equal(data.window.NEBULA_COLLECTIONS.length,1);assert.equal(data.window.NEBULA_COLLECTIONS[0].id,'pink-promise');console.log('PASS approved-output catalog contains only explicitly selected recipes');
for(const [file,bytes]of preview){assert.ok(!/(^|\/)(tests|qa|marketing|originals|artwork)(\/|$)|OWNER/.test(file),'Private build path: '+file);if(file.endsWith('.js'))new vm.Script(bytes.toString(),{filename:file});}
console.log('PASS runtime has no private/review files and every assembled script parses');
const family=JSON.parse(preview.get('assets/client/pink-family/manifest.json').toString());
assert.equal(family.recipeReady,false);
assert.ok(family.assets.some(a=>a.id==='rose-blush-open-a'));
for(const asset of family.assets){
 assert.ok(preview.get(asset.url).equals(fs.readFileSync(path.join(repo,'clients/la-flor-eterna/assets/pink-family/masters',asset.id+'.png'))));
 assert.equal(require('node:crypto').createHash('sha256').update(preview.get(asset.url)).digest('hex'),asset.sha256);
}
assert.ok(![...preview.keys()].some(file=>file.includes('/masters/')||file.includes('asset-manifest.json')));
assert.ok(!JSON.stringify(family).includes('Telegram Desktop'));
console.log('PASS inspected family PNGs retain exact master bytes; runtime omits private source paths and approval notes');
