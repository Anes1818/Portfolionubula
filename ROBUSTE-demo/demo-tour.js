/* ROBUSTE - DEMO guided spotlight tour.
   A narrated, sequential walkthrough that drives through the site:
   logo -> dark mode -> language -> cart (drag, open, CTA, close) -> hero ->
   free explore + WhatsApp. The product page gets its own matching tour.
   Bilingual (AR primary / EN). No external libraries. */
(function () {
  'use strict';

  function lang() {
    try { var s = localStorage.getItem('site_lang'); if (s === 'en' || s === 'fr' || s === 'ar') return s; } catch (e) {}
    return (document.documentElement.getAttribute('lang') || 'ar');
  }
  function L(ar, en) { return lang() === 'en' ? en : ar; }
  function page() {
    var p = location.pathname.toLowerCase();
    if (/admin/.test(p)) return 'admin';
    if (/product\.html/.test(p)) return 'product';
    if (/proclean/.test(p)) return 'landing';
    return 'home';
  }
  function $(s) { var parts = s.split(','); for (var i = 0; i < parts.length; i++) { var el = document.querySelector(parts[i].trim()); if (el) return el; } return null; }

  /* ---------- actions used by steps ---------- */
  function openCart(done) {
    var el = document.getElementById('cartOffcanvas');
    try { if (window.bootstrap && el) { window.bootstrap.Offcanvas.getOrCreateInstance(el).show(); } else if (el) { el.classList.add('show'); el.style.visibility = 'visible'; } } catch (e) {}
    setTimeout(done, 480);
  }
  function closeCart() {
    var el = document.getElementById('cartOffcanvas');
    try { if (window.bootstrap && el) { var inst = window.bootstrap.Offcanvas.getInstance(el); if (inst) inst.hide(); } else if (el) { el.classList.remove('show'); } } catch (e) {}
  }
  var darkDone = false;
  function enableDark(done) {
    if (!darkDone) {
      var t = document.getElementById('themeToggle');
      var isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark') ||
        document.body.getAttribute('data-theme') === 'dark' || document.documentElement.getAttribute('data-bs-theme') === 'dark';
      if (t && !isDark) { try { t.click(); } catch (e) {} }
      darkDone = true;
    }
    setTimeout(done, 350);
  }

  /* ---------- step scripts ---------- */
  function steps() {
    var P = page();
    if (P === 'home') return [
      { sel: '.navbar-brand', t: L('شعار متجرك 👑', 'Your logo 👑'),
        b: L('نبدأ من الشعار — نخصّص شعار متجرك كما تريد، أو نصمّم لك واحدًا احترافيًا مجانًا تمامًا مثل هذا.',
          'We start with the logo — we customize yours exactly how you want, or design a professional one for you completely free, just like this.') },
      { sel: '#themeToggle', before: enableDark, t: L('الوضع الليلي 🌙', 'Dark mode 🌙'),
        b: L('بضغطة واحدة يتحوّل المتجر إلى الوضع الليلي — مريح لعيون زبائنك ويعطي طابعًا عصريًا أنيقًا.',
          'One tap flips the whole store to dark mode — easy on your customers\' eyes and gives a sleek, modern feel.') },
      { sel: '#i18nSwitcher, #i18nBtn', t: L('لغتان بضغطة زر 🌐', 'Bilingual in one click 🌐'),
        b: L('أضفت اللغة العربية لتتماشى مع اللغة المحلية لزبائنك — والموقع بالكامل يتبدّل فورًا، مع اتجاه الكتابة (يمين/يسار).',
          'I added Arabic to match your customers\' local language — the entire site switches instantly, writing direction (RTL/LTR) included.') },
      { sel: '#floatingCart, #dragCartBtn', t: L('السلة العائمة 🛒', 'The floating cart 🛒'),
        b: L('هذه سلة المشتريات — يمكنك سحبها وتحريكها، وهي تطفو فوق الصفحة حتى لا تكون مزعجة. اضغط (التالي) وسأفتحها لك.',
          'This is the shopping cart — you can drag it anywhere; it floats above the page so it\'s never in the way. Hit Next and I\'ll open it for you.') },
      { sel: '#checkoutBtn', before: openCart, after: closeCart, t: L('زر الشراء (CTA) ✅', 'The buy button (CTA) ✅'),
        b: L('داخل السلة أضفت زر دعوة واضح (CTA) لتشجيع الزبون على إتمام الطلب فورًا — كل خطوة مصمّمة لزيادة مبيعاتك.',
          'Inside the cart I added a clear call-to-action button to push customers to complete the order right away — every step is designed to boost your sales.') },
      { sel: '.hero-container, .hero-title', t: L('الواجهة الرئيسية 🖼️', 'The hero section 🖼️'),
        b: L('يمكنك طلب وتخصيص أي صورة وسنضعها هنا — وحتّى تأثيرات خلفية متحركة فاخرة مثل متجرنا الآخر.',
          'You can request and customize any image and we\'ll place it here — even premium animated background effects like our other store.') },
      { sel: '.whatsapp-btn, .whatsapp-float', t: L('أنت حر الآن! 🚀', 'You\'re free to explore! 🚀'),
        b: L('تجوّل في المتجر كما تشاء — أي عنصر تضغط عليه يعرض معلومات مفيدة: تفاصيل المنتج، معلومات التواصل وغيرها. وهذا زر واتساب للتواصل المباشر معك بنقرة.',
          'Roam the store freely — anything you click reveals useful info: product details, contact info and more. And this WhatsApp button connects customers to you in a single tap.') }
    ];
    if (P === 'product') return [
      { sel: '.navbar-brand', t: L('شعار متجرك 👑', 'Your logo 👑'),
        b: L('نفس الهوية في كل صفحة — نخصّص شعارك أو نصمّم لك واحدًا مجانًا مثل هذا.',
          'The same identity on every page — we customize your logo or design one for you free, like this.') },
      { sel: '#themeToggle', before: enableDark, t: L('الوضع الليلي 🌙', 'Dark mode 🌙'),
        b: L('وضع ليلي بضغطة زر على صفحة المنتج أيضًا — تجربة متناسقة وأنيقة.',
          'Dark mode on the product page too — a consistent, elegant experience.') },
      { sel: '#i18nSwitcher, #i18nBtn', t: L('عربي / إنجليزي 🌐', 'Arabic / English 🌐'),
        b: L('كل تفاصيل المنتج تترجم فورًا بين العربية والإنجليزية.',
          'Every product detail translates instantly between Arabic and English.') },
      { sel: '#mainProductImg, .main-image-wrapper', t: L('معرض صور المنتج 📸', 'Product gallery 📸'),
        b: L('صور متعددة بزوايا مختلفة — نضع صور منتجاتك الحقيقية، مع تكبير وتنقّل سلس.',
          'Multiple images and angles — we set these to your real product photos, with smooth zoom and navigation.') },
      { sel: '#orderForm, #submitOrderFinal', t: L('طلب سريع بدون حساب ⚡', 'Express order ⚡'),
        b: L('الزبون يطلب في خطوات قليلة: الاسم، الهاتف، الولاية، والدفع عند الاستلام. جرّب إتمام طلب الآن — وستصلك إشعار فوري!',
          'Customers order in a few steps: name, phone, wilaya, cash on delivery. Try placing an order now — you\'ll get an instant notification!') },
      { sel: '#reviewsRow, #openReviewBtn', t: L('آراء العملاء ⭐', 'Customer reviews ⭐'),
        b: L('تقييمات حقيقية تبني الثقة، وتصل مباشرة إلى لوحة تحكمك لمراجعتها.',
          'Real reviews build trust and flow straight to your dashboard for moderation.') },
      { sel: '.whatsapp-float, .whatsapp-btn', t: L('تواصل مباشر 💬', 'Direct contact 💬'),
        b: L('زر واتساب للتواصل الفوري معك. أنت حر الآن — استكشف صفحة المنتج بالكامل!',
          'A WhatsApp button for instant contact. You\'re free now — explore the full product page!') }
    ];
    return [];
  }

  /* ---------- engine ---------- */
  var STEPS = [], idx = 0, mask, spot, pop, active = false;
  function ensureEls() {
    if (mask) return;
    mask = document.createElement('div'); mask.id = 'demoMask';
    spot = document.createElement('div'); spot.id = 'demoSpot';
    pop = document.createElement('div'); pop.id = 'demoPop';
    document.body.appendChild(mask); document.body.appendChild(spot); document.body.appendChild(pop);
  }
  function dots(n, cur) {
    var h = '<div class="demo-dots">';
    for (var i = 0; i < n; i++) h += '<i class="' + (i === cur ? 'act' : '') + '"></i>';
    return h + '</div>';
  }
  function position(rec) {
    var pad = 8;
    var r = rec.target.getBoundingClientRect();
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    spot.style.top = (r.top - pad) + 'px';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    // tooltip placement: below if room, else above; clamp horizontally
    var pw = pop.offsetWidth || 320, ph = pop.offsetHeight || 200;
    var top, left;
    if (r.bottom + ph + 18 < vh) top = r.bottom + 14;
    else if (r.top - ph - 18 > 0) top = r.top - ph - 14;
    else top = Math.max(12, (vh - ph) / 2);
    left = r.left + r.width / 2 - pw / 2;
    left = Math.max(12, Math.min(left, vw - pw - 12));
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }
  var curRec = null;
  function reposition() { if (active && curRec) position(curRec); }

  function render() {
    var step = STEPS[idx];
    var go = function () {
      var target = $(step.sel);
      if (!target) { // skip missing
        if (idx < STEPS.length - 1) { idx++; render(); } else { end(); }
        return;
      }
      try { target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (e) {}
      setTimeout(function () {
        curRec = { target: target };
        mask.classList.add('on'); spot.classList.add('on');
        pop.innerHTML =
          '<span class="demo-step">' + L('الخطوة', 'Step') + ' ' + (idx + 1) + ' / ' + STEPS.length + '</span>' +
          '<h4>' + step.t + '</h4><p>' + step.b + '</p>' +
          '<div class="demo-acts">' +
          (idx > 0 ? '<button class="demo-back">' + L('رجوع', 'Back') + '</button>' : '') +
          '<button class="demo-next">' + (idx === STEPS.length - 1 ? L('إنهاء ✔', 'Finish ✔') : L('التالي ←', 'Next →')) + '</button>' +
          '</div>' + dots(STEPS.length, idx) +
          '<div style="text-align:center"><button class="demo-skip">' + L('تخطّي الجولة', 'Skip tour') + '</button></div>';
        pop.classList.add('on');
        position(curRec);
        pop.querySelector('.demo-next').addEventListener('click', next);
        var back = pop.querySelector('.demo-back'); if (back) back.addEventListener('click', prev);
        pop.querySelector('.demo-skip').addEventListener('click', end);
      }, 420);
    };
    if (step.before) step.before(go); else go();
  }
  function leave() { var s = STEPS[idx]; if (s && s.after) try { s.after(); } catch (e) {} }
  function next() { if (idx === STEPS.length - 1) { end(); return; } leave(); idx++; render(); }
  function prev() { if (idx === 0) return; leave(); idx--; render(); }
  function start() {
    STEPS = steps(); if (!STEPS.length) return;
    ensureEls(); active = true; darkDone = false; idx = 0;
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    render();
  }
  function end() {
    leave(); active = false; curRec = null;
    if (mask) mask.classList.remove('on');
    if (spot) spot.classList.remove('on');
    if (pop) pop.classList.remove('on');
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  }
  window.ROBUSTE_DEMO = window.ROBUSTE_DEMO || {};
  window.ROBUSTE_DEMO.startTour = start;

  /* ---------- demo control bar ---------- */
  function buildBar() {
    if (document.getElementById('demoBar')) return;
    var bar = document.createElement('div'); bar.id = 'demoBar';
    bar.innerHTML =
      '<span class="demo-tag"><span class="dot"></span>' + L('عرض توضيحي', 'DEMO') + '</span>' +
      '<button id="demoStartBtn">' + L('▶ ابدأ الجولة', '▶ Start tour') + '</button>' +
      '<button class="demo-x" id="demoHideBar" title="hide">✕</button>';
    document.body.appendChild(bar);
    document.getElementById('demoStartBtn').addEventListener('click', start);
    document.getElementById('demoHideBar').addEventListener('click', function () { bar.remove(); });
  }

  /* ---------- owner-notification toast ---------- */
  function toast(opts) {
    var wrap = document.getElementById('demoToastWrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'demoToastWrap'; document.body.appendChild(wrap); }
    var t = document.createElement('div'); t.className = 'demo-toast';
    t.innerHTML = '<div class="ic ' + (opts.tg ? 'tg' : '') + '">' + (opts.icon || '✅') + '</div>' +
      '<div><div class="ttl">' + opts.title + '</div><div class="sub">' + opts.sub + '</div></div><div class="bar"></div>';
    wrap.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); setTimeout(function () { t.remove(); }, 450); }, 5000);
  }
  window.addEventListener('robuste-demo:notify', function (e) {
    var d = (e && e.detail) || {};
    if (d.kind === 'order') {
      toast({ tg: true, icon: '✈', title: L('تم إشعار المالك (محاكاة)', 'Owner notified (simulated)'),
        sub: L('في المتجر الحقيقي يصل الطلب فورًا عبر تيليجرام + البريد.', 'In the real store this order is pushed instantly via Telegram + email.') });
      setTimeout(function () { toast({ icon: '📊', title: L('ظهر في لوحة التحكم', 'Added to dashboard'),
        sub: L('افتح صفحة الإدارة لرؤية الطلب الجديد.', 'Open the Admin page to see the new order.') }); }, 900);
    } else if (d.kind === 'review') {
      toast({ icon: '⭐', title: L('تقييم جديد (محاكاة)', 'New review (simulated)'),
        sub: L('يصل المالك إشعار فوري بالتقييم.', 'The owner gets an instant notification.') });
    }
  });

  /* ---------- intro splash ---------- */
  function showIntro(force) {
    if (page() === 'admin' || page() === 'landing') return; // tours only on home + product
    try { if (!force && localStorage.getItem('robuste_demo_intro_v2') === '1') return; } catch (e) {}
    if (document.getElementById('demoIntro')) return;
    var ov = document.createElement('div'); ov.id = 'demoIntro';
    ov.innerHTML = '<div class="card">' +
      '<span class="badge-demo">' + L('جولة تعريفية', 'GUIDED TOUR') + '</span>' +
      '<h2>ROBUSTE</h2>' +
      '<p>' + L('دعني آخذك في جولة سريعة حول المتجر وأشرح لك كل ميزة — خطوة بخطوة.',
        'Let me take you on a quick guided tour of the store and walk you through every feature — step by step.') + '</p>' +
      '<button class="go" id="demoIntroGo">' + L('ابدأ الجولة ✨', 'Start the tour ✨') + '</button>' +
      '<button class="skip" id="demoIntroSkip">' + L('ربما لاحقًا، سأستكشف بنفسي', 'Maybe later, I\'ll explore myself') + '</button>' +
      '</div>';
    document.body.appendChild(ov);
    try { localStorage.setItem('robuste_demo_intro_v2', '1'); } catch (e) {}
    document.getElementById('demoIntroGo').addEventListener('click', function () { ov.remove(); start(); });
    document.getElementById('demoIntroSkip').addEventListener('click', function () { ov.remove(); });
  }

  function boot() { buildBar(); setTimeout(function () { showIntro(false); }, 700); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
