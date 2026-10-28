/* Import a private admin export; produce a reviewable, isolated client project. */
const fs=require('node:fs'),path=require('node:path'),F=require('../shop-factory/core.cjs');
function create({from,id}){
 id=F.id(id);if(!from||typeof from!=='string')throw Error('Usage: node builder/tools/create-client.cjs --from "shop-build-kit.json" --id shop-id');
 const input=path.resolve(from);if(fs.statSync(input).size>30*1024*1024)throw Error('Build kit exceeds 30 MB.');
 const raw=F.json(input);if(raw.kind&&raw.kind!=='nebula-shop-build-kit')throw Error('Unsupported build kit.');if(raw.kind&&raw.version!==1)throw Error('Unsupported build kit version.');
 const data=raw.kind?raw.intake:raw,kit=F.Kit.make(data),profile=F.normalize(data,id);
 const client=path.join(F.root,'clients',id),privateDir=path.join(F.root,'.private/onboarding',id);
 if(fs.existsSync(client)||fs.existsSync(privateDir)||fs.existsSync(path.join(F.root,'shops',id)))throw Error('Shop ID already exists. Choose a new ID; existing work is never overwritten.');
 const photos=[];if(data.logoDataUrl)photos.push({file:'logo',...F.image(data.logoDataUrl),public:true});
 for(const [i,b]of (data.signatureBouquets||[]).entries())if(b.photoDataUrl)photos.push({file:'bouquet-'+(i+1),...F.image(b.photoDataUrl)});
 for(const [i,b]of (data.customAssetRequests?.items||[]).entries())if(b.photoDataUrl)photos.push({file:'custom-'+(i+1),...F.image(b.photoDataUrl)});
 // Validate all data before creating files. Only the submitted logo is initially public.
 for(const p of photos){const file=p.file+'.'+p.ext;F.write(path.join(privateDir,'references',file),p.bytes);if(p.public){fs.mkdirSync(path.join(client,'public'),{recursive:true});fs.writeFileSync(path.join(client,'public',file),p.bytes);profile.logo='assets/shop/'+file;}}
 if(!photos.some(p=>p.public))F.write(path.join(client,'public/logo.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="120" fill="#f1e9ed"/><text x="120" y="142" text-anchor="middle" font-family="Georgia" font-size="65" fill="#513c4b">'+F.escape(profile.name.slice(0,2).toUpperCase())+'</text></svg>');
 F.write(path.join(privateDir,'intake.json'),data);F.write(path.join(privateDir,'AI-HANDOFF.md'),kit.brief);
 F.write(path.join(client,'profile.json'),profile);
 F.write(path.join(client,'bouquets.json'),{version:1,recipes:[],instructions:'Choose library IDs from builder/shop-factory/library.json. Map each supplied photo explicitly; do not guess a recreation.'});
 F.write(path.join(client,'README.md'),'# '+profile.name+'\n\nPrivate intake: `.private/onboarding/'+id+'/`. Read `docs/SHOP-FACTORY.md`.\n\n1. Review the intake and refs.\n2. Select supported library IDs in bouquets.json.\n3. Review profile prices, disabled options, language and fulfillment.\n4. Run `node builder/tools/build-client.cjs --id '+id+'`.\n5. Test the draft, record approvals, then run with `--live`.\n\nNever change another shop. No subscription is started by these commands.\n');
 const report={shopId:id,client:'clients/'+id,privateIntake:'.private/onboarding/'+id,missing:kit.missing,unsupportedLanguages:(data.builderLanguages||[]).filter(k=>!['en','es'].includes(k)),customWorkRequested:!!data.customAssetRequests?.wantsNewAssets,domainQuoteRequested:!!data.plan?.customDomainQuoteRequested,next:'Choose recipes and review profile.json; then build-client.cjs --id '+id};
 F.write(path.join(privateDir,'import-report.json'),report);return report;
}
if(require.main===module){try{console.log(JSON.stringify(create(F.args(process.argv.slice(2))),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={create};
