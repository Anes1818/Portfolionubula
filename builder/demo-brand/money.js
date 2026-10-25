/* Demo-only money bouquet. One pictured fold represents one $1 note. */
(function(g){'use strict';
const id='money_note',url='assets/money/folded-dollar-v1.png',M=NebulaModel;
NebulaConfig.CAT[id]={en:'Folded $1 note',es:'Billete de $1 plegado',family:'accents',priceCents:100,classicDiameter:100,topDiameter:90,kind:'flower',classic:false,classicOffered:false};
NEBULA_META.flowers[id]={head:url,headWidth:1024,headHeight:1536,headRadius:.4,classicAvailable:false};
NebulaI18n.en[id]='Folded $1 note';NebulaI18n.es[id]='Billete de $1 plegado';
const active=s=>s.mode==='dome'&&(s.template?.palette.includes(id)||s.items.some(n=>n.id===id));
const oldExtras=NebulaCustomization.extras;
NebulaCustomization.extras=s=>{const lines=oldExtras(s);if(active(s))lines.push({id:'moneyCashIncluded',quantity:s.items.filter(n=>n.id===id).length,totalCents:0,summaryOnly:true});return lines;};
NebulaI18n.en.moneyCashIncluded='$1 cash gift (included in estimate; cash supply to confirm)';
NebulaI18n.es.moneyCashIncluded='$1 de regalo (incluido; suministro por confirmar)';
function layout(count){
 const rings=Math.max(2,Math.round(Math.sqrt(count/3))),points=[];const core=Math.min(7,count);
 for(let i=0;i<core;i++){const angle=(i-1)/6*Math.PI*2-Math.PI/2;points.push({x:i?360+Math.cos(angle)*43:360,y:i?390+Math.sin(angle)*43:390,angle:i?angle:-Math.PI/2,ring:0});}
 let remaining=count-core;const sum=rings*(rings+1)/2-1;
 for(let ring=1;ring<rings;ring++){
  const n=ring===rings-1?remaining:Math.round((count-core)*(ring+1)/sum);remaining-=n;
  const radius=95+(ring-1)/Math.max(1,rings-2)*90;
  for(let i=0;i<n;i++){const angle=i/n*Math.PI*2+(ring%2?Math.PI/n:0)-Math.PI/2;points.push({x:360+Math.cos(angle)*radius,y:390+Math.sin(angle)*radius,angle,ring});}
 }return {points,rings};
}
function create(){const s=M.defaultMode('dome');M.resize(s,50);s.template.palette=[id];s.template.accent.count=0;s.template.overrides={};s.finishes.studio={v:1,breath:0,wrap:'round'};s.finishes.paper='black';s.finishes.sash='blank_blackband';s.finishes.sashText='Just for you';s.title='Money Bloom';M.syncTemplate(s);return s;}
const oldCreate=NebulaRomance.create;NebulaRomance.create=name=>name==='money-bloom'?create():oldCreate(name);
NebulaRomance.recipes.push({id:'money-bloom',en:'Money Bloom',es:'Ramo de dinero',count:50,mode:'dome'});
const oldNearest=NebulaTemplates.nearest;
NebulaTemplates.nearest=(mode,count,p)=>{if(g.NebulaApp&&active(NebulaApp.state)&&mode==='dome'){let result=null,distance=Infinity;layout(count).points.forEach((q,i)=>{const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<distance){distance=d;result=i;}});return distance<75?result:null;}return oldNearest(mode,count,p);};
const oldNodes=NebulaGeometry.nodes;
NebulaGeometry.nodes=s=>{const sc=oldNodes(s);if(!active(s))return sc;sc.frame={...sc.frame,radius:260,unit:65};
 const {points,rings}=layout(s.template.capacity),baseHeight=Math.min(220,960/(rings+1));
 sc.nodes=sc.nodes.map(n=>{const item=s.items.find(i=>i.uid===n.uid),p=points[item.slot];if(!p)return n;const h=baseHeight*(.62+.38*p.ring/(rings-1));
  return {...n,x:p.x,y:p.y,w:n.id===id?h*2/3:h*.82,h:n.id===id?h:h*.82,d:h*.72,rot:n.id===id?p.angle+Math.PI/2:n.rot,z:1000-p.ring*10+(n.id===id?0:2),bright:1};
 }).sort((a,b)=>a.z-b.z);
 sc.slots?.forEach(slot=>{const p=points[slot.slot];if(p){slot.x=p.x;slot.y=p.y;}});
 return sc;
};
const oldUI=NebulaCustomizationUI.render;
NebulaCustomizationUI.render=(s,lang,ready)=>{oldUI(s,lang,ready);const es=lang==='es';let panel=document.getElementById('moneyOptions');
 if(!panel){panel=document.createElement('section');panel.id='moneyOptions';panel.className='money-options';panel.innerHTML='<h3 id="moneyTitle"></h3><label class="field"><span id="moneySizeLabel"></span><select id="moneySize"><option>25</option><option>50</option><option>75</option><option>100</option></select></label><div class="custom-segments"><button type="button" id="moneyOnly"></button><button type="button" id="moneyRoses"></button></div><p id="moneyBreakdown" class="helper"></p><p id="moneyHint" class="helper"></p>';document.getElementById('panel-flowers').prepend(panel);
  const update=(count,roses)=>{const next=NebulaApp.state;M.resize(next,count);next.template.palette=[id];next.template.accent.count=0;next.template.overrides={};if(roses)for(let i=0;i<Math.min(7,count);i++)next.template.overrides[i]='rose_red';M.syncTemplate(next);NebulaApp.setState(next);};
  document.getElementById('moneySize').onchange=e=>update(+e.target.value,NebulaApp.state.items.some(n=>n.id==='rose_red'));
  document.getElementById('moneyOnly').onclick=()=>update(NebulaApp.state.template.capacity,false);
  document.getElementById('moneyRoses').onclick=()=>update(NebulaApp.state.template.capacity,true);
 }
 panel.hidden=!active(s);document.body.classList.toggle('money-design',active(s));if(!active(s))return;
 const notes=s.items.filter(n=>n.id===id).length,price=M.price(s),cash=notes*100;
 document.getElementById('moneyTitle').textContent=es?'Tu ramo de dinero':'Your money bouquet';
 document.getElementById('moneySizeLabel').textContent=es?'Posiciones del ramo':'Bouquet size';
 document.getElementById('moneySize').value=s.template.capacity;
 document.getElementById('moneyOnly').textContent=es?'Solo billetes':'All money';
 document.getElementById('moneyRoses').textContent=es?'Centro de rosas':'Rose center';
 document.getElementById('moneyOnly').setAttribute('aria-pressed',String(notes===s.items.length));
 document.getElementById('moneyRoses').setAttribute('aria-pressed',String(s.items.some(n=>n.id==='rose_red')));
 document.getElementById('moneyBreakdown').textContent=es?`${notes} billetes de $1 · Efectivo: ${M.money(cash,lang)} · Arreglo y extras: ${M.money(price.totalCents-cash,lang)}`:`${notes} × $1 notes · Cash gift: ${M.money(cash,lang)} · Arrangement & extras: ${M.money(price.totalCents-cash,lang)}`;
 document.getElementById('moneyHint').textContent=es?'Vista ilustrativa en USD. El total incluye el efectivo. La florista confirma billetes, suministro y precio final.':'Illustrative USD preview. The estimate includes the cash gift. Your florist confirms the notes, who supplies the cash, and the final price.';
 document.getElementById('tab-flowers').textContent=es?'Billetes y flores':'Money & flowers';
 document.getElementById('compositionLabel').textContent=es?'Billetes plegados en capas':'Folded notes, layered by hand';
 for(const b of panel.querySelectorAll('button,select'))b.disabled=!ready;
};
g.NebulaMoney={active,create,layout};
})(window);
