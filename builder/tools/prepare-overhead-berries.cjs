/* Package reviewed transparent imagegen outputs; never infer an alpha mask here.
   Run from the repo root with NODE_PATH pointing to the bundled sharp package. */
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const jobs=[
 ['berry-overhead-1.png','heads/strawberry-overhead-1.webp',420,.94],
 ['berry-overhead-2.png','heads/strawberry-overhead-2.webp',420,.94],
 ['dome-ivory-ruffle.png','wrapping/dome-ivory-ruffle.webp',960,.96]
];
(async()=>{
 for(const [input,output,size,fill] of jobs){
  const file=path.join(root,'artwork/overhead-berries',input);
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)transparent++;
   if(alpha>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  if(!transparent||right<=left)throw new Error('Expected a genuine transparent cutout: '+input);
  const body=await sharp(file).extract({left,top,width:right-left+1,height:bottom-top+1})
   .resize(Math.round(size*fill),Math.round(size*fill),{fit:'inside'}).png().toBuffer();
  const m=await sharp(body).metadata(),dest=path.join(root,'assets',output);
  await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}})
   .composite([{input:body,left:Math.floor((size-m.width)/2),top:Math.floor((size-m.height)/2)}])
   .webp({quality:92,alphaQuality:100,effort:6}).toFile(dest);
  console.log(output,fs.statSync(dest).size+' bytes',Math.round(transparent/(info.width*info.height)*100)+'% source transparent');
 }
 const file=path.join(root,'asset-meta.js'),meta=JSON.parse(fs.readFileSync(file,'utf8').split('=',2)[1].trim().replace(/;$/,''));
 Object.assign(meta.flowers.__berry,{
  head:'assets/heads/strawberry-overhead-1.webp',
  heads:['assets/heads/strawberry-overhead-1.webp','assets/heads/strawberry-overhead-2.webp'],
  headWidth:420,headHeight:420,headRadius:.49,headView:'overhead',
  identityNote:'Two user-generated overhead strawberries, transparently extracted with imagegen. Stem ends concealed. Classic retains separate side-view assets.'
 });
 meta.collars.domeIvory={url:'assets/wrapping/dome-ivory-ruffle.webp',width:960,height:960,source:'artwork/overhead-berries/dome-ivory-ruffle.png'};
 fs.writeFileSync(file,'window.NEBULA_META='+JSON.stringify(meta)+';\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
