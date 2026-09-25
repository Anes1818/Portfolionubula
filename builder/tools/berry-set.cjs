/* Normalise the four supplied berries so ONE rotation rule places all of them.

   Each photo was shot at its own lean. The dome turns every berry so its tip points
   at the bouquet's centre, and that only works if every image starts from the same
   pose. So each berry's axis is measured - calyx centroid (the green pixels) to its
   tip (the red pixel farthest from that centroid) - and the image is turned until
   the axis points straight down: calyx up, tip down.

   Relative sizes are kept on purpose. The prompt asked for one smaller berry and
   one larger; a common scale factor, not per-berry fitting, preserves that. */
const sharp=require('sharp');
const BOX=420;
async function axis(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=info;
 let gx=0,gy=0,gn=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*c;if(data[i+3]<128)continue;
  const R=data[i],G=data[i+1],B=data[i+2];
  if(G>R*1.05&&G>B)(gx+=x,gy+=y,gn++);
 }
 gx/=gn;gy/=gn;
 let tx=0,ty=0,best=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*c;if(data[i+3]<128)continue;
  if(!(data[i]>data[i+1]*1.2))continue;
  const d=(x-gx)**2+(y-gy)**2;if(d>best){best=d;tx=x;ty=y;}
 }
 return {angle:Math.atan2(ty-gy,tx-gx)*180/Math.PI,len:Math.sqrt(best)};
}
(async()=>{
 const turned=[];
 for(let i=1;i<=4;i++){
  const f='incoming/berry-'+i+'.webp',a=await axis(f);
  const turn=90-a.angle;
  const buf=await sharp(f).rotate(turn,{background:{r:0,g:0,b:0,alpha:0}}).trim({threshold:4}).png().toBuffer();
  const m=await sharp(buf).metadata();
  turned.push({buf,w:m.width,h:m.height,turn});
  console.log('  حبة '+i+': المحور '+a.angle.toFixed(0)+'°  تدوير '+turn.toFixed(0)+'°  →  '+m.width+'×'+m.height);
 }
 const scale=BOX*0.92/Math.max(...turned.map(t=>Math.max(t.w,t.h)));
 for(let i=0;i<4;i++){
  const t=turned[i],w=Math.round(t.w*scale),h=Math.round(t.h*scale);
  const body=await sharp(t.buf).resize(w,h).toBuffer();
  await sharp({create:{width:BOX,height:BOX,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite([{input:body,left:(BOX-w)>>1,top:(BOX-h)>>1}])
   .webp({quality:90,alphaQuality:100,effort:6}).toFile('incoming/strawberry-'+(i+1)+'.webp');
 }
 /* check: after normalising, every calyx must sit above its tip */
 for(let i=1;i<=4;i++){
  const a=await axis('incoming/strawberry-'+i+'.webp');
  console.log('  تحقق '+i+': المحور الآن '+a.angle.toFixed(0)+'° '+(Math.abs(a.angle-90)<12?'✅ الرأس تحت':'⚠️'));
 }
 const tiles=[];
 for(let i=1;i<=4;i++)tiles.push({input:'incoming/strawberry-'+i+'.webp',left:(i-1)*BOX,top:0});
 await sharp({create:{width:BOX*4,height:BOX,channels:4,background:{r:245,g:243,b:238,alpha:1}}})
  .composite(tiles).jpeg({quality:88}).toFile('output/_berries-norm.jpg');
})();
