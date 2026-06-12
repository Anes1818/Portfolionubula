/* ROBUSTE — DEMO guided showcase layer.
   - Floating demo control bar (toggle annotations, replay intro)
   - Page-aware annotation pins on key elements (skips any that don't exist)
   - Simulated "owner notified" toast wired to the mock Telegram event
   - Bilingual (AR/EN) copy following the site's saved language
   No external libraries. Pure CSS animations. */
(function () {
  'use strict';

  /* ---------------- i18n copy ---------------- */
  function lang() {
    try { var s = localStorage.getItem('site_lang'); if (s === 'en' || s === 'fr' || s === 'ar') return s; } catch (e) {}
    return (document.documentElement.getAttribute('lang') || 'ar');
  }
  function L(ar, en) { return lang() === 'ar' ? ar : en; }

  /* ---------------- which page are we on ---------------- */
  function page() {
    var p = location.pathname.toLowerCase();
    if (/admin/.test(p)) return 'admin';
    if (/product\.html/.test(p)) return 'product';
    if (/proclean/.test(p)) return 'landing';
    return 'home';
  }

  /* ---------------- annotation definitions per page ---------------- */
  function annos() {
    var P = page();
    if (P === 'home') return [
      { sel: '#i18nSwitcher', n: 1, t: L('لغتان بضغطة زر', 'One-click bilingual'), d: L('المتجر بالكامل يتبدل بين العربية والإنجليزية (RTL↔LTR).', 'The entire store flips between Arabic & English — layout direction included (RTL↔LTR).') },
      { sel: '#productsContainer', n: 2, t: L('كل شيء قابل للتخصيص', 'Fully customizable'), d: L('الألوان، المنتجات، التخطيط والخطوط — كلها تُبنى حسب علامتك التجارية.', 'Colors, products, layout & fonts — all rebuilt around your brand.') },
      { sel: '#floatingCart', n: 3, t: L('سلة ذكية', 'Smart cart'), d: L('سلة قابلة للسحب مع حفظ تلقائي ودفع عند الاستلام.', 'Draggable cart with auto-save and cash-on-delivery checkout.') }
    ];
    if (P === 'product') return [
      { sel: '#orderModal, .buy-now-btn, [onclick*="directBuy"]', n: 1, t: L('طلب سريع', 'Express order'), d: L('العميل يطلب بخطوات قليلة دون حساب. جرّب إتمام طلب!', 'Customers order in a few taps — no account. Try placing one!') },
      { sel: '#reviewsRow', n: 2, t: L('آراء العملاء', 'Customer reviews'), d: L('تقييمات حقيقية تصل لوحة التحكم للمراجعة.', 'Reviews flow into the admin dashboard for moderation.') }
    ];
    if (P === 'admin') return [
      { sel: '#statsRow', n: 1, t: L('لوحة تحكم خاصة', 'Private dashboard'), d: L('المالك يرى الإحصائيات، الإيرادات والطلبات الجديدة فوراً.', 'The owner sees stats, revenue & new orders at a glance.') },
      { sel: '#tableContent', n: 2, t: L('إدارة الطلبات', 'Order management'), d: L('اضغط أي طلب لتغيير حالته: جديد → مؤكد → تم التسليم.', 'Click any order to move it: New → Confirmed → Delivered.') }
    ];
    return [];
  }

  /* ---------------- annotation rendering ---------------- */
  var annoEls = [];
  function clearAnnos() {
    annoEls.forEach(function (a) { try { a.el.remove(); } catch (e) {} if (a.target) a.target.classList.remove('demo-highlight'); });
    annoEls = [];
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  }
  function firstMatch(sel) {
    var parts = sel.split(',');
    for (var i = 0; i < parts.length; i++) { var el = document.querySelector(parts[i].trim()); if (el) return el; }
    return null;
  }
  function placeAnno(a) {
    var target = firstMatch(a.sel);
    if (!target) return;
    target.classList.add('demo-highlight');
    var wrap = document.createElement('div');
    wrap.className = 'demo-anno';
    wrap.innerHTML = '<div class="demo-pin">' + a.n + '</div>' +
      '<div class="demo-tip"><b>' + a.t + '</b>' + a.d + '</div>';
    document.body.appendChild(wrap);
    var rec = { el: wrap, target: target };
    annoEls.push(rec);
    positionOne(rec);
    setTimeout(function () { wrap.classList.add('show'); }, 120 * a.n);
  }
  function positionOne(rec) {
    var r = rec.target.getBoundingClientRect();
    var top = r.top + window.scrollY + 8;
    var left = r.left + window.scrollX + 8;
    // keep pins on-screen horizontally
    left = Math.max(12, Math.min(left, document.documentElement.clientWidth - 48));
    rec.el.style.top = top + 'px';
    rec.el.style.left = left + 'px';
  }
  function reposition() { annoEls.forEach(positionOne); }

  var annoOn = false;
  function toggleAnnos(force) {
    annoOn = (typeof force === 'boolean') ? force : !annoOn;
    var btn = document.getElementById('demoAnnoBtn');
    if (annoOn) {
      annos().forEach(placeAnno);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      if (btn) { btn.classList.add('on'); btn.textContent = L('✖ إخفاء الشرح', '✖ Hide tips'); }
    } else {
      clearAnnos();
      if (btn) { btn.classList.remove('on'); btn.textContent = L('✨ شرح توضيحي', '✨ Guided tips'); }
    }
  }

  /* ---------------- demo control bar ---------------- */
  function buildBar() {
    if (document.getElementById('demoBar')) return;
    var bar = document.createElement('div');
    bar.id = 'demoBar';
    bar.innerHTML =
      '<span class="demo-tag"><span class="dot"></span>' + L('عرض توضيحي', 'DEMO') + '</span>' +
      '<button id="demoAnnoBtn">' + L('✨ شرح توضيحي', '✨ Guided tips') + '</button>' +
      '<button id="demoIntroBtn">' + L('ℹ ما هذا؟', 'ℹ What\'s this?') + '</button>' +
      '<button class="demo-x" id="demoHideBar" title="hide">✕</button>';
    document.body.appendChild(bar);
    document.getElementById('demoAnnoBtn').addEventListener('click', function () { toggleAnnos(); });
    document.getElementById('demoIntroBtn').addEventListener('click', function () { showIntro(true); });
    document.getElementById('demoHideBar').addEventListener('click', function () { bar.remove(); toggleAnnos(false); });
  }

  /* ---------------- owner-notification toast ---------------- */
  function toast(opts) {
    var wrap = document.getElementById('demoToastWrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'demoToastWrap'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'demo-toast';
    t.innerHTML = '<div class="ic ' + (opts.tg ? 'tg' : '') + '">' + (opts.icon || '✅') + '</div>' +
      '<div><div class="ttl">' + opts.title + '</div><div class="sub">' + opts.sub + '</div></div>' +
      '<div class="bar"></div>';
    wrap.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); setTimeout(function () { t.remove(); }, 450); }, 5000);
  }

  window.addEventListener('robuste-demo:notify', function (e) {
    var d = (e && e.detail) || {};
    if (d.kind === 'order') {
      var p = d.payload || {};
      toast({ tg: true, icon: '✈', title: L('تم إشعار المالك (محاكاة)', 'Owner notified (simulated)'),
        sub: L('في المتجر الحقيقي يصل هذا الطلب فوراً عبر تيليجرام + البريد.', 'In the real store this order is pushed instantly via Telegram + email.') });
      setTimeout(function () {
        toast({ icon: '📊', title: L('ظهر في لوحة التحكم', 'Added to dashboard'),
          sub: L('افتح صفحة الإدارة لرؤية الطلب الجديد.', 'Open the Admin page to see the new order.') });
      }, 900);
    } else if (d.kind === 'review') {
      toast({ icon: '⭐', title: L('تقييم جديد (محاكاة)', 'New review (simulated)'),
        sub: L('يصل المالك إشعار فوري بالتقييم.', 'The owner gets an instant notification.') });
    }
  });

  /* ---------------- intro splash ---------------- */
  function showIntro(force) {
    try { if (!force && localStorage.getItem('robuste_demo_intro') === '1') return; } catch (e) {}
    if (document.getElementById('demoIntro')) return;
    var ov = document.createElement('div');
    ov.id = 'demoIntro';
    ov.innerHTML =
      '<div class="card">' +
      '<span class="badge-demo">' + L('عرض توضيحي — معرض أعمال', 'PORTFOLIO DEMO') + '</span>' +
      '<h2>ROBUSTE</h2>' +
      '<p>' + L('هذه نسخة عرض آمنة من متجر حقيقي. تصفّح، أضف للسلة، وأتمّ طلباً — كل شيء يعمل، بدون دفع حقيقي.',
        'A safe demo of a real store. Browse, add to cart and place an order — everything works, with no real charges or data.') + '</p>' +
      '<ul class="feats">' +
      '<li><i>✔</i>' + L('دفع عند الاستلام يعمل بالكامل (محاكاة)', 'Full cash-on-delivery checkout (simulated)') + '</li>' +
      '<li><i>✔</i>' + L('إشعارات الطلبات ولوحة تحكم للمالك', 'Order alerts + owner dashboard') + '</li>' +
      '<li><i>✔</i>' + L('عربي / إنجليزي بضغطة زر', 'Arabic / English in one click') + '</li>' +
      '</ul>' +
      '<button class="go" id="demoIntroGo">' + L('ابدأ الجولة ✨', 'Start the tour ✨') + '</button>' +
      '<button class="skip" id="demoIntroSkip">' + L('تخطي والتصفح بحرية', 'Skip and explore freely') + '</button>' +
      '</div>';
    document.body.appendChild(ov);
    try { localStorage.setItem('robuste_demo_intro', '1'); } catch (e) {}
    document.getElementById('demoIntroGo').addEventListener('click', function () { ov.remove(); toggleAnnos(true); });
    document.getElementById('demoIntroSkip').addEventListener('click', function () { ov.remove(); });
  }

  /* ---------------- boot ---------------- */
  function boot() { buildBar(); showIntro(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
