const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'artwork/strawberry-visual-v2');
const {sources}=require(path.join(dir,'generation.json'));
(async()=>{
 for(const job of sources){
  const input=path.join(dir,job.file);if(!fs.existsSync(input))fs.copyFileSync(job.source,input);
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;
   if(a>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  if(transparent<info.width*info.height*.1)throw new Error('Missing transparent background: '+input);
  // Same 420px box and 94% longest-side registration as the accepted release.
  // No changes to the runtime diameter, spacing, centre, depth or radius cap.
  const body=await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(395,395,{fit:'inside'}).png().toBuffer();
  const m=await sharp(body).metadata();
  await sharp({create:{width:420,height:420,channels:4,background:'#00000000'}}).composite([{input:body,left:Math.floor((420-m.width)/2),top:Math.floor((420-m.height)/2)}]).webp({quality:92,alphaQuality:100,effort:6}).toFile(path.join(root,job.runtime));
  console.log(job.runtime);
 }
 const file=path.join(root,'asset-meta.js'),meta=JSON.parse(fs.readFileSync(file,'utf8').split('=',2)[1].trim().replace(/;$/,''));
 meta.flowers.__berry.domeHeads=sources.slice(0,3).map(j=>j.runtime);
 meta.flowers.__berry.domeEdgeHeads=sources.slice(3).map(j=>j.runtime);
 fs.writeFileSync(file,'window.NEBULA_META='+JSON.stringify(meta)+';\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
