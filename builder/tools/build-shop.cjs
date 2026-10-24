/* Deterministic static assembly. Edit builder/ and clients/, never shops/. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../..'),source=path.join(repo,'builder'),client=path.join(repo,'clients/la-flor-eterna'),dest=path.join(repo,'shops/la-flor-eterna');
const profile=JSON.parse(fs.readFileSync(path.join(client,'profile.json'),'utf8'));
if(profile.id!=='la-flor-eterna'||profile.recipient!=='+13108729856'||profile.requestChannel!=='sms')throw Error('Unexpected pilot identity/recipient');
if(profile.demo===false&&(!profile.pricesApproved||!profile.selectionComplete||!profile.fulfillmentApproved))throw Error('Owner approval of prices, final selection and fulfillment is required before building without sample labels.');
if(profile.publicBaseUrl){const u=new URL(profile.publicBaseUrl);if(u.protocol!=='https:'||u.search||u.hash||!u.pathname.endsWith('/'))throw Error('publicBaseUrl must be a full HTTPS shop directory ending in /');}
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(source,'shop-config.js'),'utf8'),context);
const shop={...context.window.NEBULA_SHOP,...profile,whatsapp:'',email:''};
context.window.NEBULA_SHOP=shop;
vm.runInNewContext(fs.readFileSync(path.join(source,'shop-context.js'),'utf8'),context);
const policy=context.window.NebulaShop;
const files=['index.html','studio.html','order.html','app.css','catalog.css','app.js','asset-meta.js','catalog-data.js','catalog-route.js','catalog.js','classic-recipes.js','config.js','design-link.js','dome-engine-v2.js','embedded-loader.js','fall-details.js','fall.js','geometry.js','halloween-layout.js','halloween.js','i18n-v6.js','i18n.js','model.js','order.js','renderer.js','saved-bouquets.js','short-links.js','shop-context.js','request.js','template-engine.js'];
const assetDirs=['brand','classic','fall','finishes','halloween','heads','heart','romance','wrapping','catalog/thumbs'];
files.push('romance.js');
for(const dir of assetDirs){const scan=rel=>{for(const ent of fs.readdirSync(path.join(source,rel),{withFileTypes:true})){const file=rel+'/'+ent.name;if(ent.isDirectory())scan(file);else if(/\.(webp|svg)$/.test(file))files.push(file);}};scan('assets/'+dir);}
const currentPink=JSON.parse(fs.readFileSync(path.join(client,'top-sellers.json'),'utf8')).find(r=>r.id==='pink-promise');
const hashes={};
function write(rel,bytes){const target=path.join(dest,rel);if(!target.startsWith(dest+path.sep))throw Error('Invalid build path');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);hashes[rel]=crypto.createHash('sha256').update(bytes).digest('hex');}
for(const file of files.sort()){
 let bytes=fs.readFileSync(path.join(source,file));
 if(file.endsWith('.html')){
  let html=bytes.toString().replace('<script src="demo-route.js"></script>','').replaceAll('Nebula',profile.name).replaceAll('nebula bouquet',profile.name+' bouquet').replaceAll('https://nebulastudio.site','index.html').replaceAll('type="image/svg+xml"','type="image/png"').replaceAll('href="favicon.svg"','href="assets/client/logo.png"').replaceAll('assets/brand/logo-mark.webp',profile.logo);
  html=html.replaceAll('v=20261016d','v=20261023-current-pink');
  html=html.replace('name="theme-color" content="#f7f5ef"','name="theme-color" content="#FFF9F6"');
  html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><meta property="og:title" content="La Flor Eterna â€” A bouquet, made personal."><meta property="og:description" content="Customize a bouquet and prepare a text request. Owner preview with sample prices."><meta property="og:image" content="assets/client/logo.png"><link rel="stylesheet" href="theme.css"></head>');
  if(profile.demo===false)html=html.replace('Owner preview with sample prices.','Final availability and price require confirmation.');
  html=html.replace(/(<script src="(?:catalog|app|order)\.js)/,'<script src="client-ui.js" defer></script>$1');
  if(file==='index.html'){
   html=html.replace(/<article class="bouquet-card" data-id="pink-promise"[\s\S]*?<\/article>/,'');
   html=html.replaceAll('â€” inspiration image','â€” editable design preview');
   html=html.replace('<section class="collection-section',require(path.join(__dirname,'top-sellers.cjs')).section(client,id=>profile.demo||policy.recipeAllowed(id))+'\n    <section class="collection-section');
   html=html.replace('<div class="collection-tools"','<h2 class="all-bouquets-title" data-copy="all">All bouquets</h2><div class="collection-tools"');
  }
  if(file==='index.html'&&profile.demo===false)html=html.replace(/<article class="bouquet-card" data-id="([a-z-]+)"[\s\S]*?<\/article>/g,(card,id)=>policy.recipeAllowed(id)?card:'');
  if(['studio.html','order.html'].includes(file))html=html.replace(/(<script src="(?:app|order)\.js)/,'<script src="../../b/config.js" defer></script><script src="../../b/database.js" defer></script><script src="short-links.js" defer></script>$1');
  if(['studio.html','order.html'].includes(file))html=html.replace('<script src="model.js','<script src="pink-recipe.js" defer></script><script src="rose-artwork.js" defer></script><script src="lily-arrangement.js" defer></script><script src="sunflower-arrangement.js" defer></script><script src="gift-options.js" defer></script><script src="infill-layout.js" defer></script><script src="midnight-artwork.js" defer></script><script src="crimson-arrangement.js?v=20261023-current-pink" defer></script><script src="celebration-arrangement.js?v=20261023-current-pink" defer></script><script src="classic-wrapping.js?v=20261023-current-pink" defer></script><script src="filler-options.js?v=20261023-current-pink" defer></script><script src="customization.js?v=20261023-current-pink" defer></script><script src="customization-ui.js?v=20261023-current-pink" defer></script><script src="floral-lettering.js" defer></script><script src="model.js');
  if(file==='index.html'&&profile.demo&&profile.features?.pinkStudy)html=html.replace('<main', '<aside style="padding:16px;text-align:center;background:#f8e8ed"><a href="pink-proof.html" style="color:#76394e">Explore the new pink bouquet study â†’</a></aside><main');
  if(file==='order.html')html=html.replace('<div class="os-top">','<img class="sheet-logo" src="assets/client/logo.png" alt="La Flor Eterna â€” By Maritza Gomez" width="170" height="170"><div class="os-top">');
  if(file==='studio.html')html=html.replace(/(<p class="helper order-fine" data-i18n="orderFine">[\s\S]*?<\/p>)/,`$1
   <section id="smsPrepared" class="sms-prepared full" hidden aria-live="polite">
    <h3>La Flor Eterna</h3><p id="smsRecipient" class="sms-recipient">+13108729856</p>
    <p class="helper" data-i18n="smsHelp"></p>
    <div class="sms-actions"><a id="smsOpen" class="button primary" href="#" data-i18n="smsOpen"></a><button id="smsCopy" class="button secondary" type="button" data-i18n="smsCopy"></button></div>
    <label class="field full"><span data-i18n="smsLabel"></span><textarea id="smsMessage" rows="8" spellcheck="false" readonly></textarea></label>
    <details class="sms-trouble"><summary data-i18n="smsTrouble"></summary><p class="helper" data-i18n="smsFallback"></p>
    <label class="sms-plain"><input id="smsPlain" type="checkbox"><span data-i18n="smsPlain"></span></label>
    <div class="sms-actions"><button id="smsImage" class="button secondary" type="button" data-i18n="smsImage"></button><a id="smsSheet" class="button secondary" target="_blank" rel="noopener" data-i18n="smsSheet" href="#"></a></div>
    </details><p id="smsStatus" role="status" class="helper"></p>
   </section>`);
  bytes=Buffer.from(html);
 }
 // The isolated build is HTTP-only. It deliberately excludes offline bundles.
 if(file==='embedded-loader.js')bytes=Buffer.from('window.NEBULA_EMBED_READY=Promise.resolve();\n');
 if(file==='catalog-data.js')bytes=Buffer.from(bytes.toString().replaceAll('"preview": false','"preview": true'));
 // Retire the old lower catalog entry; direct recipe links use the featured design.
 if(file==='catalog-data.js'){const data={window:{}};vm.runInNewContext(bytes.toString(),data);bytes=Buffer.from('window.NEBULA_COLLECTIONS='+JSON.stringify(data.window.NEBULA_COLLECTIONS.filter(r=>r.id!=='pink-promise'))+';\n');}
 if(file==='romance.js')bytes=Buffer.from(bytes.toString()+'\n(()=>{const old=NebulaRomance.create;NebulaRomance.create=id=>id==="pink-promise"?NebulaLink.decode('+JSON.stringify(currentPink.expected.code)+').design:old(id);const r=NebulaRomance.recipes.find(r=>r.id==="pink-promise");if(r)r.count='+currentPink.expected.count+';})();\n');
 if(file==='catalog-data.js'&&profile.demo===false){const data={window:{}};vm.runInNewContext(bytes.toString(),data);write(file,'window.NEBULA_COLLECTIONS='+JSON.stringify(data.window.NEBULA_COLLECTIONS.filter(r=>policy.recipeAllowed(r.id)))+';\n');continue;}
 write(file,bytes);
}
// Exact recipe thumbnails are client source assets, produced by render-shop-previews.cjs.
const thumbs=path.join(client,'assets/thumbs');
if(fs.existsSync(thumbs))for(const name of fs.readdirSync(thumbs).sort())if(/^[a-z-]+\.webp$/.test(name))write('assets/catalog/thumbs/'+name,fs.readFileSync(path.join(thumbs,name)));
write('shop-config.js','/* Generated profile; sample price inputs inherited from builder/shop-config.js. */\nwindow.NEBULA_SHOP='+JSON.stringify(shop,null,2)+';\n');
for(const name of ['client-ui.js','theme.css','rose-artwork.js','lily-arrangement.js','sunflower-arrangement.js','gift-options.js','infill-layout.js','midnight-artwork.js','crimson-arrangement.js','classic-wrapping.js','celebration-arrangement.js','filler-options.js','customization.js','customization-ui.js','floral-lettering.js','pink-recipe.js','pink-proof.html','pink-proof.css','pink-proof.js'])write(name,fs.readFileSync(path.join(client,name)));
write(profile.logo,fs.readFileSync(path.join(client,'assets/logo.png')));
for(const item of JSON.parse(fs.readFileSync(path.join(client,'top-sellers.json'),'utf8'))){
 if(!/^assets\/client\/featured\/[a-z-]+\.jpg$/.test(item.image))throw Error('Invalid featured photo path');
 write(item.image,fs.readFileSync(path.join(client,'assets/featured',path.basename(item.image))));
}
require(path.join(__dirname,'pink-family-assets.cjs')).buildAssets(client,write);
// Explicitly approved lily runtime asset. Keep source PNG and internal metadata local.
const lilyRoot=path.join(client,'assets/lily-family'),lilyMeta=JSON.parse(fs.readFileSync(path.join(lilyRoot,'manifest.json'),'utf8'));
const lilyBytes=fs.readFileSync(path.join(lilyRoot,'lily-pink-open-a.webp'));
if(crypto.createHash('sha256').update(lilyBytes).digest('hex')!==lilyMeta.sha256)throw Error('Inspected lily asset changed');
write('assets/client/lily-family/lily-pink-open-a.webp',lilyBytes);
const lilyBatch=JSON.parse(fs.readFileSync(path.join(lilyRoot,'batch-manifest.json'),'utf8'));
for(const asset of lilyBatch.assets){
 if(!/^[a-z][a-z0-9-]+\.webp$/.test(asset.file))throw Error('Invalid lily runtime filename');
 const bytes=fs.readFileSync(path.join(lilyRoot,asset.file));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Lily batch asset changed: '+asset.file);
 write('assets/client/lily-family/'+asset.file,bytes);
}
const sunRoot=path.join(client,'assets/sunflower-family');
for(const a of JSON.parse(fs.readFileSync(path.join(sunRoot,'manifest.json'),'utf8')).assets){
 if(!/^[a-z][a-z0-9-]+\.webp$/.test(a.file))throw Error('Invalid sunflower asset');
 const b=fs.readFileSync(path.join(sunRoot,a.file));
 if(crypto.createHash('sha256').update(b).digest('hex')!==a.sha256)throw Error('Sunflower asset changed');
 write('assets/client/sunflower-family/'+a.file,b);
}
const giftRoot=path.join(client,'assets/gifts'),gift=JSON.parse(fs.readFileSync(path.join(giftRoot,'manifest.json'),'utf8'));
const giftBytes=fs.readFileSync(path.join(giftRoot,'chocolate-box-yellow.webp'));
if(crypto.createHash('sha256').update(giftBytes).digest('hex')!==gift.sha256)throw Error('Gift asset changed');
write('assets/client/gifts/chocolate-box-yellow.webp',giftBytes);
for(const name of ['lily-magenta.png','thistle-blue.png'])write('assets/client/midnight-oct20/'+name,fs.readFileSync(path.join(client,'assets/midnight-oct20',name)));
 write('assets/client/lettering-oct20/white-florets.png',fs.readFileSync(path.join(client,'assets/lettering-oct20/white-florets.png')));
 const refinementRoot=path.join(client,'assets/refinements-oct19');
 write('assets/client/refinements-oct19/eucalyptus-silver-tip-v2.png',fs.readFileSync(path.join(refinementRoot,'eucalyptus-silver-tip-v2.png')));
 for(const name of ['breath-branch-v2.png','bow-pink-reference-v2.png'])write('assets/client/refinements-oct19/'+name,fs.readFileSync(path.join(refinementRoot,name)));
for(const a of JSON.parse(fs.readFileSync(path.join(refinementRoot,'manifest.json'),'utf8')).assets.filter(a=>a.runtime)){
 if(!/^[a-z][a-z0-9-]+\.webp$/.test(a.file))throw Error('Invalid refinement asset');
 const bytes=fs.readFileSync(path.join(refinementRoot,a.file));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('Refinement asset changed: '+a.file);
 write('assets/client/refinements-oct19/'+a.file,bytes);
}
write('assets/client/celebration/lily-bud.png',fs.readFileSync(path.join(client,'assets/celebration/lily-bud.png')));
write('assets/client/celebration/lily-pink.png',fs.readFileSync(path.join(client,'assets/celebration/lily-pink.png')));
for(const file of ['smoke-wrap.png','rose-crimson.png'])write('assets/client/crimson-velvet/'+file,fs.readFileSync(path.join(client,'assets/crimson-velvet',file)));
write('build-manifest.json',JSON.stringify({profile:profile.id,files:hashes},null,2)+'\n');
console.log('Built shops/la-flor-eterna/ ('+Object.keys(hashes).length+' explicit runtime files).');

