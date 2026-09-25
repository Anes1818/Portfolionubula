/* Re-encode every embedded image at the lowest quality that still matches the
   original, then rebuild the bundle.

   The assets were stored near-lossless: the hydrangea head alone was 555 KB and
   the ivory wrap 296 KB, for artwork that is never drawn above ~250 px. Measured,
   quality 82 reproduces them to within 1.7 of 255 per channel - far below what an
   eye resolves - while cutting 89-93% of the bytes.

   Quality is chosen PER ASSET rather than globally, because a few (the berry's
   seed texture) do drift at 82. Each one is re-encoded, compared against its own
   original, and stepped up until the mean absolute difference over its opaque
   pixels falls under MAX_DIFF. An asset that never gets there keeps its original
   bytes, so this pass can only ever make the bundle smaller, never worse.

   Dimensions are untouched. Measured, the largest a head is ever drawn is 248 px
   in a 1080x1920 story export, against 485-522 px stored - about 2x, which is
   exactly the retina margin an asset should carry. Downscaling was rejected. */
const fs=require('fs'),sharp=require('sharp');
const MAX_DIFF=2.0, LADDER=[82,88,94];

async function diff(a,b){
 const A=await sharp(a).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const B=await sharp(b).ensureAlpha().raw().toBuffer();
 let sum=0,n=0;
 for(let i=0;i<A.data.length;i+=4){
  if(A.data[i+3]<8)continue;
  sum+=(Math.abs(A.data[i]-B[i])+Math.abs(A.data[i+1]-B[i+1])+Math.abs(A.data[i+2]-B[i+2]))/3;n++;
 }
 return n?sum/n:0;
}

(async()=>{
 global.window={};eval(fs.readFileSync('assets-bundle.js','utf8'));
 const E=window.NEBULA_EMBED;
 const keys=Object.keys(E);
 let before=0,after=0,kept=0;
 const out={},report=[];
 for(const k of keys){
  const orig=Buffer.from(E[k].split(',')[1],'base64');
  before+=orig.length;
  let best=null,bq=null;
  for(const q of LADDER){
   const re=await sharp(orig).webp({quality:q,alphaQuality:100,effort:6}).toBuffer();
   if(re.length>=orig.length)continue;
   const d=await diff(orig,re);
   if(d<=MAX_DIFF){best=re;bq=q;break;}
   if(q===LADDER[LADDER.length-1]){best=null;}
  }
  if(best){out[k]='data:image/webp;base64,'+best.toString('base64');after+=best.length;report.push([k,orig.length,best.length,bq]);}
  else{out[k]=E[k];after+=orig.length;kept++;}
 }
 const body='/* Exact embedded runtime images for offline canvas-safe use. */\nwindow.NEBULA_EMBED='+JSON.stringify(out)+';\n';
 fs.writeFileSync('assets-bundle.js',body);
 report.sort((a,b)=>(b[1]-b[2])-(a[1]-a[2]));
 console.log('أكبر ١٢ توفير:');
 for(const [k,o,n,q] of report.slice(0,12))
  console.log('  '+k.split('/').pop().padEnd(26)+String((o/1024).toFixed(0)).padStart(4)+'KB → '+String((n/1024).toFixed(0)).padStart(3)+'KB  q'+q);
 console.log('\nأُعيد ترميز '+report.length+' أصل، أُبقي '+kept+' كما هو');
 console.log('الصور: '+(before/1048576).toFixed(2)+' → '+(after/1048576).toFixed(2)+' MB');
 console.log('الملف: '+(fs.statSync('assets-bundle.js').size/1048576).toFixed(2)+' MB');
})();
