/* ============================================================
   DEMO Telegram notifier (Michi normale landing demo)
   No real API/token/network. When an order is confirmed it shows
   a simulated "new order" message exactly like the one the owner
   would receive on Telegram in the real version.
   ============================================================ */
(function () {
  "use strict";

  function injectStyles() {
    if (document.getElementById("demo-tg-styles")) return;
    var css = ''
      + '.tg-toast{position:fixed;inset-inline-end:18px;bottom:18px;z-index:99999;width:min(92vw,360px);'
      + 'background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.28);overflow:hidden;'
      + 'font-family:inherit;transform:translateY(140%);opacity:0;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .4s;}'
      + '.tg-toast.show{transform:translateY(0);opacity:1;}'
      + '.tg-head{display:flex;align-items:center;gap:10px;background:#229ED9;color:#fff;padding:10px 14px;}'
      + '.tg-head .tg-logo{width:30px;height:30px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:#229ED9;font-size:18px;flex:0 0 auto;}'
      + '.tg-head b{font-size:.95rem;line-height:1.1;} .tg-head small{display:block;opacity:.85;font-size:.72rem;}'
      + '.tg-head .tg-x{margin-inline-start:auto;cursor:pointer;opacity:.9;font-size:18px;background:none;border:none;color:#fff;}'
      + '.tg-body{padding:14px;background:#e7f3fb;}'
      + '.tg-bubble{background:#fff;border-radius:12px;padding:12px 14px;font-size:.9rem;line-height:1.7;color:#1f2937;box-shadow:0 1px 2px rgba(0,0,0,.06);}'
      + '.tg-bubble .row{display:flex;justify-content:space-between;gap:10px;border-top:1px dashed #e5e7eb;padding-top:6px;margin-top:6px;}'
      + '.tg-bubble .row:first-of-type{border-top:0;padding-top:0;margin-top:0;}'
      + '.tg-bubble .k{color:#6b7280;} .tg-bubble .v{font-weight:700;text-align:end;}'
      + '.tg-title{font-weight:800;color:#229ED9;font-size:1rem;margin-bottom:8px;}'
      + '.tg-time{display:block;text-align:end;color:#94a3b8;font-size:.68rem;margin-top:6px;}'
      + '.tg-note{font-size:.72rem;color:#64748b;text-align:center;padding:8px 12px;background:#e7f3fb;}'
      + '@media (prefers-reduced-motion:reduce){.tg-toast{transition:opacity .3s;transform:none;}}';
    var s = document.createElement("style");
    s.id = "demo-tg-styles"; s.textContent = css;
    document.head.appendChild(s);
  }

  function esc(t){ return String(t == null ? "" : t).replace(/[&<>]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]; }); }

  function notify(order) {
    injectStyles();
    order = order || {};
    var isAr = (document.documentElement.getAttribute("lang") || "ar") === "ar";
    var t = {
      title: isAr ? "📦 طلب جديد!" : "📦 New order!",
      bot: isAr ? "بوت الطلبات" : "Orders bot",
      product: isAr ? "المنتج" : "Product",
      qty: isAr ? "الكمية" : "Qty",
      name: isAr ? "الاسم" : "Name",
      phone: isAr ? "الهاتف" : "Phone",
      wilaya: isAr ? "الولاية" : "Wilaya",
      address: isAr ? "العنوان" : "Address",
      total: isAr ? "الإجمالي" : "Total",
      note: isAr ? "هذه محاكاة — في النسخة الحقيقية يصلك إشعار فعلي على Telegram فورًا." : "This is a simulation — in the real version you get a real Telegram alert instantly.",
      dz: isAr ? "دج" : "DA"
    };
    var time = new Date().toLocaleTimeString(isAr ? "ar-DZ" : "fr-DZ", { hour: "2-digit", minute: "2-digit" });
    var rows = ''
      + '<div class="row"><span class="k">'+t.product+'</span><span class="v">'+esc(order.product)+'</span></div>'
      + '<div class="row"><span class="k">'+t.qty+'</span><span class="v">'+esc(order.qty)+'</span></div>'
      + '<div class="row"><span class="k">'+t.name+'</span><span class="v">'+esc(order.name)+'</span></div>'
      + '<div class="row"><span class="k">'+t.phone+'</span><span class="v" dir="ltr">'+esc(order.phone)+'</span></div>'
      + '<div class="row"><span class="k">'+t.wilaya+'</span><span class="v">'+esc(order.wilaya)+'</span></div>'
      + (order.address ? '<div class="row"><span class="k">'+t.address+'</span><span class="v">'+esc(order.address)+'</span></div>' : '')
      + '<div class="row"><span class="k">'+t.total+'</span><span class="v">'+esc(order.total)+' '+t.dz+'</span></div>';

    var el = document.createElement("div");
    el.className = "tg-toast";
    el.innerHTML = ''
      + '<div class="tg-head">'
      + '  <span class="tg-logo">✈</span>'
      + '  <div><b>Telegram</b><small>'+t.bot+'</small></div>'
      + '  <button class="tg-x" aria-label="close">×</button>'
      + '</div>'
      + '<div class="tg-body">'
      + '  <div class="tg-bubble">'
      + '    <div class="tg-title">'+t.title+'</div>'
      + rows
      + '    <span class="tg-time">'+time+' ✓✓</span>'
      + '  </div>'
      + '</div>'
      + '<div class="tg-note">'+t.note+'</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add("show"); });
    var close = function(){ el.classList.remove("show"); setTimeout(function(){ el.remove(); }, 600); };
    el.querySelector(".tg-x").addEventListener("click", close);
    setTimeout(close, 9000);
  }

  window.DemoTelegram = { notify: notify };
})();
