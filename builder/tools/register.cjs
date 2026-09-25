/* Register a prepared asset: copy into the source tree, patch asset-meta and embed it. */
const fs=require('fs');
function embed(pairs){
 let b=fs.readFileSync('assets-bundle.js','utf8');
 const add=[];
 for(const [key,file] of pairs){
  if(b.includes(JSON.stringify(key))){
   /* replace an existing entry in place */
   const uri='data:image/webp;base64,'+fs.readFileSync(file).toString('base64');
   const i=b.indexOf(JSON.stringify(key)+':');
   const a=b.indexOf('"data:',i)+1,z=b.indexOf('"',a);
   b=b.slice(0,a)+uri+b.slice(z);
   console.log('  ↻ استُبدل:',key);
  }else{
   add.push(JSON.stringify(key)+':'+JSON.stringify('data:image/webp;base64,'+fs.readFileSync(file).toString('base64')));
   console.log('  + أُضيف :',key);
  }
 }
 if(add.length)b=b.replace(/\}\s*;?\s*$/,','+add.join(',')+'};\n');
 fs.writeFileSync('assets-bundle.js',b);
 console.log('  bundle:',(fs.statSync('assets-bundle.js').size/1048576).toFixed(1)+' MB');
}
function meta(fn){
 const s=fs.readFileSync('asset-meta.js','utf8');
 const obj=JSON.parse(s.match(/window\.NEBULA_META=([\s\S]*?);\s*$/)[1]);
 fn(obj);
 fs.writeFileSync('asset-meta.js','window.NEBULA_META='+JSON.stringify(obj)+';\n');
 return obj;
}
module.exports={embed,meta};
