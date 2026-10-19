/* Design links — shared by the studio (app.js) and the florist's order sheet (order.js).

   A bouquet travels as a self-contained recipe in the URL: no server, database or
   image hosting. Version 7 uses compact fields and optional flower dictionaries;
   bounded LZ packing is used only when smaller. Legacy v6 links remain readable.
   Length depends on the arrangement, finishes and optional order details.

   Dome and Heart keep their design in template.overrides, so the sequence has to be
   read and written per slot — an item list alone loses both the pattern and the gaps. */
(function(g){
'use strict';
const M=g.NebulaModel,{CAT}=g.NebulaConfig;

function b64url(str){return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64url(code){return decodeURIComponent(escape(atob(code.replace(/-/g,'+').replace(/_/g,'/'))));}

/* z1: bounded, synchronous LZ packing. Links remain self-contained and work on
   another phone without cookies, a database or a third-party shortening service.
   Groups of eight tokens use one flag byte; matches store distance + length.
   The version prefix leaves existing base64 JSON links fully readable. */
function pack(text){
 const bytes=new TextEncoder().encode(text),out=[],seen=new Map();
 const key=i=>i+2<bytes.length?(bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2]:-1;
 const remember=i=>{const k=key(i);if(k<0)return;const a=seen.get(k)||[];a.push(i);if(a.length>48)a.shift();seen.set(k,a);};
 for(let i=0;i<bytes.length;){
  const flagsAt=out.length;out.push(0);
  for(let bit=0;bit<8&&i<bytes.length;bit++){
   let length=0,distance=0;const matches=seen.get(key(i))||[];
   for(let j=matches.length-1;j>=0;j--){const start=matches[j],delta=i-start;if(delta>65535)break;let n=0;while(n<258&&i+n<bytes.length&&bytes[start+n]===bytes[i+n])n++;if(n>length){length=n;distance=delta;}if(n===258)break;}
   if(length>=4){out[flagsAt]|=1<<bit;out.push(distance>>8,distance&255,length-3);for(let n=0;n<length;n++)remember(i+n);i+=length;}
   else{out.push(bytes[i]);remember(i++);}
  }
 }
 let binary='';for(const n of out)binary+=String.fromCharCode(n);
 return 'z1_'+btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unpack(code){
 const bytes=atob(code.slice(3).replace(/-/g,'+').replace(/_/g,'/')),out=[];
 for(let i=0;i<bytes.length;){const flags=bytes.charCodeAt(i++);if(i===bytes.length)throw Error('Truncated link');
  for(let bit=0;bit<8&&i<bytes.length;bit++){
   if(flags&(1<<bit)){if(i+3>bytes.length)throw Error('Truncated match');const distance=(bytes.charCodeAt(i++)<<8)|bytes.charCodeAt(i++),n=bytes.charCodeAt(i++)+3;if(!distance||distance>out.length||out.length+n>64000)throw Error('Invalid match');for(let j=0;j<n;j++)out.push(out[out.length-distance]);}
   else out.push(bytes.charCodeAt(i++));
   if(out.length>64000)throw Error('Link too large');
  }
 }
 return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(out));
}

/* order: optional {ref,name,phone,date,method,pay,note} written by the studio checkout. */
function encode(s,order){
 let seq;
 if(s.mode==='classic')seq=s.items.map(it=>it.id);
 else{const cap=(s.template&&s.template.capacity)||0;seq=new Array(cap).fill('-');
      for(const it of s.items)if(Number.isInteger(it.slot)&&it.slot<cap)seq[it.slot]=it.id;}
 const runs=[];for(const id of seq){const last=runs[runs.length-1];if(last&&last[0]===id)last[1]++;else runs.push([id,1]);}
 const f=s.finishes,payload={v:6,m:s.mode,s:s.seed,f:runs};
 if(s.photographic)payload.photo=s.photographic;
 if(s.mode!=='classic'&&s.template&&s.template.capacity)payload.c=s.template.capacity;
 // Optional extension: keep a hand-arranged Classic picture and its variation IDs.
 // Older recipe-only v6 links still use the original arrange path below.
 if(s.mode==='classic'){
  payload.a=s.items.map(it=>[Number(it.uid.slice(1)),it.anchors.classic.x,it.anchors.classic.y,it.anchors.classic.manual?1:0]);
  payload.g=s.frames.classic;
 }
 if(['organic','garden','halloween'].includes(s.template?.layout))payload.layout=s.template.layout;
 if(s.template?.layout==='halloween')payload.hr=s.template.halloweenRecipe;
 const fin={};for(const key of ['spookyMask','spookyBow','ghostCount','thistleCount'])if(f[key])fin[key]=f[key];for(const[k,key]of[['p','paper'],['r','ribbon'],['h','sash']])if(f[key]&&f[key]!=='none')fin[k]=f[key];
 /* The count, not a flag. This wrote 1 for any number of butterflies back when the
    finish was a single on/off, so a shared three-butterfly bouquet reopened with
    one. The crown was never written at all and vanished from every shared link. */
 if(f.butterfly)fin.b=Math.max(0,Math.min(9,f.butterfly|0))||1;
 if(f.crown)fin.k=1;
 if(f.chocolateBox)fin.cb=1;
 if(f.studio)fin.cx=f.studio;
 if(f.fillerCount)fin.fc=f.fillerCount;
 if(f.fillerPattern==='border')fin.fp='border';
 if(f.roseArtwork)fin.ra=f.roseArtwork;
 if(f.greeneryCount)fin.gc=f.greeneryCount;
 if(f.initial){fin.il=f.initial;fin.is=f.initialScale;fin.io=f.initialOffset;}
 if(f.decorations?.length)fin.dc=f.decorations.map(d=>[d.id,d.x,d.y,d.scale,d.rotation,d.layer]);
 if(f.pumpkin){fin.q=1;fin.j=f.pumpkinPosition;fin.z=f.pumpkinScale;}if(f.bow)fin.d=1;
 if(f.greenRim)fin.g=1;if(f.tint&&f.paper==='custom')fin.c=f.tint;
 if(f.collar===false)fin.w=0;
 if(f.sashText)fin.t=f.sashText;
 if(f.sashPlacement)fin.l=f.sashPlacement;
 if(f.sashOffset)fin.y=f.sashOffset;
 if(Object.keys(fin).length)payload.fin=fin;
 if((s.title||'').trim())payload.t=s.title.trim().slice(0,70);
 if((s.note||'').trim())payload.n=s.note.trim().slice(0,180);
 if(order){
  const o={};
  for(const[k,v]of Object.entries(order))if(v)o[k]=String(v).slice(0,120);
  if(Object.keys(o).length)payload.o=o;
 }
 const legacy=b64url(JSON.stringify(payload)),choices=[legacy,pack(JSON.stringify(payload))];
 // v7 removes repeated field names; the decoder expands back to the validated
 // v6 recipe. Per-link flower and order dictionaries remain self-describing.
 const rest={};for(const [from,to] of [['photo','p'],['c','c'],['fin','f'],['t','t'],['n','n'],['layout','l'],['hr','h'],['a','a'],['g','g']])if(payload[from]!==undefined)rest[to]=payload[from];
 if(payload.o){const keys=['ref','name','phone','date','method','pay','note'];rest.o=Object.entries(payload.o).map(([k,v])=>[keys.includes(k)?keys.indexOf(k):k,v]);}
 const compact=[7,['classic','dome','heart'].indexOf(payload.m),payload.s,payload.f,rest];
 for(const dictionary of [false,true]){
  if(dictionary){rest.i=[...new Set(payload.f.map(run=>run[0]))];compact[3]=payload.f.map(([id,n])=>[rest.i.indexOf(id),n]);}
  const json=JSON.stringify(compact);choices.push(b64url(json),pack(json));
 }
 return choices.reduce((best,code)=>code.length<best.length?code:best);
}

function decode(code){
 try{
  if(typeof code!=='string'||code.length>24000)return null;
  let p=JSON.parse(code.startsWith('z1_')?unpack(code):unb64url(code));
  if(Array.isArray(p)){
   if(p.length!==5||p[0]!==7||!Number.isInteger(p[1])||p[1]<0||p[1]>2||!p[4]||typeof p[4]!=='object'||Array.isArray(p[4]))return null;
   const rest=p[4],expanded={v:6,m:['classic','dome','heart'][p[1]],s:p[2],f:p[3]};
   for(const [from,to] of [['p','photo'],['c','c'],['f','fin'],['t','t'],['n','n'],['l','layout'],['h','hr'],['a','a'],['g','g'],['i','i']])if(rest[from]!==undefined)expanded[to]=rest[from];
   if(rest.o!==undefined){
    if(!Array.isArray(rest.o)||rest.o.length>20)return null;
    const keys=['ref','name','phone','date','method','pay','note'];expanded.o={};
    for(const entry of rest.o){if(!Array.isArray(entry)||entry.length!==2||typeof entry[1]!=='string')return null;const key=typeof entry[0]==='number'?keys[entry[0]]:entry[0];if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key))return null;expanded.o[key]=entry[1];}
   }
   p=expanded;
  }
  if(!p||p.v!==6||!['classic','dome','heart'].includes(p.m)||!Array.isArray(p.f)||p.f.length>100)return null;
  if(p.i!==undefined){
   if(!Array.isArray(p.i)||!p.i.length||p.i.length>100||p.i.some(id=>id!=='-'&&!Object.hasOwn(CAT,id)))return null;
   p.f=p.f.map(run=>{if(!Array.isArray(run)||run.length!==2||!Number.isInteger(run[0])||run[0]<0||run[0]>=p.i.length)throw Error('Invalid flower index');return [p.i[run[0]],run[1]];});
  }
  const seq=[];
  for(const run of p.f){
   if(!Array.isArray(run)||run.length!==2)return null;
   const id=run[0];if(id!=='-'&&!Object.hasOwn(CAT,id))return null;
   const n=run[1];if(!Number.isInteger(n)||n<1||n>100||seq.length+n>100)return null;
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
   if(p.layout!==undefined){if(!['organic','garden','halloween'].includes(p.layout)||p.m!=='dome')return null;s.template.layout=p.layout;if(p.layout==='halloween'){s.template.halloweenRecipe=p.hr;if(!NebulaSpooky.validTemplate(s.template))return null;}}
   M.syncTemplate(s);
  }
  const fin=p.fin||{};for(const key of ['spookyMask','spookyBow','ghostCount','thistleCount'])if(fin[key]!==undefined)s.finishes[key]=fin[key];
  for(const[k,key]of[['p','paper'],['r','ribbon'],['h','sash']])if(fin[k])s.finishes[key]=String(fin[k]);
  /* A link written before butterflies were counted carries b:1, which means the one
     butterfly it drew - the same thing it means now, so old links still open right. */
  s.finishes.butterfly=Number.isInteger(fin.b)?Math.max(0,Math.min(9,fin.b)):0;
  s.finishes.crown=fin.k===1;
  if(fin.cx!==undefined)s.finishes.studio=fin.cx;
  if(fin.cb!==undefined){if(fin.cb!==1)return null;s.finishes.chocolateBox=true;}
  if(fin.fc!==undefined)s.finishes.fillerCount=fin.fc;
  for(const [short,key] of [['fp','fillerPattern'],['gc','greeneryCount'],['il','initial'],['is','initialScale'],['io','initialOffset']])if(fin[short]!==undefined)s.finishes[key]=fin[short];
  if(fin.dc!==undefined){if(!Array.isArray(fin.dc)||fin.dc.some(a=>!Array.isArray(a)||a.length!==6))return null;
   s.finishes.decorations=fin.dc.map(a=>({id:a[0],x:a[1],y:a[2],scale:a[3],rotation:a[4],layer:a[5]}));}
  s.finishes.bow=fin.d===1;s.finishes.pumpkin=fin.q===1;
  if(fin.j!==undefined)s.finishes.pumpkinPosition=fin.j;
  if(fin.z!==undefined)s.finishes.pumpkinScale=fin.z;
  s.finishes.greenRim=fin.g===1;
  if(fin.c)s.finishes.tint=String(fin.c);
  if(fin.w===0)s.finishes.collar=false;
  if(fin.t)s.finishes.sashText=String(fin.t).slice(0,28);
  if(fin.l)s.finishes.sashPlacement=String(fin.l);
  if(fin.ra!==undefined)s.finishes.roseArtwork=fin.ra;
  if(fin.y!==undefined)s.finishes.sashOffset=fin.y;
  if(p.t)s.title=String(p.t).slice(0,70);
  if(p.n)s.note=String(p.n).slice(0,180);
  /* Classic needs a fresh arrangement; the templates are positioned by syncTemplate. */
  if(s.mode==='classic'){s.frames={};M.arrange(s,s.mode,{fresh:true});}
  if(s.mode==='classic'&&p.a!==undefined){
   if(!Array.isArray(p.a)||p.a.length!==s.items.length||!p.g)return null;
   for(let i=0;i<p.a.length;i++){
    const a=p.a[i];if(!Array.isArray(a)||a.length!==4||!Number.isInteger(a[0])||a[0]<1||a[0]>=1e8||![0,1].includes(a[3]))return null;
    s.items[i].uid='b'+a[0];s.items[i].anchors.classic={x:a[1],y:a[2],manual:a[3]===1};
   }
   s.nextId=Math.max(...p.a.map(a=>a[0]))+1;s.frames.classic=p.g;
  }
  if(p.photo!==undefined)s.photographic=p.photo;
  const design=M.validate(s);
  return design?{design,order:p.o||null}:null;
 }catch(e){return null;}
}

function readHash(hash){const m=/[#&]b=([A-Za-z0-9\-_]+)/.exec(hash||'');return m?m[1]:null;}

g.NebulaLink={encode,decode,readHash};
})(window);
