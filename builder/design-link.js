/* Design links — shared by the studio (app.js) and the florist's order sheet (order.js).

   A bouquet travels as a short code in the URL: no server, no database, no image
   hosting. The recipe is encoded, not the pixel layout. Flowers are run-length coded
   in slot order, which keeps an 84-slot dome under ~200 characters and survives being
   pasted into WhatsApp.

   Dome and Heart keep their design in template.overrides, so the sequence has to be
   read and written per slot — an item list alone loses both the pattern and the gaps. */
(function(g){
'use strict';
const M=g.NebulaModel,{CAT}=g.NebulaConfig;

function b64url(str){return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64url(code){return decodeURIComponent(escape(atob(code.replace(/-/g,'+').replace(/_/g,'/'))));}

/* order: optional {ref,name,phone,date,method,pay,note} written by the studio checkout. */
function encode(s,order){
 let seq;
 if(s.mode==='classic')seq=s.items.map(it=>it.id);
 else{const cap=(s.template&&s.template.capacity)||0;seq=new Array(cap).fill('-');
      for(const it of s.items)if(Number.isInteger(it.slot)&&it.slot<cap)seq[it.slot]=it.id;}
 const runs=[];for(const id of seq){const last=runs[runs.length-1];if(last&&last[0]===id)last[1]++;else runs.push([id,1]);}
 const f=s.finishes,payload={v:6,m:s.mode,s:s.seed,f:runs};
 if(s.mode!=='classic'&&s.template&&s.template.capacity)payload.c=s.template.capacity;
 const fin={};for(const[k,key]of[['p','paper'],['r','ribbon'],['h','sash']])if(f[key]&&f[key]!=='none')fin[k]=f[key];
 /* The count, not a flag. This wrote 1 for any number of butterflies back when the
    finish was a single on/off, so a shared three-butterfly bouquet reopened with
    one. The crown was never written at all and vanished from every shared link. */
 if(f.butterfly)fin.b=Math.max(0,Math.min(9,f.butterfly|0))||1;
 if(f.crown)fin.k=1;
 if(f.greenRim)fin.g=1;if(f.tint&&f.paper==='custom')fin.c=f.tint;
 if(Object.keys(fin).length)payload.fin=fin;
 if((s.title||'').trim())payload.t=s.title.trim().slice(0,70);
 if((s.note||'').trim())payload.n=s.note.trim().slice(0,180);
 if(order){
  const o={};
  for(const[k,v]of Object.entries(order))if(v)o[k]=String(v).slice(0,120);
  if(Object.keys(o).length)payload.o=o;
 }
 return b64url(JSON.stringify(payload));
}

function decode(code){
 try{
  const p=JSON.parse(unb64url(code));
  if(!p||p.v!==6||!['classic','dome','heart'].includes(p.m)||!Array.isArray(p.f))return null;
  const seq=[];
  for(const run of p.f){
   if(!Array.isArray(run))return null;
   const id=run[0];if(id!=='-'&&!Object.hasOwn(CAT,id))return null;
   const n=Math.min(Number(run[1])||0,200);
   for(let i=0;i<n;i++)seq.push(id==='-'?null:id);
  }
  if(!seq.length||seq.length>200||!seq.some(Boolean))return null;
  const s=M.defaultMode(p.m);
  if(Number.isInteger(p.s)&&p.s>0&&p.s<1e8)s.seed=p.s;
  if(p.m==='classic'){
   s.items=[];s.nextId=1;
   for(const id of seq)if(id)s.items.push(M.newItem(s,id));
  }else{
   if(!Number.isInteger(p.c)||p.c<1||p.c>100||seq.length!==p.c)return null;
   M.resize(s,p.c);
   s.template.overrides={};
   seq.forEach((id,slot)=>{s.template.overrides[slot]=id;});
   M.syncTemplate(s);
  }
  const fin=p.fin||{};
  for(const[k,key]of[['p','paper'],['r','ribbon'],['h','sash']])if(fin[k])s.finishes[key]=String(fin[k]);
  /* A link written before butterflies were counted carries b:1, which means the one
     butterfly it drew - the same thing it means now, so old links still open right. */
  s.finishes.butterfly=Number.isInteger(fin.b)?Math.max(0,Math.min(9,fin.b)):0;
  s.finishes.crown=fin.k===1;
  s.finishes.greenRim=fin.g===1;
  if(fin.c)s.finishes.tint=String(fin.c);
  if(p.t)s.title=String(p.t).slice(0,70);
  if(p.n)s.note=String(p.n).slice(0,180);
  /* Classic needs a fresh arrangement; the templates are positioned by syncTemplate. */
  if(s.mode==='classic'){s.frames={};M.arrange(s,s.mode,{fresh:true});}
  const design=M.validate(s);
  return design?{design,order:p.o||null}:null;
 }catch(e){return null;}
}

function readHash(hash){const m=/[#&]b=([A-Za-z0-9\-_]+)/.exec(hash||'');return m?m[1]:null;}

g.NebulaLink={encode,decode,readHash};
})(window);
