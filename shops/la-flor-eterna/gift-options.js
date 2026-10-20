/* Optional gift accompanying any bouquet; never counted as flower stems. */
(function(g){'use strict';
const art={url:'assets/client/refinements-oct19/chocolate-box-gold.webp',width:948,height:494},url=art.url;
NebulaConfig.CONFIG.extrasCents.chocolateBox=1500; // Sample only, awaiting florist price.
function labels(){NebulaI18n.en.chocolateBox='Chocolate gift box';NebulaI18n.es.chocolateBox='Caja de chocolates';}
document.addEventListener('DOMContentLoaded',labels,{once:true});
function assets(s){return s?.finishes?.chocolateBox?[url]:[];}
function complete(s,sc){if(!s.finishes.chocolateBox)return;
 const sun=g.NebulaSunflower?.active(s),classic=s.mode==='classic',f=sc.frame;
 const place=classic&&g.NebulaCustomization?NebulaCustomization.giftLayout(s,f)['chocolate-box']:null;
 const w=place?.w||(sun?255:classic?240:Math.max(160,Math.min(240,f.radius*.95)));
 const x=place?.x||(classic?535:f.center.x+f.radius*.64),y=place?.y||(classic?980:f.center.y+f.radius+90);
 sc.finishes.push({uid:'chocolate-box',url,x,y,w,h:w*art.height/art.width,d:w,rot:0,bright:1,grounded:classic});
}
let row;
function renderControls(s,lang,ready){const host=document.getElementById('panel-finishing');if(!host)return;
 if(!row){row=document.createElement('label');row.className='check';const cb=document.createElement('input');cb.type='checkbox';cb.id='chocolateBox';cb.onchange=()=>{const n=NebulaApp.state;n.finishes.chocolateBox=cb.checked;NebulaApp.setState(n);};row.append(cb,document.createElement('span'));host.prepend(row);}
 row.querySelector('input').checked=!!s.finishes.chocolateBox;row.querySelector('input').disabled=!ready;
 row.querySelector('span').textContent=(lang==='es'?'Añadir caja de chocolates':'Add chocolate gift box')+' · '+NebulaModel.money(NebulaConfig.CONFIG.extrasCents.chocolateBox,lang)+(NebulaConfig.CONFIG.demo?' · '+(lang==='es'?'precio de muestra':'sample price'):'');
}
g.NebulaGift={assets,complete,renderControls,art};
})(window);
