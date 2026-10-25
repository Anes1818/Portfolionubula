/* Demo-only money bouquet. One pictured fold represents one $1 note. */
(function(g){'use strict';
const id='money_note',url='assets/money/folded-dollar-v1.png',M=NebulaModel;
const values={money_note:1,money_note_5:5,money_note_10:10},isNote=id=>Object.hasOwn(values,id);
for(const [key,value]of Object.entries(values)){
 NebulaConfig.CAT[key]={en:`Folded $${value} note`,es:`Billete de $${value} plegado`,family:'accents',priceCents:value*100,classicDiameter:100,topDiameter:90,kind:'flower',classic:false,classicOffered:false};
 NEBULA_META.flowers[key]={head:url,headWidth:1024,headHeight:1536,headRadius:.4,classicAvailable:false};
 NebulaI18n.en[key]=`Folded $${value} note`;NebulaI18n.es[key]=`Billete de $${value} plegado`;
 NebulaI18n.en['cash_'+key]=`$${value} cash gift (included in estimate; cash supply to confirm)`;
 NebulaI18n.es['cash_'+key]=`$${value} de regalo (incluido; suministro por confirmar)`;
}
const active=s=>s.mode==='dome'&&(s.template?.palette.some(isNote)||s.items.some(n=>isNote(n.id)));
const oldExtras=NebulaCustomization.extras;
NebulaCustomization.extras=s=>{const lines=oldExtras(s);if(active(s))for(const key of Object.keys(values)){const quantity=s.items.filter(n=>n.id===key).length;if(quantity)lines.push({id:'cash_'+key,quantity,totalCents:0,summaryOnly:true});}return lines;};
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
  return {...n,x:p.x,y:p.y,w:isNote(n.id)?h*2/3:h*.82,h:isNote(n.id)?h:h*.82,d:h*.72,rot:isNote(n.id)?p.angle+Math.PI/2:n.rot,z:1000-p.ring*10+(isNote(n.id)?0:2),bright:1};
 }).sort((a,b)=>a.z-b.z);
 sc.slots?.forEach(slot=>{const p=points[slot.slot];if(p){slot.x=p.x;slot.y=p.y;}});
 return sc;
};
const oldUI=NebulaCustomizationUI.render;
NebulaCustomizationUI.render=(s,lang,ready)=>{oldUI(s,lang,ready);const es=lang==='es';let panel=document.getElementById('moneyOptions');
 if(!panel){panel=document.createElement('section');panel.id='moneyOptions';panel.className='money-options';panel.innerHTML='<label class="field"><span id="moneyValueLabel"></span><select id="moneyValue"><option value="money_note">$1</option><option value="money_note_5">$5</option><option value="money_note_10">$10</option></select></label><p id="moneyBreakdown" class="helper"></p><p id="moneyHint" class="helper"></p>';document.getElementById('panel-flowers').prepend(panel);
  document.getElementById('moneyValue').onchange=e=>{const next=NebulaApp.state,key=e.target.value;if(!isNote(key))return;next.template.palette=next.template.palette.map(v=>isNote(v)?key:v);if(isNote(next.template.accent.id))next.template.accent.id=key;for(const [slot,v]of Object.entries(next.template.overrides))if(isNote(v))next.template.overrides[slot]=key;M.syncTemplate(next);NebulaApp.setState(next);};
 }
 panel.hidden=!active(s);document.body.classList.toggle('money-design',active(s));if(!active(s))return;
 const notes=s.items.filter(n=>isNote(n.id)),price=M.price(s),cash=notes.reduce((sum,n)=>sum+values[n.id]*100,0),types=[...new Set(notes.map(n=>n.id))];
 document.getElementById('moneyValueLabel').textContent=es?'Valor del billete (USD)':'Bill value (USD)';
 document.getElementById('moneyValue').value=types.length===1?types[0]:(types.length?'':s.template.palette.find(isNote)||id);
 document.getElementById('moneyBreakdown').textContent=es?`Efectivo: ${M.money(cash,lang)} · Arreglo y extras: ${M.money(price.totalCents-cash,lang)}`:`Cash gift: ${M.money(cash,lang)} · Arrangement & extras: ${M.money(price.totalCents-cash,lang)}`;
 document.getElementById('moneyHint').textContent=es?'La imagen es ilustrativa y no cambia con el valor. El total incluye el efectivo; la florista confirma suministro y precio final.':'The artwork stays the same for every bill value. The estimate includes the cash gift; your florist confirms cash supply and the final price.';
 document.getElementById('tab-flowers').textContent=es?'Billetes y flores':'Money & flowers';
 document.getElementById('compositionLabel').textContent=es?'Billetes plegados en capas':'Folded notes, layered by hand';
 for(const b of panel.querySelectorAll('button,select'))b.disabled=!ready;
};
g.NebulaMoney={active,create,layout};
})(window);
