/* DEMO TOUR — guided, narrated walkthrough (RTL, mobile-first)
   Auto-starts once per session; re-playable via the floating button. */
(function () {
  "use strict";
  function ready(fn){ if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  function q(s){ try { return document.querySelector(s); } catch (e) { return null; } }
  function visible(el){ return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }

  /* ---- Bootstrap helpers (offcanvas cart + mobile menu) ---- */
  function cartOC(){
    try {
      var el = document.getElementById("cartOffcanvas");
      if (el && window.bootstrap && bootstrap.Offcanvas) return bootstrap.Offcanvas.getOrCreateInstance(el, { backdrop:false, scroll:true });
    } catch (e) {}
    return null;
  }
  function openCart(){ var o = cartOC(); if (o) try { o.show(); } catch (e) {} }
  function closeCart(){ var o = cartOC(); if (o) try { o.hide(); } catch (e) {} }
  function menu(show){
    if (window.innerWidth >= 992) return; // already visible on desktop
    try {
      var n = document.getElementById("navbarNav");
      if (n && window.bootstrap && bootstrap.Collapse) {
        var c = bootstrap.Collapse.getOrCreateInstance(n, { toggle:false });
        show ? c.show() : c.hide();
      }
    } catch (e) {}
  }

  /* ---- Step definitions per page ---- */
  function buildSteps(){
    var isProduct = !!q("#mainProductImg");
    if (isProduct) {
      return [
        { el:".navbar-brand", t:"اللوغو 🏷️", h:"هذا هو اللوغو — خصّصه وفق متجرك، أو أصمّم لك واحداً مجاناً مثل هذا." },
        { el:"#themeToggle", t:"الوضع الليلي 🌙", h:"جرّب الضغط — يتبدّل الموقع بالكامل لمظهر مظلم أنيق ومريح للعين." },
        { el:"#navbarNav", t:"اللغة 🗣️", h:"الواجهة بالعربية لتتماشى مع اللغة المحلية لزبائنك (يمكن إضافة الفرنسية أيضاً).", before:function(){ menu(true); }, after:function(){ menu(false); }, delay:420 },
        { el:"#floatingCart", t:"السلة العائمة 🛒", h:"اسحبها وحرّكها أينما شئت — تطفو فوق الصفحة دون أن تكون مزعجة." },
        { el:"#mainProductImg", fallback:".main-image-wrapper", t:"صور المنتج 🖼️", h:"اطلب أي صور لمنتجاتك وسنضعها هنا، مع معرض صور مصغّرة يمكن التنقّل بينه." },
        { el:".price-block", fallback:".current-price", t:"السعر والعرض 💰", h:"نُبرز السعر والتخفيض بوضوح لتشجيع الزبون على الشراء." },
        { el:".whatsapp-float", t:"أنت حر بالاستكشاف 🚀", h:"أي زر تضغطه يعمل فعلاً، ولا تنسَ زر الواتساب 💬 للطلب والتواصل المباشر مع زبائنك.", last:true }
      ];
    }
    return [
      { el:".navbar-brand", t:"أهلاً 👋 — جولة سريعة", h:"سآخذك بجولة حول الموقع وأشرح كل شيء. نبدأ باللوغو 🏷️ — خصّصه وفق متجرك، أو أصمّم لك واحداً مجاناً مثل هذا." },
      { el:"#themeToggle", t:"الوضع الليلي 🌙", h:"بضغطة واحدة يتحوّل الموقع للوضع المظلم — مريح للعين ومظهر عصري." },
      { el:"#navbarNav", t:"اللغة 🗣️", h:"أضفت العربية لتتماشى مع اللغة المحلية لزبائنك (يمكن إضافة الفرنسية أيضاً).", before:function(){ menu(true); }, after:function(){ menu(false); }, delay:420 },
      { el:"#floatingCart", t:"السلة العائمة 🛒", h:"يمكنك سحبها وتحريكها أينما شئت، فهي تطفو دون أن تكون مزعجة." },
      { el:"#floatingCart", t:"جرّبها بنفسك 👆", h:"السلة قابلة للضغط تماماً مثل المتجر الحقيقي.", interactive:true, clickEl:"#dragCartBtn", hint:"👆 اضغط على السلة لفتحها" },
      { el:"#emptyCartBtn", fallback:"#cartOffcanvas", t:"زر التحفيز (CTA) ✅", h:"هنا أضفت زر CTA لتشجيع الزبائن على إتمام الشراء.", before:function(){ openCart(); }, after:function(){ closeCart(); }, delay:480 },
      { el:".hero-container", t:"الصورة الرئيسية 🖼️", h:"اطلب وخصّص أي صورة وسنضعها هنا، مع تأثيرات خلفية متحركة مثل متجرنا الآخر." },
      { el:".whatsapp-btn", fallback:".whatsapp-float", t:"أنت حر بالاستكشاف 🚀", h:"أي شيء تضغط عليه يعمل ويُظهر معلوماته (تواصل، منتجات...). ولا تنسَ زر الواتساب 💬 للتواصل المباشر.", last:true }
    ];
  }

  /* ---- Engine ---- */
  var S = [], i = 0, spot, tip, curEl, clickHandler, curClickEl, built = false;

  function buildDom(){
    if (built) return; built = true;
    spot = document.createElement("div"); spot.id = "tourSpot"; spot.className = "tour-hidden";
    tip  = document.createElement("div"); tip.id  = "tourTip";  tip.className  = "tour-hidden";
    document.body.appendChild(spot); document.body.appendChild(tip);
    var rep = document.createElement("button");
    rep.id = "tourReplay"; rep.type = "button"; rep.innerHTML = "🎬 جولة الموقع";
    rep.addEventListener("click", start);
    document.body.appendChild(rep);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("keydown", function (e){ if (e.key === "Escape" && tip && !tip.classList.contains("tour-hidden")) end(); });
  }

  function clearClick(){
    if (clickHandler && curClickEl) curClickEl.removeEventListener("click", clickHandler);
    clickHandler = null; curClickEl = null;
    if (curEl && curEl.classList) curEl.classList.remove("tour-pulse");
  }

  function reposition(){ if (tip && !tip.classList.contains("tour-hidden") && curEl) place(curEl); }

  function place(el){
    var r = el.getBoundingClientRect(), pad = 8;
    spot.style.left = (r.left - pad) + "px";
    spot.style.top  = (r.top - pad) + "px";
    spot.style.width  = (r.width + pad * 2) + "px";
    spot.style.height = (r.height + pad * 2) + "px";
    var tw = tip.offsetWidth || 320, th = tip.offsetHeight || 170, m = 12;
    var vw = window.innerWidth, vh = window.innerHeight;
    var left = r.left + r.width / 2 - tw / 2;
    left = Math.max(m, Math.min(left, vw - tw - m));
    var top;
    if (r.bottom + th + m < vh) top = r.bottom + m;
    else if (r.top - th - m > 0) top = r.top - th - m;
    else top = Math.max(m, (vh - th) / 2);
    tip.style.left = left + "px";
    tip.style.top  = top + "px";
  }

  function render(){
    var s = S[i], n = S.length, html = "";
    html += '<div class="tour-count">' + (i + 1) + ' / ' + n + '</div>';
    html += '<div class="tour-title">' + s.t + '</div>';
    html += '<div class="tour-text">' + s.h + '</div>';
    if (s.interactive) html += '<div class="tour-hint">' + (s.hint || "👆 اضغط للمتابعة") + '</div>';
    html += '<div class="tour-actions"><button class="tour-skip" type="button">تخطّي الجولة</button><div class="tour-right">';
    html += '<button class="tour-prev" type="button"' + (i === 0 ? ' disabled' : '') + '>السابق</button>';
    if (!s.interactive) html += '<button class="tour-next" type="button">' + (s.last ? 'إنهاء ✓' : 'التالي') + '</button>';
    html += '</div></div>';
    html += '<div class="tour-bar"><span style="width:' + Math.round((i + 1) / n * 100) + '%"></span></div>';
    tip.innerHTML = html;
    tip.querySelector(".tour-skip").addEventListener("click", end);
    var pv = tip.querySelector(".tour-prev"); if (pv) pv.addEventListener("click", function(){ go(i - 1); });
    var nx = tip.querySelector(".tour-next"); if (nx) nx.addEventListener("click", function(){ s.last ? end() : go(i + 1); });
  }

  function go(ni){
    var prev = S[i];
    if (prev && prev.after) try { prev.after(); } catch (e) {}
    clearClick();
    if (ni < 0) ni = 0;
    i = ni;
    show();
  }

  function show(){
    var s = S[i];
    if (s.before) try { s.before(); } catch (e) {}
    spot.classList.remove("tour-hidden");
    tip.classList.remove("tour-hidden");
    var el = q(s.el);
    if ((!el || !visible(el)) && s.fallback) { var f = q(s.fallback); if (f) el = f; }
    if (!el) { if (s.last) { end(); return; } return go(i + 1); }
    curEl = el;
    try { el.scrollIntoView({ block:"center", behavior:"smooth" }); } catch (e) { try { el.scrollIntoView(); } catch (_) {} }
    render();
    setTimeout(function(){
      var live = q(s.el);
      if ((!live || !visible(live)) && s.fallback) live = q(s.fallback) || curEl;
      curEl = live || curEl;
      place(curEl);
      if (s.interactive) {
        if (curEl.classList) curEl.classList.add("tour-pulse");
        var ce = s.clickEl ? q(s.clickEl) : curEl;
        curClickEl = ce || curEl;
        clickHandler = function(){ setTimeout(function(){ go(i + 1); }, 180); };
        curClickEl.addEventListener("click", clickHandler);
      }
    }, s.delay || 360);
  }

  function start(){
    buildDom();
    S = buildSteps();
    i = 0;
    show();
    try { sessionStorage.setItem("tourSeen", "1"); } catch (e) {}
  }

  function end(){
    var s = S[i]; if (s && s.after) try { s.after(); } catch (e) {}
    clearClick(); curEl = null;
    if (spot) spot.classList.add("tour-hidden");
    if (tip)  tip.classList.add("tour-hidden");
    try { sessionStorage.setItem("tourSeen", "1"); } catch (e) {}
  }

  ready(function(){
    buildDom();
    var seen = false; try { seen = sessionStorage.getItem("tourSeen") === "1"; } catch (e) {}
    if (!seen) setTimeout(start, 700);
  });
})();
