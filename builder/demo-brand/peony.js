/* Demo collection: an original peony head with existing editable finishes. */
(function(g){'use strict';
const M=NebulaModel,id='peony_apricot',url='assets/peony/apricot-peony-v1.png';
NebulaConfig.CAT[id]={en:'Apricot peony',es:'Peonía albaricoque',family:'accents',priceCents:800,classicDiameter:155,topDiameter:125,kind:'flower',classic:false,classicOffered:false};
NEBULA_META.flowers[id]={head:url,headWidth:1280,headHeight:1280,headRadius:.46,headView:'overhead',layoutRatio:1.4,classicAvailable:false};
NebulaI18n.en[id]='Apricot peony';NebulaI18n.es[id]='Peonía albaricoque';
// The new asset is an overhead head, so offer it only in Dome and Heart.
const validate=M.validate;M.validate=raw=>raw?.mode==='classic'&&raw.items?.some(n=>n.id===id)?null:validate(raw);
for(const method of ['add','replace']){const original=M[method];M[method]=function(s,...args){if(s.mode==='classic'&&(method==='replace'?args[1]:args[0])===id)return {ok:false,reason:'invalid'};return original(s,...args);};}
function create(){
 const s=M.defaultMode('dome');M.resize(s,30);
 s.template.layout='organic';s.template.palette=['rose_ivory'];s.template.accent.count=0;
 s.template.overrides=Object.fromEntries([0,3,7,10,14,18,22,27].map(slot=>[slot,id]));
 Object.assign(s.finishes,{paper:'ivory',sash:'none',fillerCount:0,greeneryCount:5,studio:{v:1,wrap:'ruffle',breath:0,sprays:0,buds:0},decorations:[]});
 s.title='Peony & Pearl';M.syncTemplate(s);return s;
}
const oldCreate=NebulaRomance.create;NebulaRomance.create=name=>name==='peony-and-pearl'?create():oldCreate(name);
NebulaRomance.recipes.push({id:'peony-and-pearl',en:'Peony & Pearl',es:'Peonía y perla',count:30,mode:'dome'});
g.NebulaPeony={create};
})(window);
