const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),H=require('../../halloween-layout.js');
const checks=[];function check(name,ok){assert.ok(ok,name);checks.push(name);console.log('PASS',name);}
const count=nodes=>nodes.reduce((out,n)=>(out[n.id]=(out[n.id]||0)+1,out),{});
for(const r of H.recipes){
 const p=H.build(r.id);
 check(r.name+': exact proposed flower recipe',JSON.stringify(count(p.flowers))===JSON.stringify(r.flowers)||Object.entries(r.flowers).every(([id,n])=>count(p.flowers)[id]===n)&&p.flowers.length===Object.values(r.flowers).reduce((a,b)=>a+b,0));
 check(r.name+': exact separate extras',Object.entries(r.details).every(([id,n])=>p.bill.find(l=>l.id===id)?.quantity===n));
 check(r.name+': deterministic geometry',JSON.stringify(H.build(r.id))===JSON.stringify(p));
 check(r.name+': unique flower slots',new Set(p.flowers.map(n=>n.uid)).size===p.flowers.length);
 check(r.name+': missing assets gate readiness',!H.readiness(r.id).ready&&H.readiness(r.id,r.assets).ready&&H.readiness(r.id,r.assets.slice(1)).missing.length===1);
 check(r.name+': prices remain unset until configured',p.bill.every(l=>l.unitPriceCents===null));
 let min=Infinity;for(let i=0;i<p.flowers.length;i++)for(let j=i+1;j<p.flowers.length;j++){const a=p.flowers[i],b=p.flowers[j];min=Math.min(min,Math.hypot(a.x-b.x,a.y-b.y)/((a.d+b.d)/2));}
 check(r.name+': solid flower centres stay separated',min>=.70);
 check(r.name+': flowers and filler fit paper planning bounds',[...p.flowers,...p.filler].every(n=>Math.abs(n.x-p.paper.x)+n.d/2<=p.paper.w/2&&Math.abs(n.y-p.paper.y)+n.d/2<=p.paper.h/2));
}
const scream=H.build('scream-for-you');
check('Expanded petal footprint stays outside mask reserve',scream.flowers.every(f=>H.maskClearance(f,scream.exclusions[0])>=f.d*H.petalEnvelope/2+.05));
check('Mask fills the opening at its natural portrait ratio',Math.abs(scream.props[0].w/scream.props[0].h-520/1104)<1e-9&&scream.props[0].w>=2*scream.exclusions[0].rx&&scream.props[0].h>2*scream.exclusions[0].ry);
for(const seed of [0,11,73,999]){
 const p=H.build('forever-my-boo',{seed}),sectors=Array.from({length:8},()=>({red:0,black:0}));
 for(const f of p.flowers)sectors[Math.floor((Math.atan2(f.y,f.x)+Math.PI)/(Math.PI*2)*8)%8][f.id==='rose_black'?'black':'red']++;
 check('Seed '+seed+': 22/22 roses balanced in every sector',count(p.flowers).rose_red===22&&count(p.flowers).rose_black===22&&sectors.every(s=>Math.abs(s.red-s.black)<=1));
}
const m=H.build('midnight-blooms');
check('Lilies keep their 1.8-to-1 size ratio',m.flowers.filter(f=>f.id==='lily').every(f=>f.d===1.8));
check('Blue accents occupy separate pockets',m.filler.every((f,i)=>m.filler.every((g,j)=>i===j||Math.hypot(f.x-g.x,f.y-g.y)>=1.4)));
check('Unsupplied topper is neither drawn nor counted',m.exclusions.length===0&&m.props.length===0&&!m.bill.some(n=>n.id==='jack_coffin'));
check('Seven supplied assets and one reused collar',Object.keys(H.assets).length===8&&new Set(H.recipes.flatMap(r=>r.assets)).size===8);
assert.throws(()=>H.build('unknown'));assert.throws(()=>H.build('midnight-blooms',{seed:NaN}));checks.push('Unknown recipes and invalid seeds rejected');
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({checks},null,2));console.log(checks.length+' checks passed');
