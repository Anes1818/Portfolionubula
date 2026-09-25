/* Register the kraft wrap: copy the art in, add it to the metadata and embed it. */
const fs=require('fs');
const A='assets/classic/wrap-kraft-';

/* 1. artwork into the source tree */
fs.mkdirSync('originals/new-assets',{recursive:true});
for(const side of ['front','back'])
 fs.copyFileSync(`incoming/wrap-kraft/wrap-kraft-${side}.webp`,`originals/new-assets/wrap-kraft-${side}.webp`);

/* 2. metadata — kraft shares the ivory geometry, so only the layer paths differ */
let meta=fs.readFileSync('asset-meta.js','utf8');
const m=meta.match(/window\.NEBULA_META=([\s\S]*);?\s*$/);
const obj=JSON.parse(m[1].replace(/;\s*$/,''));
obj.wraps.kraft={back:A+'back.webp',front:A+'front.webp',label:'Kraft',
 source:'generated, keyed and aligned to the ivory paper box',
 mouthHalf:obj.wraps.ivory.mouthHalf,mouthProbeRow:obj.wraps.ivory.mouthProbeRow};
fs.writeFileSync('asset-meta.js','window.NEBULA_META='+JSON.stringify(obj)+';\n');
console.log('asset-meta.js  → wraps:',Object.keys(obj.wraps).join(', '));

/* 3. embed into the runtime bundle */
let b=fs.readFileSync('assets-bundle.js','utf8');
const add=[];
for(const side of ['front','back']){
 const key=A+side+'.webp';
 if(b.includes(JSON.stringify(key))){console.log('  موجود سلفًا:',key);continue;}
 const uri='data:image/webp;base64,'+fs.readFileSync(`originals/new-assets/wrap-kraft-${side}.webp`).toString('base64');
 add.push(JSON.stringify(key)+':'+JSON.stringify(uri));
}
if(add.length){
 b=b.replace(/\}\s*;?\s*$/,','+add.join(',')+'};\n');
 fs.writeFileSync('assets-bundle.js',b);
}
console.log('assets-bundle.js → +'+add.length+' صورة، الحجم',(fs.statSync('assets-bundle.js').size/1048576).toFixed(1)+' MB');
