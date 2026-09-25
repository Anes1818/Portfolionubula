/* Remove a baked-in transparency checkerboard.

   Gemini exports JPEG, so the "transparent" background arrives as a real grey
   checkerboard painted into the pixels. Colour distance cannot separate it - cream
   paper sits very close to the light squares - but saturation can: the checker is
   pure grey (R=G=B, 0% saturation) and every real material here carries colour.

   Flood filling from the border on top of that keeps enclosed highlights and any
   grey detail that belongs to the subject.
*/
const sharp=require('sharp');

const sat=(r,g,b)=>{const mx=Math.max(r,g,b);return mx?(mx-Math.min(r,g,b))/mx*100:0;};

/* The two checker greys differ from export to export - one image renders them at
   255/188, another at 176/116 - so they are detected from the border rather than
   assumed. Matching those two values specifically (instead of "any grey") is what
   lets a black satin sash survive: black is grey too, just not one of these greys. */
async function dekey(src,{maxSat=8,band=22,erode=1,enclosed=true,minPocket=2500}={}){
 const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=info,N=w*h;
 const lum=k=>{const i=k*c;return (data[i]+data[i+1]+data[i+2])/3;};
 const isGrey=k=>{const i=k*c;return sat(data[i],data[i+1],data[i+2])<maxSat;};

 /* JPEG noise smears the two checker greys into a broad spread, so the border is
    sampled for the brightness RANGE the checkerboard occupies rather than for two
    exact tones. A black sash sits far below that range and is therefore kept. */
 const seen=[];
 for(let x=0;x<w;x+=2)for(const y of [0,1,2,h-3,h-2,h-1]){
  const k=y*w+x;if(isGrey(k))seen.push(lum(k));
 }
 seen.sort((a,b)=>a-b);
 const lo=seen[Math.floor(seen.length*0.02)]-band;
 const hi=seen[Math.floor(seen.length*0.98)]+band;
 const grey=k=>{const L=lum(k);return isGrey(k)&&L>=lo&&L<=hi;};
 const isBg=new Uint8Array(N);
 const stack=[];
 for(let x=0;x<w;x++)stack.push(x,(h-1)*w+x);
 for(let y=0;y<h;y++)stack.push(y*w,y*w+w-1);
 while(stack.length){
  const k=stack.pop();
  if(isBg[k]||!grey(k))continue;
  isBg[k]=1;
  const x=k%w,y=(k/w)|0;
  if(x>0)stack.push(k-1);
  if(x<w-1)stack.push(k+1);
  if(y>0)stack.push(k-w);
  if(y<h-1)stack.push(k+w);
 }
 /* Openwork - filigree, lace, the gaps in a crown - traps checker pockets the border
    fill can never reach. Clearing every matching pixel also deletes the rhinestones,
    which are grey and just as bright, so only pockets bigger than minPocket go: a
    trapped checker region is one large blob, a gemstone is a small isolated one. */
 if(enclosed){
  const done=new Uint8Array(N);
  for(let s=0;s<N;s++){
   if(done[s]||isBg[s]||!grey(s))continue;
   const stack2=[s],cells=[];done[s]=1;
   while(stack2.length){
    const k=stack2.pop();cells.push(k);
    const x=k%w,y=(k/w)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
     const nk=ny*w+nx;if(done[nk]||isBg[nk]||!grey(nk))continue;
     done[nk]=1;stack2.push(nk);
    }
   }
   if(cells.length>=minPocket)for(const k of cells)isBg[k]=1;
  }
 }

 /* JPEG ringing leaves a faintly coloured seam along the checker edge; pull the
    mask in so that seam is never kept. Binary only - no blur, so no black bleed. */
 for(let pass=0;pass<erode;pass++){
  const edge=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const k=y*w+x;if(isBg[k])continue;
   if((x>0&&isBg[k-1])||(x<w-1&&isBg[k+1])||(y>0&&isBg[k-w])||(y<h-1&&isBg[k+w]))edge[k]=1;
  }
  for(let k=0;k<N;k++)if(edge[k])isBg[k]=1;
 }
 for(let k=0;k<N;k++)data[k*c+3]=isBg[k]?0:255;
 return {data,w,h,c};
}

function bbox({data,w,h,c}){
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*c+3]>24){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
 return {x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};
}

async function write(img,b,out,{width,height}={}){
 let p=sharp(Buffer.from(img.data),{raw:{width:img.w,height:img.h,channels:img.c}})
  .extract({left:b.x0,top:b.y0,width:b.w,height:b.h});
 if(width&&height)p=p.resize({width,height,fit:'contain',background:{r:0,g:0,b:0,alpha:0}});
 await p.webp({quality:92,alphaQuality:100}).toFile(out);
}

module.exports={dekey,bbox,write,sat};
