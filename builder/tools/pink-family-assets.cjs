/* Publish only individually inspected art; masters, source paths and review notes
   stay in clients/. This does not activate or approve a photographic recipe. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function buildAssets(client,write){
 const root=path.resolve(client,'assets/pink-family'),manifestPath=path.join(root,'asset-manifest.json');
 if(!fs.existsSync(manifestPath))return;
 const source=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(source.family!=='lfe-pink-gingham'||source.version!==1||!Array.isArray(source.assets))throw Error('Invalid pink asset family');
 const assets=[],ids=new Set();
 for(const asset of source.assets){
  if(asset.status!=='accepted-for-proof')continue;
  if(!/^[a-z][a-z0-9-]+$/.test(asset.id)||ids.has(asset.id)||asset.filename!==asset.id+'.png'||asset.master!=='masters/'+asset.filename)throw Error('Invalid photographic asset path or duplicate id');
  ids.add(asset.id);
  if(![asset.width,asset.height].every(n=>Number.isInteger(n)&&n>0&&n<=8192))throw Error('Invalid measured asset dimensions');
  for(const key of ['crop','alphaBounds']){
   const box=asset[key];if(!Array.isArray(box)||box.length!==4||box.some(n=>!Number.isInteger(n))||box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||box[0]+box[2]>asset.width||box[1]+box[3]>asset.height)throw Error('Invalid measured '+key);
  }
  for(const key of ['pivot','attachmentAnchor','flowerCenter']){
   const point=asset[key];if(!Array.isArray(point)||point.length!==2||point.some(n=>!Number.isFinite(n))||point[0]<0||point[1]<0||point[0]>=asset.width||point[1]>=asset.height)throw Error('Invalid authored '+key);
  }
  if(asset.inspection?.hasAlpha!==true)throw Error('Photographic asset needs verified alpha');
  const bytes=fs.readFileSync(path.join(root,asset.master));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Inspected asset changed: '+asset.id);
  // PNG dimensions are verified without an imaging dependency in the build.
  if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==asset.width||bytes.readUInt32BE(20)!==asset.height)throw Error('Master does not match inspected PNG dimensions');
  const url='assets/client/pink-family/'+asset.filename;
  write(url,bytes);
  assets.push({id:asset.id,url,sha256:asset.sha256,width:asset.width,height:asset.height,crop:asset.crop,alphaBounds:asset.alphaBounds,pivot:asset.pivot,attachmentAnchor:asset.attachmentAnchor,flowerCenter:asset.flowerCenter,view:asset.view});
 }
 write('assets/client/pink-family/manifest.json',JSON.stringify({family:source.family,version:source.version,recipeReady:false,assets},null,2)+'\n');
}
module.exports={buildAssets};
