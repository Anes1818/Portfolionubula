/* Assemble Ray's storefront around the existing Nebula runtime.
   The engines are copied byte-for-byte; shop changes live in clients/raysbouquetz. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const F=require('../shop-factory/core.cjs'),root=F.root,client=path.join(root,'clients/raysbouquetz'),dest=path.join(root,'shops/raysbouquetz'),source=path.join(root,'builder');
const core=['app.css','config.js','asset-meta.js','dome-engine-v2.js','template-engine.js','geometry.js','fall.js','fall-details.js','romance.js','halloween-layout.js','halloween.js','classic-recipes.js','model.js','i18n.js','i18n-v6.js','renderer.js','design-link.js','saved-bouquets.js','request.js','shop-context.js','order.js'];
const shared=['shop-context','config','asset-meta','embedded-loader','dome-engine-v2','template-engine','geometry','fall','fall-details','romance','halloween-layout','halloween','classic-recipes','model','i18n','i18n-v6','renderer','design-link','saved-bouquets','request','pricing','commerce-core','store-data','builder-runtime'];
function build(){
 const store=F.json(path.join(client,'store.json')),preview=F.json(path.join(client,'builder-preview.json')),profile=F.json(path.join(client,'profile.json')),metadata=F.json(path.join(client,'generated-art-metadata.json'));
 if(!preview.draft||store.pricing.currency!=='CAD'||store.designs.length!==4||store.modes.join(',')!=='dome,heart'||store.payment.reviewEnabled||store.payment.squareCheckoutEnabled)throw Error('Unexpected Ray preview scope.');
 const p=preview.pricing,cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
 if(!(p.chocolateCents===null||cents(p.chocolateCents))||!Number.isInteger(p.usdExchangeMarginBps)||p.usdExchangeMarginBps!==0)throw Error('Use quoted candy pricing and no extra exchange margin.');
 if(![p.baseCents,p.laborCents.dome,p.laborCents.heart,p.ribbonRoseCents,p.foamRoseCents,p.glitterCents,p.moneyStylingCents,...Object.values(p.extrasCents).filter(v=>v!==null)].every(cents)||!['replaces-base-and-labor','additional'].includes(p.moneyFeePolicy)||!cents(p.usdToCad.numerator)||!p.usdToCad.numerator||!cents(p.usdToCad.denominator)||!p.usdToCad.denominator)throw Error('Use explicit integer-cent prices, null quote items, a positive conversion ratio and a fee policy.');
 const priorFile=path.join(dest,'build-manifest.json'),prior=fs.existsSync(priorFile)?F.json(priorFile):null;
 if(fs.existsSync(dest)&&!['rays-satin-v1','rays-existing-builder-v2'].includes(prior?.factory))throw Error('Refusing to overwrite an unmanaged shop.');
 const prepared=new Map(),add=(name,bytes)=>{if(!/^[a-zA-Z0-9/._-]+$/.test(name)||name.includes('..'))throw Error('Invalid public path');prepared.set(name,Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes));};
 for(const file of core)add(file,fs.readFileSync(path.join(source,file)));
 add('embedded-loader.js','window.NEBULA_EMBED_READY=Promise.resolve();\n');
 for(const file of ['builder-runtime.js','builder-ui.js','builder-order-ui.js','builder-theme.css','pricing.js','commerce-core.js','payments-client.js','payments-home.js','payments.css','account.js','payment-status.js','account.html','payment-status.html','shop.css'])add(file,fs.readFileSync(path.join(client,file)));
 const paymentConfig=F.json(path.join(client,'payments-config.json'));
 if(Object.keys(paymentConfig).some(k=>!['endpoint','shopId','environment','firebase'].includes(k))||Object.keys(paymentConfig.firebase||{}).some(k=>!['apiKey','authDomain','projectId','appId'].includes(k)))throw Error('Only public payment configuration may be built. Keep all Square/server secrets in Cloudflare.');
 if(paymentConfig.shopId!=='raysbouquetz'||!['sandbox','production'].includes(paymentConfig.environment))throw Error('Invalid payment shop/environment');
 if(paymentConfig.endpoint){const u=new URL(paymentConfig.endpoint);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Payment endpoint must be a public HTTPS base URL.');}
 add('payments-config.js','window.NEBULA_PAYMENTS='+JSON.stringify(paymentConfig).replaceAll('<','\\u003c')+';\n');
 // The existing app prepares one bank per offered mode. Only the mode list is
 // scoped; interaction handlers and model algorithms remain the original ones.
 let app=fs.readFileSync(path.join(source,'app.js'),'utf8');
 const bankLoop="for(const mode of ['classic','dome','heart'])if(!banks[mode])";
 if(!app.includes(bankLoop))throw Error('Recheck the upstream mode-bank integration.');
 app=app.replace(bankLoop,"for(const mode of ['dome','heart'])if(!banks[mode])");add('app.js',app);
 const publicProfile={id:profile.id,name:store.name,logo:profile.logo,currency:'CAD',demo:true,studio:profile.studio,whatsapp:'',email:'',baseCents:0,laborCents:{classic:0,dome:0,heart:0},extrasCents:preview.pricing.extrasCents,theme:profile.theme,publicBaseUrl:''};
 add('shop-config.js','window.NEBULA_SHOP='+JSON.stringify(publicProfile)+';\n');
 const art={};for(const row of metadata){if(!/^[a-z0-9-]+-v1\.png$/.test(row.file)||row.file.startsWith('card-')||row.file.startsWith('folded-cad-'))continue;art[row.file]={width:row.width,height:row.height};add('art/'+row.file,fs.readFileSync(path.join(client,'public/art',row.file)));}
 const js=value=>JSON.stringify(value).replaceAll('<','\\u003c');
 add('store-data.js','window.RAY_STORE='+js(store)+';\nwindow.RAY_BUILDER='+js(preview)+';\nwindow.RAY_ART='+js(art)+';\n');
 add('assets/shop/logo.webp',fs.readFileSync(path.join(client,'public/logo.webp')));
 for(const d of store.designs)add(d.image,fs.readFileSync(path.join(client,'public',d.image)));
 const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(source,'asset-meta.js'),'utf8'),c);
 for(const id of ['extra_butterfly_gold','extra_crown_gold','sash_blank_blackband']){const url=c.window.NEBULA_META.finishes[id].url;add(url,fs.readFileSync(path.join(source,url)));}
 add('assets/halloween/black-bow-tails.webp',fs.readFileSync(path.join(source,'assets/halloween/black-bow-tails.webp')));
 for(const file of ['assets/fall/plush-snoopy.webp','assets/fall/plush-kitty.webp','assets/fall/topper-snoopy.webp','assets/finishes/extra_chocolate_gold.webp'])add(file,fs.readFileSync(path.join(source,file)));
 add('assets/money/folded-dollar-v1.png',fs.readFileSync(path.join(source,'demo-brand/money/folded-dollar-v1.png')));
 const cards=store.designs.map(d=>{
  const url='studio.html?template='+d.id;
  return '<article class="bouquet-card" data-bouquet="'+d.id+'"><a class="card-photo" href="'+url+'" aria-label="Customise '+F.escape(d.name)+'"><img src="'+d.image+'" alt="'+F.escape(d.name)+' — original Ray’s Bouquetz bouquet" width="450" height="600" loading="lazy"><span class="card-arrow" aria-hidden="true">↗</span></a><div class="card-info"><p class="card-kind">'+F.escape(d.kind)+'</p><h3><a href="'+url+'">'+F.escape(d.name)+'</a></h3><p class="card-description">'+F.escape(d.description)+'</p><div class="card-bottom"><strong>CAD $'+(d.targetCents/100).toFixed(2)+'</strong><span>Photo reference price</span></div><div class="card-actions"><a class="card-cta card-order" href="'+url+'&amp;action=order">Order</a><a class="card-cta card-customise" href="'+url+'">Customise ↗</a></div></div></article>';
 }).join('\n');
 add('index.html',fs.readFileSync(path.join(client,'index.html'),'utf8').replace('{{BOUQUET_CARDS}}',cards).replace('{{YEAR}}',String(new Date().getFullYear())).replace('</head>','<script src="payments-config.js" defer></script><script src="payments-home.js" defer></script></head>').replace('href="shop.css"','href="shop.css?v=rays-builder-7"'));
 const banner='<aside class="ray-preview"><p><strong>Ray’s owner preview</strong> · Confirmed recipes · Final quotes & Square connection pending.</p><details><summary>What still needs confirmation?</summary><ul id="rayAssumptions"></ul></details></aside>';
 for(const page of ['studio','order']){
  let html=fs.readFileSync(path.join(source,page+'.html'),'utf8');
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replaceAll('favicon.svg','assets/shop/logo.webp').replaceAll('type="image/svg+xml"','type="image/webp"').replaceAll('assets/brand/logo-mark.webp','assets/shop/logo.webp').replaceAll('Nebula — Your bouquet, your way','Ray’s Bouquetz — Your satin bouquet').replace('content="#f7f5ef"','content="#faf5f2"').replace('Arrange real photographic flowers, one stem at a time. A local, demo-priced design tool.','Customise handmade satin bouquets by Ray’s Bouquetz. Owner preview with draft CAD prices.');
  const scripts=['shop-config','payments-config',...shared,...(page==='studio'?['builder-ui','app','payments-client']:['order','builder-order-ui'])].map(file=>'<script src="'+file+'.js?v=rays-builder-7" defer></script>').join('');
  html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="builder-theme.css?v=rays-builder-7">'+scripts+'</head>');
  if(page==='studio')html=html.replace(/\s*<button data-mode="classic"[\s\S]*?<\/button>/,'').replace('</header>','</header>'+banner).replace('<option value="en">EN</option><option value="es">ES</option>','<option value="en">EN</option>');
  html=html.replace('</body>','<div class="ray-builder-credit">Bouquet studio by <a href="https://nebulastudio.site/flowers/">Nebula Sites Studio</a></div></body>');
  add(page+'.html',html);
 }
 const files={};for(const [name,bytes]of prepared){const full=path.resolve(dest,name);if(!full.startsWith(dest+path.sep))throw Error('Invalid output path');fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,bytes);files[name]=crypto.createHash('sha256').update(bytes).digest('hex');}
 // Remove only obsolete files tracked by this managed shop's prior manifest.
 for(const name of Object.keys(prior?.files||{})){if(prepared.has(name))continue;const file=path.resolve(dest,name);if(!file.startsWith(dest+path.sep))throw Error('Invalid prior manifest path');if(fs.existsSync(file)&&fs.statSync(file).isFile())fs.unlinkSync(file);}
 const report={factory:'rays-existing-builder-v2',profile:'raysbouquetz',mode:'preview',runtime:'existing Nebula builder',assetsReady:true,artworkApproved:false,recipesReady:false,recipesDraft:true,recipeCountsConfirmed:true,pricingApproved:false,paymentsActive:false,unchangedEngines:['dome-engine-v2.js','template-engine.js','geometry.js','model.js','renderer.js','design-link.js','saved-bouquets.js'],files};
 F.write(path.join(dest,'build-manifest.json'),report);return {...report,files:Object.keys(files).length,url:'/shops/raysbouquetz/'};
}
module.exports={build};if(require.main===module)console.log(JSON.stringify(build(),null,2));
