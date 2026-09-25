/* Turn a hard key into artwork with a clean, smooth edge.

   A binary threshold over a JPEG leaves two visible defects: the contour wobbles
   with the compression blocks, and the edge is aliased. Both read as "chewed"
   paper once the wrap is drawn at size.

   Three passes, and the order is what matters:
   1. SMOOTH  - morphological close then open on the mask, done with blur+threshold.
      Closing fills the notches the blocks punched in; opening shaves the matching
      pimples back off. The contour comes out following the paper, not the codec.
   2. BLEED   - copy colour outward from the edge into the transparent side. Skipping
      this is what smeared black halos across earlier attempts: transparent pixels
      carry black RGB, and the next pass mixes them back in.
   3. FEATHER - only now is a sub-pixel blur of the mask safe, and it is what makes
      the edge read as photographed rather than cut out.
*/
const sharp=require('sharp');

/* sharp widens a single-channel raw buffer to three on the way out of blur(), so the
   result is pulled back to one channel before it is read as a mask. Indexing the
   three-channel buffer as if it were one is silent and wipes the whole mask. */
async function blurMask(mask,w,h,sigma){
 return sharp(Buffer.from(mask),{raw:{width:w,height:h,channels:1}})
  .blur(sigma).toColourspace('b-w').raw().toBuffer();
}

/* radius>0 dilates, radius<0 erodes */
async function morph(mask,w,h,radius){
 const out=await blurMask(mask,w,h,Math.abs(radius));
 const cut=radius>0?90:170;
 const res=Buffer.alloc(w*h);
 for(let k=0;k<w*h;k++)res[k]=out[k]>=cut?255:0;
 return res;
}

async function refine(img,{smooth=2,bleed:bleedPasses=3,feather=0.9}={}){
 const {data,w,h,c}=img,N=w*h;
 let mask=Buffer.alloc(N);
 for(let k=0;k<N;k++)mask[k]=data[k*c+3]>128?255:0;

 if(smooth>0){
  mask=await morph(mask,w,h,smooth);    /* dilate — fill codec notches */
  mask=await morph(mask,w,h,-smooth);   /* erode  — take the bulge back */
  mask=await morph(mask,w,h,-smooth);   /* erode  — shave pimples */
  mask=await morph(mask,w,h,smooth);    /* dilate — restore the size */
 }

 const solid=Uint8Array.from(mask);
 for(let pass=0;pass<bleedPasses;pass++){
  const next=Uint8Array.from(solid);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const k=y*w+x;if(solid[k])continue;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const nk=ny*w+nx;if(!solid[nk])continue;
    data[k*c]=data[nk*c];data[k*c+1]=data[nk*c+1];data[k*c+2]=data[nk*c+2];
    next[k]=255;break;
   }
  }
  solid.set(next);
 }

 const soft=feather>0?await blurMask(mask,w,h,feather):mask;
 for(let k=0;k<N;k++)data[k*c+3]=soft[k];
 return img;
}

module.exports={refine};
