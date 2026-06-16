/* ============================================================
   DEMO engine (Michi normale landing demo)
   100% in-browser. No Firebase, no network, no real orders.
   Handles: wilaya list, qty stepper, gallery, language/theme
   toggle, reveal, the "how product pics work" demo, and the
   confirm -> simulated Telegram alert flow.
   ============================================================ */
(function () {
  "use strict";

  var WILAYAS = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الواد","خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تيموشنت","غرداية","غليزان","المغير","المنيعة","أولاد جلال","بني عباس","تيميمون","توقرت","جانت","عين صالح","المنصورة"];

  function $(s, r){ return (r||document).querySelector(s); }
  function $all(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }

  /* ---------- Language toggle (data-ar / data-en) ---------- */
  function applyLang(lang){
    var ar = lang === "ar";
    document.documentElement.setAttribute("lang", ar ? "ar" : "en");
    document.documentElement.setAttribute("dir", ar ? "rtl" : "ltr");
    $all("[data-ar]").forEach(function(el){
      var v = el.getAttribute(ar ? "data-ar" : "data-en");
      if (v != null) el.textContent = v;
    });
    $all("[data-ar-ph]").forEach(function(el){
      var v = el.getAttribute(ar ? "data-ar-ph" : "data-en-ph");
      if (v != null) el.setAttribute("placeholder", v);
    });
    var lbl = $(".lang-label"); if (lbl) lbl.textContent = ar ? "EN" : "AR";
    try { localStorage.setItem("michi_lang", lang); } catch(e){}
  }
  function initLang(){
    var saved = "ar";
    try { var s = localStorage.getItem("michi_lang"); if (s === "ar" || s === "en") saved = s; } catch(e){}
    applyLang(saved); // Arabic-first
    var btn = $(".lang-btn");
    if (btn) btn.addEventListener("click", function(){
      applyLang((document.documentElement.getAttribute("lang") === "ar") ? "en" : "ar");
    });
  }

  /* ---------- Theme toggle ---------- */
  function initTheme(){
    var btn = $(".theme-btn");
    if (btn) btn.addEventListener("click", function(){
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
    });
  }

  /* ---------- Reveal (just make visible; no scroll lib needed) ---------- */
  function initReveal(){ $all(".reveal").forEach(function(el){ el.classList.add("in","visible","show"); el.style.opacity = "1"; el.style.transform = "none"; }); }

  /* ---------- Gallery thumbnails ---------- */
  function initGallery(){
    var main = $(".gallery .main"); if (!main) return;
    $all(".gallery .thumbs button").forEach(function(b){
      b.addEventListener("click", function(){
        var img = b.style.backgroundImage;
        if (img) main.style.backgroundImage = img;
        $all(".gallery .thumbs button").forEach(function(x){ x.classList.remove("active"); });
        b.classList.add("active");
      });
    });
  }

  /* ---------- Wilaya select ---------- */
  function initWilaya(){
    var sel = $('select[data-field="wilaya"]'); if (!sel || sel.options.length > 1) return;
    var ph = document.createElement("option"); ph.value = ""; ph.textContent = "اختر الولاية"; ph.disabled = true; ph.selected = true;
    sel.appendChild(ph);
    WILAYAS.forEach(function(w, i){ var o = document.createElement("option"); o.value = w; o.textContent = (i+1) + " - " + w; sel.appendChild(o); });
  }

  /* ---------- Quantity stepper ---------- */
  function initQty(){
    var input = $('input[data-field="qty"]'); if (!input) return;
    function clamp(v){ v = parseInt(v,10); if (isNaN(v) || v < 1) v = 1; return v; }
    $all('.qty button').forEach(function(b){
      b.addEventListener("click", function(){
        var dir = b.getAttribute("data-step");
        input.value = clamp((parseInt(input.value,10)||1) + (dir === "down" ? -1 : 1));
      });
    });
  }

  /* ---------- "How product pics work" demo ---------- */
  function injectPicsDemo(){
    var gallery = $(".gallery"); if (!gallery || $("#picsDemo")) return;
    var css = ''
      + '#picsDemo{margin-top:16px;border:1.5px dashed #c9a96e;border-radius:14px;padding:14px;background:rgba(201,169,110,.07);}'
      + '#picsDemo .pd-h{display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:6px;}'
      + '#picsDemo .pd-h .pd-badge{background:#c9a96e;color:#1a1a1a;border-radius:999px;font-size:.7rem;font-weight:800;padding:3px 9px;}'
      + '#picsDemo p{font-size:.82rem;color:#6b7280;line-height:1.6;margin:.2rem 0 .7rem;}'
      + '#picsDemo .pd-btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;background:#1a1a1a;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:.88rem;font-weight:700;}'
      + '#picsDemo .pd-btn:hover{opacity:.9;} #picsDemo input[type=file]{display:none;}'
      + '#picsDemo .pd-ok{display:none;font-size:.8rem;color:#15803d;font-weight:700;margin-top:8px;}';
    var s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);

    var box = document.createElement("div");
    box.id = "picsDemo";
    box.innerHTML = ''
      + '<div class="pd-h"><span>📸</span><span data-ar="كيف تُضاف صور المنتج" data-en="How product photos are added">كيف تُضاف صور المنتج</span><span class="pd-badge">DEMO</span></div>'
      + '<p data-ar="جرّب بنفسك: ارفع صورة من جهازك وستظهر فورًا كصورة للمنتج. في نسختك الحقيقية ترفع صورك الخاصة بسهولة وتظهر بنفس الجودة." data-en="Try it: upload an image from your device and it appears instantly as the product photo. In your real version you upload your own photos just as easily.">جرّب بنفسك: ارفع صورة من جهازك وستظهر فورًا كصورة للمنتج. في نسختك الحقيقية ترفع صورك الخاصة بسهولة وتظهر بنفس الجودة.</p>'
      + '<button type="button" class="pd-btn"><span>⬆</span><span data-ar="ارفع صورتك" data-en="Upload your photo">ارفع صورتك</span></button>'
      + '<input type="file" accept="image/*">'
      + '<div class="pd-ok" data-ar="✅ تم! هكذا تظهر صورة منتجك." data-en="✅ Done! This is how your product photo appears.">✅ تم! هكذا تظهر صورة منتجك.</div>';
    gallery.appendChild(box);

    var btn = box.querySelector(".pd-btn");
    var file = box.querySelector('input[type=file]');
    var ok = box.querySelector(".pd-ok");
    var main = $(".gallery .main");
    btn.addEventListener("click", function(){ file.click(); });
    file.addEventListener("change", function(){
      var f = file.files && file.files[0]; if (!f || !main) return;
      var url = URL.createObjectURL(f);
      main.style.backgroundImage = "url('" + url + "')";
      var thumbs = $(".gallery .thumbs");
      if (thumbs){
        var b = document.createElement("button");
        b.style.backgroundImage = "url('" + url + "')";
        $all(".gallery .thumbs button").forEach(function(x){ x.classList.remove("active"); });
        b.classList.add("active");
        b.addEventListener("click", function(){ main.style.backgroundImage = b.style.backgroundImage; $all(".gallery .thumbs button").forEach(function(x){ x.classList.remove("active"); }); b.classList.add("active"); });
        thumbs.appendChild(b);
      }
      ok.style.display = "block";
    });
  }

  /* ---------- Order form -> simulated Telegram alert ---------- */
  function initOrder(){
    var form = $("#orderForm"); if (!form) return;
    var okMsg = form.querySelector(".order-ok");
    if (okMsg) okMsg.style.display = "none";
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var get = function(f){ var el = form.querySelector('[data-field="'+f+'"]'); return el ? el.value.trim() : ""; };
      var name = get("name"), phone = get("phone"), wilaya = get("wilaya");
      if (!name || !phone || !wilaya){
        var isAr = document.documentElement.getAttribute("lang") === "ar";
        alert(isAr ? "الرجاء إكمال الاسم ورقم الهاتف والولاية." : "Please fill in name, phone and wilaya.");
        return;
      }
      var qty = parseInt(get("qty"),10) || 1;
      var price = parseInt(form.getAttribute("data-price"),10) || 0;
      var order = {
        product: form.getAttribute("data-product") || "المنتج",
        qty: qty, name: name, phone: phone, wilaya: wilaya,
        address: get("address"), total: (price * qty).toLocaleString()
      };
      // store mock order
      try { var arr = JSON.parse(localStorage.getItem("michi_orders")||"[]"); arr.push({o:order,t:Date.now()}); localStorage.setItem("michi_orders", JSON.stringify(arr)); } catch(err){}
      // show success + simulated Telegram notification
      if (okMsg) okMsg.style.display = "block";
      var btn = form.querySelector('button[type="submit"]');
      if (btn){ btn.disabled = true; setTimeout(function(){ btn.disabled = false; }, 4000); }
      if (window.DemoTelegram) window.DemoTelegram.notify(order);
      if (okMsg && okMsg.scrollIntoView) okMsg.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function init(){
    initLang(); initTheme(); initReveal(); initGallery();
    initWilaya(); initQty(); injectPicsDemo(); initOrder();
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
