/* Assemble delivery files only; originals and development evidence stay in the repo. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(os.tmpdir(),'nebula-launch-')),stage=path.join(work,'nebula-bouquet-studio');fs.mkdirSync(stage);
const files=[];
for(const name of fs.readdirSync(root))if(/\.(js|css|html|svg)$/.test(name))files.push(name);
function scan(dir){for(const n of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const rel=dir+'/'+n.name;if(n.isDirectory())scan(rel);else if(/\.(webp|svg|jpg)$/.test(n.name))files.push(rel);}}
scan('assets');files.push('assets/catalog/sources.json','docs/CONNECTED-BUILDER-2026-10-09.md','README.md','SHOP-SETUP.md','docs/LAUNCH-2026-10-07.md','docs/FLORIST-WALKTHROUGH-2026-10-08.md','docs/COLLECTION-PREVIEWS-2026-10-08.md','docs/HALLOWEEN-LAYOUT.md','docs/MIDNIGHT-ASSET-NEXT-STEPS.md','docs/ARCHITECTURE.md','docs/FOR-LOVE-2026-10-05.md','docs/FALL-IMPLEMENTATION-2026-10-05.md','docs/HALLOWEEN-ASSET-PROMPTS.md','docs/ROMANTIC-ASSET-PROMPTS.md','docs/halloween-plan.html');
const hashes={};for(const rel of files.sort()){const bytes=fs.readFileSync(path.join(root,rel));if(rel.endsWith('.js'))new vm.Script(bytes.toString('utf8'),{filename:rel});const dest=path.join(stage,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);hashes[rel]=crypto.createHash('sha256').update(bytes).digest('hex');}
fs.writeFileSync(path.join(stage,'SHA256SUMS.txt'),Object.entries(hashes).map(([file,hash])=>hash+'  '+file).join('\n')+'\n');
const info={stage,work,zip:path.resolve(root,'..','nebula-bouquet-studio-2026-10-09-final.zip'),files:files.length,hashes};
const result=path.join(root,'tests/launch-final/package.json');fs.mkdirSync(path.dirname(result),{recursive:true});fs.writeFileSync(result,JSON.stringify(info,null,2));console.log(JSON.stringify({stage,work,zip:info.zip,files:info.files}));
