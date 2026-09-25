/* Turn one pre-cut wrap photograph into the back/front pair Classic stacks.

   Usage: node tools/wrap-register.cjs <name> <src.png>

   The source arrives already cut out, so there is nothing to key - the whole job
   is registration. classicFrame() hardcodes the ivory paper's geometry (waist
   448,850 / rim 449,600 / mouthHalf 0.4526), so rather than thread a per-wrap
   frame through that measured code, each new photo is resampled until its paper
   box lands exactly where the ivory's does. Paper is soft and featureless, so the
   aspect nudge that costs is invisible, and every downstream constant keeps
   working untouched.

   The FRONT layer is then the registered paper cut by the ivory front's own
   alpha. Automatic lip detection was tried and abandoned upstream - kraft is so
   uniform the fold carries almost no gradient - and because both layers now
   occupy the identical box, intersecting with the shipped ivory mouth is exact
   rather than approximate, and can never spill outside the new paper.
*/
const sharp=require('sharp');
const {refine}=require('./refine.cjs');
const W=896,H=1200;

async function raw(src){
 const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return {data,w:info.width,h:info.height,c:info.channels};
}
function box({data,w,h,c},thr=24){
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*c+3]>thr){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
 return {x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};
}

(async(name,src)=>{
 const iv={back:'assets/classic/wrap-ivory-back.webp',front:'assets/classic/wrap-ivory-front.webp'};
 const fs=require('fs');
 /* the shipped ivory lives in the bundle, not on disk - pull it back out */
 global.window={};eval(fs.readFileSync('assets-bundle.js','utf8'));
 const E=window.NEBULA_EMBED,pull=k=>Buffer.from(E[k].split(',')[1],'base64');

 const ivBack=await raw(pull(iv.back)),ivFront=await raw(pull(iv.front));
 const target=box(ivBack);
 console.log('صندوق العاجي المرجعي:',target.x0+','+target.y0,'→',target.w+'×'+target.h);

 let img=await raw(src);
 img=await refine(img,{smooth:2,bleed:3,feather:0.9});
 const b=box(img);
 console.log('الورقة الجديدة      :',b.w+'×'+b.h,' (نسبة '+(b.w/b.h).toFixed(2)+' مقابل '+(target.w/target.h).toFixed(2)+')');

 /* crop to its own content, stretch onto the ivory's box, drop on the canvas */
 const fitted=await sharp(Buffer.from(img.data),{raw:{width:img.w,height:img.h,channels:img.c}})
  .extract({left:b.x0,top:b.y0,width:b.w,height:b.h})
  .resize({width:target.w,height:target.h,fit:'fill',kernel:'lanczos3'})
  .png().toBuffer();
 const back=await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:fitted,left:target.x0,top:target.y0}]).raw().toBuffer({resolveWithObject:true});

 /* front = the same paper, cut by the ivory mouth */
 const bd=back.data,fd=Buffer.from(bd);
 for(let k=0;k<W*H;k++)fd[k*4+3]=Math.min(bd[k*4+3],ivFront.data[k*ivFront.c+3]);

 for(const [side,buf] of [['back',bd],['front',fd]]){
  const out=`incoming/newpaper/wrap-${name}-${side}.webp`;
  await sharp(Buffer.from(buf),{raw:{width:W,height:H,channels:4}})
   .webp({quality:92,alphaQuality:100}).toFile(out);
  const bb=box({data:buf,w:W,h:H,c:4});
  console.log(side.padEnd(6),'→',(fs.statSync(out).size/1024|0)+'KB  صندوق '+bb.w+'×'+bb.h+' عند '+bb.x0+','+bb.y0);
 }

 /* proof: back, a stand-in bouquet, then front - exactly the renderer's order */
 const blooms=Buffer.from(`<svg width="${W}" height="${H}"><ellipse cx="449" cy="420" rx="300" ry="205" fill="#b8342c"/></svg>`);
 /* composite at full size first - sharp resizes the base BEFORE compositing, so
    chaining .resize() here would shrink the canvas out from under the layers */
 const stacked=await sharp({create:{width:W,height:H,channels:4,background:{r:242,g:238,b:232,alpha:1}}})
  .composite([{input:`incoming/newpaper/wrap-${name}-back.webp`},{input:blooms},{input:`incoming/newpaper/wrap-${name}-front.webp`}])
  .png().toBuffer();
 await sharp(stacked).resize(360).jpeg({quality:82}).toFile(`incoming/newpaper/_proof-${name}.jpg`);
 console.log('معاينة: incoming/newpaper/_proof-'+name+'.jpg\n');
})(process.argv[2],process.argv[3]);
