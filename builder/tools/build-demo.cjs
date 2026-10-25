/* Import the client-proven runtime into a separate Nebula demo. Source engines stay in builder/. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../..'),source=path.join(repo,'shops/la-flor-eterna'),dest=path.join(repo,'demo/nebula-builder');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'build-manifest.json'),'utf8')),hashes={};
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(repo,'builder/shop-config.js'),'utf8'),context);
const original=context.window.NEBULA_SHOP;
const profile={...original,id:'nebula-demo',name:'Nebula',byline:'BOUQUET BUILDER DEMO',website:'https://nebulastudio.site/flowers/',logo:'assets/brand/nebula-logo.jpg',requestChannel:'sms',recipient:'+'+original.whatsapp,whatsapp:'',demo:true,features:{pinkStudy:false},selectedRecipeIds:['pink-promise'],publicBaseUrl:'https://nebulastudio.site/demo/nebula-builder/'};
function write(file,bytes){const target=path.join(dest,file);if(!target.startsWith(dest+path.sep))throw Error('Invalid path');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);hashes[file]=crypto.createHash('sha256').update(bytes).digest('hex');}
function brand(text){return text.replaceAll('La Flor Eterna','Nebula').replaceAll('LA FLOR ETERNA','NEBULA').replaceAll('MARITZA GOMEZ','NEBULA STUDIO').replaceAll('Maritza','the Nebula team').replaceAll('By Maritza Gomez','Nebula Studio').replaceAll('BY NEBULA STUDIO','BOUQUET BUILDER DEMO').replaceAll('the Nebula team Gomez','Nebula Studio').replaceAll('+13108729856',profile.recipient).replaceAll('lafloreterna.com','nebulastudio.site/flowers').replaceAll('@laflor_eterna','@nebulaa_studio');}
for(const file of Object.keys(manifest.files).sort()){
 if(file==='shop-config.js'||file==='short-links.js'||file.startsWith('pink-proof')||file==='assets/client/logo.png')continue;
 let bytes=fs.readFileSync(path.join(source,file));
 if(file.endsWith('.html')||file.endsWith('.js')){
  let s=brand(bytes.toString()).replaceAll("smsRef='LFE-'","smsRef='DEMO-'");
  // The featured card is the current Pink Promise; retire its older catalog duplicate.
  if(file==='index.html')s=s.replace(/<article class="bouquet-card" data-id="pink-promise"[\s\S]*?<\/article>/,'');
  if(file==='catalog-data.js'){const data={window:{}};vm.runInNewContext(s,data);s='window.NEBULA_COLLECTIONS='+JSON.stringify(data.window.NEBULA_COLLECTIONS.filter(r=>r.id!=='pink-promise'))+';\n';}
  if(file==='catalog-data.js')s+='\nNEBULA_COLLECTIONS.push({id:"money-bloom",en:"Money Bloom",es:"Ramo de dinero",collection:"love",description:"Folded dollar notes, your wrapping and a personal message.",descriptionEs:"Billetes plegados, tu envoltura y un mensaje personal."});';
  if(file==='index.html')s=s.replace('<div id="bouquetGrid" class="bouquet-grid">','<div id="bouquetGrid" class="bouquet-grid"><article class="bouquet-card" data-id="money-bloom" data-collection="love"><a class="bouquet-picture" href="studio.html?template=money-bloom"><img src="assets/catalog/thumbs/money-bloom.webp" alt="Money Bloom" width="720" height="820" loading="lazy"><span class="collection-tag">For love</span></a><div class="card-copy"><h2><a href="studio.html?template=money-bloom">Money Bloom</a></h2><p>Folded notes. A personal gift.</p><a class="customize-link" href="studio.html?template=money-bloom"><span>Make it yours</span></a></div></article>');
  if(file==='request.js')s=s.replaceAll('the Nebula team confirms availability, design and final price. Payment directly with the shop.','Demo request for Nebula. No flower order or payment is placed.').replaceAll('the Nebula team confirma disponibilidad, diseño y precio final. Pago directamente con la tienda.','Solicitud de prueba para Nebula. No se realiza ningún pedido ni pago.');
  if(file.endsWith('.html'))s=s.replace('</head>','<link rel="stylesheet" href="demo-brand.css?v=20261025"></head>').replace('<script src="client-ui.js" defer></script>','<script src="client-ui.js" defer></script><script src="demo-brand.js?v=20261025" defer></script>');
  if(['studio.html','order.html'].includes(file))s=s.replace(/(<script src="(?:app|order)\.js)/,'<link rel="stylesheet" href="money.css?v=1"><script src="money.js?v=1" defer></script>$1');
  s=s.replaceAll('assets/client/logo.png',profile.logo).replaceAll('type="image/png"','type="image/jpeg"');
  s=s.replace(/<script src="(?:\.\.\/\.\.\/b\/(?:config|database)\.js|short-links\.js)" defer><\/script>/g,'');
  s=s.replaceAll('Top Sellers','Featured designs').replaceAll('Los más vendidos','Diseños destacados').replaceAll('FROM NEBULA','EXPLORE THE DEMO').replaceAll('DE NEBULA','EXPLORA LA DEMO');
  s=s.replaceAll('the Nebula team confirma','El equipo de Nebula confirma').replaceAll('the Nebula team confirmará','El equipo de Nebula confirmará').replaceAll('de the Nebula team','del equipo de Nebula').replaceAll('por the Nebula team','por el equipo de Nebula');
  s=s.replaceAll('Owner preview with sample prices.','Interactive demo with sample prices.').replaceAll('Owner preview','Interactive demo').replaceAll('owner review','demonstration').replaceAll('for owner review','for demonstration');
  s=s.replaceAll('A little inspiration from the Nebula team’s own creations. Choose a favorite and make it yours.','Explore our latest editable bouquets. Choose a starting point and make it yours.').replaceAll('Inspírate en las creaciones de the Nebula team. Elige tu favorito y hazlo tuyo.','Explora los ramos editables. Elige tu favorito y hazlo tuyo.');
  if(file==='client-ui.js')s+=`\n/* Demo identity and request copy: no customer database connection. */\n(()=>{if(window.NebulaI18n){Object.assign(NebulaI18n.en,{studio:'BOUQUET BUILDER DEMO',orderTitle:'Preview your demo request',orderHint:'Try preparing a sample request for the Nebula team. This is a demonstration, not a flower order.',orderFine:'Demo only. No flower order or payment is placed.',orderDemo:'Sample prices for demonstration.',orderPrivacy:'Your details stay in this browser and the message you choose to send. The design link omits your contact details.',smsHelp:'Review the sample message. Sending it contacts Nebula, not a flower shop.'});Object.assign(NebulaI18n.es,{studio:'DEMO DEL CREADOR DE RAMOS',orderTitle:'Vista de tu solicitud de prueba',orderHint:'Prepara una solicitud de ejemplo para el equipo de Nebula. Es una demostración, no un pedido de flores.',orderFine:'Solo demostración. No se realiza ningún pedido ni pago.',orderDemo:'Precios de ejemplo.',smsHelp:'Revisa el mensaje. Si lo envías, contactarás con Nebula, no con una floristería.'});}document.querySelectorAll('.sheet-logo,.collection-logo').forEach(e=>e.remove());})();\n`;
  bytes=Buffer.from(s);
 }
 write(file,bytes);
 if(file==='index.html')write('collection.html',bytes);
}
for(const [target,sourceFile] of [['assets/brand/nebula-logo.jpg','logo.jpg'],['demo-brand.js','brand.js'],['demo-brand.css','brand.css']])write(target,fs.readFileSync(path.join(repo,'builder/demo-brand',sourceFile)));
// The demo opens with a florist sales experience; client storefronts stay intact.
const featured=JSON.parse(fs.readFileSync(path.join(repo,'clients/la-flor-eterna/top-sellers.json'),'utf8'));
const catalog={window:{}};vm.runInNewContext(fs.readFileSync(path.join(source,'catalog-data.js'),'utf8'),catalog);
catalog.window.NEBULA_COLLECTIONS.push({id:'money-bloom',en:'Money Bloom',es:'Ramo de dinero'});
for(const file of ['money.js','money.css'])write(file,fs.readFileSync(path.join(repo,'builder/demo-brand',file)));
write('assets/money/folded-dollar-v1.png',fs.readFileSync(path.join(repo,'builder/demo-brand/money/folded-dollar-v1.png')));
const moneyThumb=path.join(repo,'builder/demo-brand/money/money-bloom.webp');if(fs.existsSync(moneyThumb))write('assets/catalog/thumbs/money-bloom.webp',fs.readFileSync(moneyThumb));
write('index.html',require('../demo-brand/landing.cjs')(featured,catalog.window.NEBULA_COLLECTIONS.filter(r=>r.id!=='pink-promise')));
for(const file of ['landing.css','landing.js'])write(file,fs.readFileSync(path.join(repo,'builder/demo-brand',file)));
write('assets/brand/pink-preview.png',fs.readFileSync(path.join(repo,'builder/demo-brand/pink-preview.png')));
for(const file of ['pink-demo.webm','pink-demo-poster.png'])write('assets/brand/'+file,fs.readFileSync(path.join(repo,'builder/demo-brand',file)));
write('shop-config.js','window.NEBULA_SHOP='+JSON.stringify(profile,null,2)+';\n');
write('build-manifest.json',JSON.stringify({profile:'nebula-demo',source:'la-flor-eterna runtime',files:hashes},null,2)+'\n');
console.log('Built demo/nebula-builder/ ('+Object.keys(hashes).length+' files)');
