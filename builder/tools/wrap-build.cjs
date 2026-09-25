/* Build a wrap pair: key, smooth, align on the knot and frame to the ivory paper box.

   Usage: node tools/wrap-build.cjs <name> <frontSrc> <backSrc> [keyMode]
   keyMode "checker" (default) removes a baked transparency grid; "plain" removes a
   flat studio backdrop by colour distance. */
const sharp=require('sharp');
const {dekey,bbox}=require('./dekey.cjs');
const {refine}=require('./refine.cjs');
const W=896,H=1200,WAIST=[448,850];

/* Flat cream backdrop: fill from the border, with the tolerance set between the
   measured drop shadow and the paper itself. */
async function keyPlain(src,{tol=60}={}){
 const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=info;
 const bg=[data[0],data[1],data[2]];
 const near=k=>{const i=k*c;return (Math.abs(data[i]-bg[0])+Math.abs(data[i+1]-bg[1])+Math.abs(data[i+2]-bg[2]))/3<tol;};
 const isBg=new Uint8Array(w*h),st=[];
 for(let x=0;x<w;x++)st.push(x,(h-1)*w+x);
 for(let y=0;y<h;y++)st.push(y*w,y*w+w-1);
 while(st.length){
  const k=st.pop();if(isBg[k]||!near(k))continue;isBg[k]=1;
  const x=k%w,y=(k/w)|0;
  if(x>0)st.push(k-1);if(x<w-1)st.push(k+1);if(y>0)st.push(k-w);if(y<h-1)st.push(k+w);
 }
 for(let k=0;k<w*h;k++)data[k*c+3]=isBg[k]?0:255;
 return {data,w,h,c};
}

function waist(img,b){
 const {data,w,c}=img,rows=[];
 for(let y=b.y0;y<=b.y1;y++){
  let lo=-1,hi=-1;
  for(let x=b.x0;x<=b.x1;x++)if(data[(y*w+x)*c+3]>128){if(lo<0)lo=x;hi=x;}
  rows.push(lo<0?{y,width:0,cx:0}:{y,width:hi-lo+1,cx:(lo+hi)/2});
 }
 const maxW=Math.max(...rows.map(r=>r.width));
 let best=null;
 for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(!r.width||r.width>maxW*0.5||r.width<8)continue;
  if(Math.abs(r.cx-(b.x0+b.w/2))>b.w*0.15)continue;          /* the knot is central */
  if(r.y<b.y0+b.h*0.45)continue;                              /* not the thin top edge */
  if(rows.slice(i+1).filter(x=>x.width>0).length<60)continue; /* not the tail tip */
  if(!best||r.width<best.width)best=r;
 }
 return best||rows.filter(r=>r.width).reduce((a,b)=>a.width<b.width?a:b);
}

(async(name,frontSrc,backSrc,mode='checker')=>{
 const parts={};
 for(const [side,src] of [['front',frontSrc],['back',backSrc]]){
  let img=mode==='plain'?await keyPlain(src):await dekey(src);
  img=await refine(img);
  const b=bbox(img),k=waist(img,b);
  parts[side]={img,b,k};
  console.log(side.padEnd(6),'محتوى',b.w+'×'+b.h,' رقبة y='+k.y,'cx='+Math.round(k.cx));
 }
 const scale=880/Math.max(parts.front.b.w,parts.back.b.w);
 console.log('\nمعامل مشترك:',scale.toFixed(4));
 for(const side of ['front','back']){
  const {img,b,k}=parts[side];
  const cut=await sharp(Buffer.from(img.data),{raw:{width:img.w,height:img.h,channels:img.c}})
   .extract({left:b.x0,top:b.y0,width:b.w,height:b.h})
   .resize({width:Math.round(b.w*scale),height:Math.round(b.h*scale)})
   .png().toBuffer();
  const left=Math.round(WAIST[0]-(k.cx-b.x0)*scale), top=Math.round(WAIST[1]-(k.y-b.y0)*scale);
  await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite([{input:cut,left,top}])
   .webp({quality:94,alphaQuality:100})
   .toFile(`incoming/${name}/${name}-${side}.webp`);
  console.log(side.padEnd(6),'→ 896×1200 عند',left+','+top);
 }
 const flowers=Buffer.from(`<svg width="896" height="1200"><ellipse cx="448" cy="330" rx="300" ry="215" fill="#c0392b" opacity="0.9"/></svg>`);
 await sharp({create:{width:W,height:H,channels:4,background:{r:255,g:255,b:255,alpha:1}}})
  .composite([{input:`incoming/${name}/${name}-back.webp`},{input:flowers},{input:`incoming/${name}/${name}-front.webp`}])
  .png().toFile(`incoming/${name}/_proof.png`);
 console.log('\nمعاينة: incoming/'+name+'/_proof.png');
})(process.argv[2],process.argv[3],process.argv[4],process.argv[5]);
