const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const Kit=require('../../shop-build-kit.js');
const reserved=new Set(['la-flor-eterna','nebula-demo','builder','demo','admin','assets','api']);
function id(value){if(typeof value!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)||value.length>60||reserved.has(value))throw Error('Use a unique lowercase shop ID, e.g. rose-house. Existing shop IDs are protected.');return value;}
function json(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n');}
const clean=(s,n=150)=>typeof s==='string'?s.replace(/[\x00-\x1f<>]/g,'').trim().slice(0,n):'';
const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
function prices(source){const out={};for(const [key,value]of Object.entries(source||{})){if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)||['__proto__','constructor','prototype'].includes(key)||!cents(value))throw Error('Invalid price: '+key);out[key]=value;}return out;}
function normalize(data,shopId){
 const c=data.nebulaShopConfig||{},name=clean(data.shopName||c.name),currency=clean(data.currency||c.currency,3).toUpperCase();
 if(!name)throw Error('Shop name is missing.');
 if(!/^[A-Z]{3}$/.test(currency))throw Error('Currency is missing or invalid.');
 const fmt=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions();if(fmt.maximumFractionDigits!==2||fmt.minimumFractionDigits!==2)throw Error('The builder currently requires a two-decimal currency.');
 const channel=data.channel||c.requestChannel,phone=clean(data.phone||c.recipient||c.whatsapp,30),digits=phone.replace(/\D/g,'');
 if(!['sms','whatsapp'].includes(channel)||!/^\+?[1-9][0-9 ()-]{7,25}$/.test(phone)||!/^[1-9]\d{7,14}$/.test(digits))throw Error('Confirm SMS/WhatsApp and an international phone number including country code.');
 const theme={};for(const key of ['background','surface','soft','ink','primary','border'])if(/^#[0-9a-f]{6}$/i.test(c.theme?.[key]||''))theme[key]=c.theme[key];
 const modes=(c.enabledModes||['classic','dome','heart']).filter(m=>['classic','dome','heart'].includes(m));if(!modes.length)throw Error('Choose at least one supported bouquet mode.');
 return {id:shopId,name,byline:clean(c.byline),currency,demo:true,requestChannel:channel,recipient:'+'+digits,whatsapp:channel==='whatsapp'?digits:'',email:'',website:'https://nebulastudio.site/shops/'+shopId+'/',publicBaseUrl:'https://nebulastudio.site/shops/'+shopId+'/',logo:'assets/shop/logo.svg',studio:{name,site:'nebulastudio.site/shops/'+shopId,phone:'+'+digits,instagram:clean(data.instagram||c.studio?.instagram,80),place:clean(c.studio?.place),year:String(new Date().getFullYear())},baseCents:cents(c.baseCents)?c.baseCents:null,laborCents:prices(c.laborCents),flowerPrices:prices(c.flowerPrices),extrasCents:prices(c.extrasCents),disabledFlowers:(c.disabledFlowers||[]).filter(k=>typeof k==='string'),disabledExtras:(c.disabledExtras||[]).filter(k=>typeof k==='string'),enabledModes:modes,languages:(data.builderLanguages||['en','es']).filter(k=>['en','es'].includes(k)),fulfillment:['pickup','delivery','both'].includes(data.fulfillment)?data.fulfillment:'both',theme,selectedRecipeIds:[],review:{scopeApproved:false,pricesApproved:false,catalogApproved:false,artworkApproved:false,fulfillmentApproved:false,recipientTested:false,launchApproved:false,approvedBy:'',approvedAt:''}};
}
function image(data){
 const match=typeof data==='string'&&data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!match)throw Error('Upload must be a PNG, JPEG or WebP image.');
 const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>10*1024*1024)throw Error('Image exceeds the 10 MB limit.');
 const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)throw Error('Image format does not match its contents.');
 return {bytes,ext:match[1]==='jpeg'?'jpg':match[1]};
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function args(argv){const out={};for(let i=0;i<argv.length;i++){if(!argv[i].startsWith('--'))throw Error('Unexpected argument '+argv[i]);const k=argv[i].slice(2);out[k]=argv[i+1]&&!argv[i+1].startsWith('--')?argv[++i]:true;}return out;}
module.exports={root,Kit,id,json,write,clean,cents,normalize,image,escape,args};
