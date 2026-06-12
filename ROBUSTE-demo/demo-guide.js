/* ============================================================
   ROBUSTE — Portfolio Demo Guide (self-contained, no deps)
   Adds: language toggle (EN main / AR), pulsing hotspots that
   pop beautiful curved arrows + bilingual notes, a guided
   spotlight tour, an owner-notification illustration, and an
   admin-page bypass with explanation. Pure vanilla JS.
   ============================================================ */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var LANG_KEY = 'robusteDemoLang';
  var SEEN_KEY = 'robusteDemoTourSeen';

  /* ---------- language ---------- */
  function getLang(){ try{ return localStorage.getItem(LANG_KEY) || 'en'; }catch(e){ return 'en'; } }
  function setLang(l){ try{ localStorage.setItem(LANG_KEY,l); }catch(e){} document.documentElement.setAttribute('data-rd-lang',l); render(); }
  document.documentElement.setAttribute('data-rd-lang', getLang());

  function L(o){ var l=getLang(); return (o && o[l]) || (o && o.en) || o; }

  /* ---------- page detection ---------- */
  function page(){
    if (document.getElementById('loginGate') && document.getElementById('statsRow')) return 'admin';
    if (document.getElementById('orderForm') || document.getElementById('expressForm')) return 'product';
    return 'index';
  }

  /* ---------- step definitions ---------- */
  var TAG = { en:'✎ Fully customizable', ar:'✎ قابل للتخصيص بالكامل' };
  var STEPS = {
    index: [
      {sel:'.glass-navbar,.navbar', en:{t:'Navigation bar',d:'Sticky glass navbar with your logo, menu links and a dark-mode switch. Colors, links and logo are all editable.'}, ar:{t:'شريط التنقل',d:'شريط علوي ثابت بشعارك وروابطك وزر الوضع الليلي. الألوان والروابط والشعار كلها قابلة للتعديل.'}},
      {sel:'.hero-title', anchor:'.hero-content,.hero-container', en:{t:'Hero section',d:'The first thing visitors see: headline, subtext and a call-to-action that scrolls straight to your products.'}, ar:{t:'الواجهة الرئيسية',d:'أول ما يراه الزائر: عنوان رئيسي ووصف وزر دعوة للشراء ينقله مباشرة للمنتجات.'}},
      {sel:'.offers-section,#offerProducts', en:{t:'Limited-time offers',d:'Promo products with a live countdown timer to create urgency and lift conversions.'}, ar:{t:'عروض محدودة',d:'منتجات بعروض مع عدّاد تنازلي حي لخلق الإلحاح ورفع المبيعات.'}},
      {sel:'#products', en:{t:'Product catalog',d:'Products load here from a database. Add, edit, price and stock them — no code needed.'}, ar:{t:'معرض المنتجات',d:'تُحمّل المنتجات هنا من قاعدة بيانات. أضف وعدّل الأسعار والمخزون بدون برمجة.'}},
      {sel:'#reviews', en:{t:'Customer reviews',d:'Real ratings & comments build trust. New reviews also notify you instantly.'}, ar:{t:'آراء العملاء',d:'تقييمات وتعليقات حقيقية تبني الثقة، وتصلك إشعارات بكل تقييم جديد.'}},
      {sel:'#themeToggle', en:{t:'Dark mode',d:'One-tap light/dark theme that remembers each visitor’s choice.'}, ar:{t:'الوضع الليلي',d:'تبديل فوري بين الفاتح والداكن مع حفظ اختيار كل زائر.'}}
    ],
    product: [
      {sel:'.quick-order-card,#expressForm', en:{t:'Express order',d:'Name, phone, wilaya & quantity — cash on delivery. The fastest path to a sale.'}, ar:{t:'الطلب السريع',d:'الاسم والهاتف والولاية والكمية — الدفع عند الاستلام. أسرع طريق للبيع.'}},
      {sel:'#floatingCart', en:{t:'Floating cart',d:'A draggable cart button that follows the customer and shows the live item count.'}, ar:{t:'السلة العائمة',d:'زر سلة قابل للسحب يتبع العميل ويعرض عدد المنتجات.'}},
      {sel:'#checkoutBtnCart,#cartOffcanvas', en:{t:'Cart & checkout',d:'Items, total and a checkout button live inside a smooth slide-in drawer.'}, ar:{t:'السلة وإتمام الشراء',d:'المنتجات والمجموع وزر الشراء داخل درج منزلق سلس.'}},
      {sel:'#orderForm', en:{t:'Checkout form',d:'Full order form: name, phone, wilaya, address & payment method — all validated.'}, ar:{t:'نموذج الطلب',d:'نموذج كامل: الاسم والهاتف والولاية والعنوان وطريقة الدفع — مع تحقق من البيانات.'}},
      {sel:'#submitOrderFinal,.btn-submit-express', action:'owner', en:{t:'Order confirmation',d:'The instant the customer taps Confirm — watch what reaches YOU as the shop owner →'}, ar:{t:'تأكيد الطلب',d:'بمجرد أن يضغط العميل تأكيد — شاهد ماذا يصلك أنت كصاحب المتجر ←'}}
    ],
    admin: [
      {sel:'#statsRow', en:{t:'KPI overview',d:'Total orders, new orders, delivered count and total revenue — at a glance.'}, ar:{t:'مؤشرات سريعة',d:'إجمالي الطلبات، الجديدة، المُسلّمة، وإجمالي الإيرادات في لمحة.'}},
      {sel:'.chart-card,#chartStatus', en:{t:'Live charts',d:'Order-status breakdown and a 7-day orders chart, updated automatically.'}, ar:{t:'رسوم حية',d:'توزيع حالات الطلبات ومخطط لـ 7 أيام، يتحدّث تلقائياً.'}},
      {sel:'#searchInput,.filters,.table-wrap', en:{t:'Search & filters',d:'Search any order, filter by status, and pick a custom date range.'}, ar:{t:'البحث والفلاتر',d:'ابحث عن أي طلب، وفلتر حسب الحالة والتاريخ.'}},
      {sel:'#tableContent', action:'owner', en:{t:'Orders inbox',d:'Every website order lands here — PLUS an instant Telegram message + email to you. You confirm by calling the customer.'}, ar:{t:'صندوق الطلبات',d:'كل طلب من الموقع يصل هنا — بالإضافة لرسالة تيليغرام وإيميل فوري. تؤكّد الطلب بالاتصال بالعميل.'}}
    ]
  };

  /* ---------- utils ---------- */
  function $(s,r){ return (r||document).querySelector(s); }
  function pickEl(sel){ var parts=sel.split(','); for(var i=0;i<parts.length;i++){ var e=$(parts[i].trim()); if(e) return e; } return null; }
  function rectOf(el){ var r=el.getBoundingClientRect(); return {x:r.left+window.scrollX, y:r.top+window.scrollY, w:r.width, h:r.height}; }
  function el(tag,cls,html){ var n=document.createElement(tag); if(cls)n.className=cls; if(html!=null)n.innerHTML=html; return n; }

  /* ---------- popping arrow (SVG) ---------- */
  function buildArrow(fromX,fromY,toX,toY){
    var minX=Math.min(fromX,toX)-12, minY=Math.min(fromY,toY)-12;
    var w=Math.abs(toX-fromX)+24, h=Math.abs(toY-fromY)+24;
    var svg=document.createElementNS(NS,'svg');
    svg.setAttribute('class','rd-arrow'); svg.setAttribute('width',w); svg.setAttribute('height',h);
    svg.style.position='absolute'; svg.style.left=minX+'px'; svg.style.top=minY+'px';
    var x1=fromX-minX, y1=fromY-minY, x2=toX-minX, y2=toY-minY;
    var cx=(x1+x2)/2 + (y2-y1)*0.25, cy=(y1+y2)/2 - (x2-x1)*0.25;
    var path=document.createElementNS(NS,'path');
    path.setAttribute('d','M '+x1+' '+y1+' Q '+cx+' '+cy+' '+x2+' '+y2);
    svg.appendChild(path);
    var ang=Math.atan2(y2-cy, x2-cx);
    var a1=ang+Math.PI-0.42, a2=ang+Math.PI+0.42, len=14;
    var poly=document.createElementNS(NS,'polygon');
    poly.setAttribute('points', x2+','+y2+' '+(x2+len*Math.cos(a1))+','+(y2+len*Math.sin(a1))+' '+(x2+len*Math.cos(a2))+','+(y2+len*Math.sin(a2)));
    svg.appendChild(poly);
    return svg;
  }

  /* ---------- layers ---------- */
  var hotLayer = el('div','rd-hotlayer'); hotLayer.style.position='absolute'; hotLayer.style.inset='0'; hotLayer.style.pointerEvents='none'; hotLayer.style.zIndex='2147482000';
  var hotspots=[]; var openPop=null;

  function clearHot(){ hotLayer.innerHTML=''; hotspots=[]; openPop=null; }

  function buildHotspots(){
    clearHot();
    var steps=STEPS[page()]||[];
    steps.forEach(function(step,i){
      var t=pickEl(step.sel); if(!t) return;
      var dot=el('div','rd-hotspot', String(i+1)); dot.style.pointerEvents='auto';
      hotLayer.appendChild(dot);
      var rec={dot:dot, target:t, step:step};
      hotspots.push(rec);
      dot.addEventListener('click', function(ev){ ev.stopPropagation(); togglePop(rec); });
      dot.addEventListener('mouseenter', function(){ if(!openPop) showPop(rec,true); });
    });
    positionHot();
  }
  function positionHot(){
    hotspots.forEach(function(rec){
      var r=rectOf(rec.target);
      rec.dot.style.left=(r.x+r.w-6)+'px';
      rec.dot.style.top=(r.y+12)+'px';
    });
    if(openPop) drawPop(openPop);
  }
  function clearPop(){
    var p=$('.rd-pop',hotLayer), a=$('.rd-arrow',hotLayer);
    if(p)p.remove(); if(a)a.remove(); openPop=null;
  }
  function togglePop(rec){ if(openPop===rec){ clearPop(); } else { showPop(rec,false); } }
  function showPop(rec, transient){ clearPop(); openPop=rec; rec._transient=transient; drawPop(rec);
    if(transient){ rec.dot.addEventListener('mouseleave', function h(){ if(openPop&&openPop._transient){clearPop();} rec.dot.removeEventListener('mouseleave',h); }); }
  }
  function drawPop(rec){
    var p=$('.rd-pop',hotLayer); var a=$('.rd-arrow',hotLayer);
    if(p)p.remove(); if(a)a.remove();
    var s=L(rec.step);
    var bubble=el('div','rd-pop','<h5>'+esc(s.t)+'</h5>'+esc(s.d)+'<span class="rd-tag">'+esc(L(TAG))+'</span>');
    hotLayer.appendChild(bubble);
    var dr=rectOf(rec.dot); var tr=rectOf(rec.target);
    var bw=270, bx=dr.x - bw - 18, by=dr.y - 10;
    if(bx<window.scrollX+8) bx=dr.x+40;
    if(by<window.scrollY+8) by=window.scrollY+8;
    bubble.style.left=bx+'px'; bubble.style.top=by+'px';
    var br=rectOf(bubble);
    var arrow=buildArrow(br.x+br.w*0.5, br.y+br.h+2, dr.x+8, dr.y+8);
    hotLayer.appendChild(arrow);
    requestAnimationFrame(function(){ bubble.classList.add('show'); arrow.classList.add('show'); });
  }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ---------- guided tour (spotlight) ---------- */
  var tour={i:0, on:false, backdrop:null, spot:null, tip:null};
  function startTour(){
    var steps=STEPS[page()]||[]; if(!steps.length) return;
    clearPop();
    tour.on=true; tour.i=0;
    if(!tour.backdrop){
      tour.backdrop=el('div','rd-tour-backdrop');
      tour.spot=el('div','rd-spotlight'); tour.backdrop.appendChild(tour.spot);
      tour.tip=el('div','rd-tip');
      document.body.appendChild(tour.backdrop); document.body.appendChild(tour.tip);
      tour.backdrop.addEventListener('click',function(e){ if(e.target===tour.backdrop) endTour(); });
    }
    tour.backdrop.classList.add('show');
    showTourStep();
  }
  function endTour(){
    tour.on=false;
    if(tour.backdrop)tour.backdrop.classList.remove('show');
    if(tour.tip)tour.tip.classList.remove('show');
    try{ localStorage.setItem(SEEN_KEY,'1'); }catch(e){}
  }
  function showTourStep(){
    var steps=STEPS[page()]||[]; var step=steps[tour.i]; if(!step){ endTour(); return; }
    var t=pickEl(step.anchor||step.sel)||pickEl(step.sel);
    if(!t){ tour.i++; return showTourStep(); }
    t.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(function(){
      var r=t.getBoundingClientRect();
      var pad=8;
      tour.spot.style.left=(r.left+window.scrollX-pad)+'px';
      tour.spot.style.top=(r.top+window.scrollY-pad)+'px';
      tour.spot.style.width=(r.width+pad*2)+'px';
      tour.spot.style.height=(r.height+pad*2)+'px';
      var s=L(step);
      var total=steps.length;
      tour.tip.innerHTML='<button class="rd-skip" aria-label="close">&times;</button>'+
        '<div class="rd-step">'+ (getLang()==='ar'?'خطوة ':'Step ')+(tour.i+1)+' / '+total+'</div>'+
        '<h4>'+esc(s.t)+'</h4><p>'+esc(s.d)+'</p>'+
        '<span class="rd-tag">'+esc(L(TAG))+'</span>'+
        '<div class="rd-actions"><span class="rd-progress"></span>'+
        (tour.i>0?'<button class="rd-back">'+(getLang()==='ar'?'السابق':'Back')+'</button>':'')+
        '<button class="rd-next">'+(tour.i===total-1?(getLang()==='ar'?'إنهاء':'Finish'):(getLang()==='ar'?'التالي':'Next'))+'</button></div>';
      // position tip near spotlight
      var rr=tour.spot.getBoundingClientRect();
      var tw=Math.min(330, window.innerWidth*0.9);
      var left=rr.right+16; if(left+tw>window.innerWidth-10) left=Math.max(10, rr.left-tw-16);
      var top=Math.max(70, Math.min(rr.top, window.innerHeight-220));
      tour.tip.style.left=left+'px'; tour.tip.style.top=top+'px';
      tour.tip.classList.add('show');
      $('.rd-skip',tour.tip).onclick=endTour;
      $('.rd-next',tour.tip).onclick=function(){ if(step.action==='owner') showOwner(step.action,{}); if(tour.i>=total-1){endTour();}else{tour.i++;showTourStep();} };
      var b=$('.rd-back',tour.tip); if(b)b.onclick=function(){ tour.i=Math.max(0,tour.i-1); showTourStep(); };
    },380);
  }

  /* ---------- owner notification illustration ---------- */
  var ownerEl=null, ownerTimer=null;
  function fmtNum(n){ var v=Number(n||0); if(isNaN(v))v=0; try{return v.toLocaleString('en-US');}catch(e){return ''+v;} }
  function showOwner(kind, data){
    data=data||{};
    var products=data.products&&data.products.length?data.products.map(function(p){return (p.name||'Product')+' ×'+(p.quantity||1);}).join(', '):(data.productName||'Défroisseur Vapeur 1800W ×1');
    var name=data.customer||data.fullName||'Amine B.';
    var phone=data.phone||'0661 23 45 67';
    var wilaya=data.wilaya||'Alger';
    var total=data.totalPrice!=null?fmtNum(data.totalPrice):'6 600';
    var en=getLang()==='en';
    if(ownerEl){ ownerEl.remove(); ownerEl=null; }
    ownerEl=el('div','rd-owner',
      '<button class="rd-oclose" aria-label="close">&times;</button>'+
      '<div class="rd-ohead"><div class="rd-tg">✈</div><div><b>'+(en?'New order — ROBUSTE':'طلب جديد — ROBUSTE')+'</b>'+
        '<small>'+(en?'Sent to you the instant the customer confirms':'يصلك فور تأكيد العميل')+'</small></div></div>'+
      '<div class="rd-obody">'+
        '<div class="rd-line"><span>'+(en?'📦 Product':'📦 المنتج')+'</span><span>'+esc(products)+'</span></div>'+
        '<div class="rd-line"><span>'+(en?'👤 Name':'👤 الاسم')+'</span><span>'+esc(name)+'</span></div>'+
        '<div class="rd-line"><span>'+(en?'📞 Phone':'📞 الهاتف')+'</span><span dir="ltr">'+esc(phone)+'</span></div>'+
        '<div class="rd-line"><span>'+(en?'📍 Wilaya':'📍 الولاية')+'</span><span>'+esc(wilaya)+'</span></div>'+
        '<div class="rd-line"><span>'+(en?'💰 Total':'💰 المجموع')+'</span><span><b>'+esc(total)+' DZD</b></span></div>'+
      '</div>'+
      '<div class="rd-channels">'+
        '<div class="rd-ch"><i>✈</i>'+(en?'Telegram':'تيليغرام')+'</div>'+
        '<div class="rd-ch"><i>✉</i>'+(en?'Email':'الإيميل')+'</div>'+
      '</div>'+
      '<div class="rd-ofoot">'+(en?'✅ <b>You’re notified instantly.</b> Confirm the order by calling the customer.':'✅ <b>يصلك الإشعار فوراً.</b> أكّد الطلب بالاتصال بالعميل.')+'</div>'+
      '<span class="rd-badge-demo">'+(en?'demo — not really sent':'عرض — لم تُرسل فعلاً')+'</span>');
    document.body.appendChild(ownerEl);
    $('.rd-oclose',ownerEl).onclick=function(){ ownerEl.classList.remove('show'); };
    requestAnimationFrame(function(){ ownerEl.classList.add('show'); });
    if(ownerTimer)clearTimeout(ownerTimer);
    ownerTimer=setTimeout(function(){ if(ownerEl)ownerEl.classList.remove('show'); },9000);
  }

  /* ---------- control dock ---------- */
  var dock;
  function buildDock(){
    dock=el('div','rd-dock');
    dock.innerHTML='<span class="rd-dot"></span><span class="rd-label">DEMO</span>'+
      '<button class="rd-play">▶ <span class="rd-en">Guided tour</span><span class="rd-ar">جولة إرشادية</span></button>'+
      '<button class="rd-ghost rd-toggle">✨ <span class="rd-en">Hints</span><span class="rd-ar">تلميحات</span></button>'+
      '<button class="rd-lang"><span class="l-en">EN</span><span class="l-ar">ع</span></button>';
    document.body.appendChild(dock);
    $('.rd-play',dock).onclick=startTour;
    var hintsOn=true;
    $('.rd-toggle',dock).onclick=function(){ hintsOn=!hintsOn; hotLayer.style.display=hintsOn?'block':'none'; if(!hintsOn)clearPop(); };
    $('.rd-lang',dock).onclick=function(){ setLang(getLang()==='en'?'ar':'en'); };
    render();
  }
  function render(){
    if(!dock) return;
    var en=getLang()==='en';
    $('.l-en',dock).className='l-en'+(en?' on':'');
    $('.l-ar',dock).className='l-ar'+(!en?' on':'');
    if(openPop) drawPop(openPop);
  }

  /* ---------- admin bypass ---------- */
  function adminBypass(){
    var gate=document.getElementById('loginGate');
    var app=document.getElementById('app');
    if(gate) gate.style.display='none';
    if(app){
      app.style.display='block';
      var who=document.getElementById('adminWho'); if(who) who.textContent='demo@robuste.dz (demo mode)';
      var en=getLang()==='en';
      var banner=el('div','rd-admin-banner',
        '<span class="rd-ico">🔒</span><div>'+
        (en?'<b>Demo mode — login skipped.</b> In production, only ONE authorized email + password (the credentials I hand you) can open this dashboard, secured by Firebase Authentication. No one else can view your orders.':
             '<b>وضع العرض — تم تخطي تسجيل الدخول.</b> في الإنتاج، بريد واحد فقط + كلمة مرور (اللي نعطيها لك) يقدر يدخل هذه اللوحة، محمية بـ Firebase. ما حد آخر يقدر يشوف طلباتك.')+
        '</div>');
      app.insertBefore(banner, app.firstChild);
    }
    // If orders never load (no Firebase in demo), inject sample rows + stats.
    setTimeout(injectDemoOrders, 2200);
  }
  function injectDemoOrders(){
    var tc=document.getElementById('tableContent'); if(!tc) return;
    if(tc.querySelector('table')) return; // real data already loaded
    var en=getLang()==='en';
    var rows=[
      ['#1042','Amine B.','0661 23 45 67','Alger','Défroisseur Vapeur 1800W','6 600', en?'New':'جديد'],
      ['#1041','Sara K.','0770 11 22 33','Oran','Aspirateur Sans Fil 20V','5 100', en?'Confirmed':'مؤكّد'],
      ['#1040','Yacine M.','0555 88 77 66','Sétif','Nettoyeur 4-en-1','23 500', en?'Delivered':'مُسلّم'],
      ['#1039','Lina T.','0699 44 55 66','Blida','Défroisseur Vapeur 1800W','6 600', en?'Delivered':'مُسلّم']
    ];
    var th=en?['Order','Customer','Phone','Wilaya','Product','Total (DZD)','Status']:['الطلب','العميل','الهاتف','الولاية','المنتج','المجموع','الحالة'];
    var html='<table class="table align-middle mb-0"><thead><tr>'+th.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+
      rows.map(function(r){return '<tr>'+r.map(function(c,idx){return '<td'+(idx===6?' style="font-weight:700;color:#c2410c"':'')+' dir="'+(idx===2?'ltr':'auto')+'">'+esc(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
    tc.innerHTML=html;
    var rc=document.getElementById('resultCount'); if(rc)rc.textContent=(en?'Showing 4 demo orders':'عرض 4 طلبات تجريبية');
    setText('statTotal','42'); setText('statNew','7'); setText('statDelivered','29'); setText('statRevenue','318 400');
  }
  function setText(id,v){ var e=document.getElementById(id); if(e&&(e.textContent==='—'||e.textContent.trim()===''))e.textContent=v; }

  /* ---------- expose owner hook + drain queue ---------- */
  window.RobusteDemo = window.RobusteDemo || {};
  window.RobusteDemo.showOwnerNotification = function(kind,data){ if(kind==='review') return; showOwner(kind,data); };
  window.RobusteDemo.startTour = startTour;

  /* ---------- init ---------- */
  function init(){
    document.body.appendChild(hotLayer);
    buildDock();
    if(page()==='admin'){ adminBypass(); }
    buildHotspots();
    window.addEventListener('resize', positionHot);
    window.addEventListener('scroll', positionHot, true);
    // re-scan after dynamic content (products/reviews) renders
    setTimeout(buildHotspots, 1500);
    setTimeout(buildHotspots, 3500);
    // drain any queued owner notifications from telegram stub
    if(window.__robusteOwnerQueue&&window.__robusteOwnerQueue.length){
      var q=window.__robusteOwnerQueue.pop(); showOwner(q.kind,q.data);
    }
    // auto-start tour first visit
    try{ if(!localStorage.getItem(SEEN_KEY)){ setTimeout(startTour, 1200); } }catch(e){}
    document.addEventListener('click', function(e){ if(openPop&&!e.target.closest('.rd-hotspot')&&!e.target.closest('.rd-pop')) clearPop(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
