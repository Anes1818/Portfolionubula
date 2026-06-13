/* Reusable storefront template core.
   Reads config.js and applies client branding/contact/currency/payment settings. */
(function () {
  'use strict';
  var cfg = window.STORE_CONFIG || {};
  var biz = cfg.business || {}, contact = cfg.contact || {}, cur = cfg.currency || {}, payments = cfg.payments || {};
  function qs(s, root) { return (root || document).querySelector(s); }
  function qsa(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function text(el, v) { if (el && v != null && v !== '') el.textContent = String(v); }
  function attr(el, k, v) { if (el && v != null && v !== '') el.setAttribute(k, String(v)); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function formatMoney(n) {
    var num = Number(n); if (!isFinite(num)) num = 0;
    var locale = cur.locale || biz.locale || 'ar-DZ';
    var symbol = cur.symbol || cur.code || '';
    var formatted = num.toLocaleString(locale);
    return (cur.position === 'before') ? (symbol + ' ' + formatted) : (formatted + ' ' + symbol);
  }
  function waUrl(message) {
    var n = (contact.whatsapp || contact.phoneInternational || contact.phoneLocal || '').replace(/[^0-9]/g, '');
    if (!n) return '#';
    return 'https://wa.me/' + n + (message ? ('?text=' + encodeURIComponent(message)) : '');
  }
  function buildPaymentUrl(order) {
    var url = payments.checkoutUrl || '';
    if (!url || payments.mode === 'cod') return '';
    if (payments.appendOrderParams) {
      try {
        var u = new URL(url, location.href);
        if (order) {
          if (order.orderId || order.id) u.searchParams.set('order', order.orderId || order.id);
          if (order.totalPrice || order.total) u.searchParams.set('amount', order.totalPrice || order.total);
          if (cur.code) u.searchParams.set('currency', cur.code);
        }
        return u.toString();
      } catch (e) {}
    }
    return url;
  }
  function maybeAddPaymentCta(container, order) {
    var url = buildPaymentUrl(order);
    if (!container || !url) return;
    if (container.querySelector('[data-template-payment-cta]')) return;
    var a = document.createElement('a');
    a.setAttribute('data-template-payment-cta', 'true');
    a.className = 'btn btn-orange mt-2 w-100';
    a.href = url;
    if (payments.openInNewTab !== false) { a.target = '_blank'; a.rel = 'noopener'; }
    a.innerHTML = '<i class="bi bi-credit-card"></i> ' + esc(payments.enabledText || 'Pay now');
    container.appendChild(a);
  }
  function initFirebaseConfigGlobals(){
    if (cfg.firebase && cfg.firebase.config) window.firebaseConfig = cfg.firebase.config;
  }
  function applyBranding() {
    try { document.documentElement.style.setProperty('--primary', biz.accentColor || '#ff6600'); document.documentElement.style.setProperty('--demo-accent', biz.accentColor || '#ff6600'); } catch(e) {}
    qsa('.navbar-brand img').forEach(function(img){ attr(img, 'src', biz.logo); attr(img, 'alt', 'شعار ' + (biz.shortName || biz.name || 'المتجر')); });
    qsa('.navbar-brand span').forEach(function(el){ text(el, biz.name); if (biz.accentColor) el.style.color = biz.accentColor; });
    qsa('a[href*="wa.me"], .whatsapp-btn, .whatsapp-float').forEach(function(a){ attr(a, 'href', waUrl()); });
    qsa('a[href*="facebook.com/share/19QooaXfy8"], .social-icon').forEach(function(a){ if (contact.socials && contact.socials.facebook) attr(a, 'href', contact.socials.facebook); });
    qsa('iframe[src*="google.com/maps"]').forEach(function(f){ if (contact.googleMapsEmbedUrl) attr(f, 'src', contact.googleMapsEmbedUrl); attr(f, 'title', 'موقع متجر ' + (biz.name || '')); });
    qsa('a[href*="maps.app.goo.gl"]').forEach(function(a){ attr(a, 'href', contact.googleMapsUrl); });
    var title = qs('title'); if (title && biz.name && /ROBUSTE|robuste/i.test(title.textContent)) title.textContent = title.textContent.replace(/ROBUSTE eulma|ROBUSTE/gi, biz.name);
    qsa('meta[property="og:site_name"]').forEach(function(m){ attr(m, 'content', biz.shortName || biz.name); });
    qsa('meta[name="theme-color"]').forEach(function(m){ attr(m, 'content', biz.accentColor || '#ff6600'); });
  }
  function applyTextReplacements(root) {
    root = root || document.body;
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        if (!node.nodeValue || !/ROBUSTE|0656360457|laidaouih@gmail\.com|\+213 656 36 04 57|د\.ج|دج/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement; if (!p || /SCRIPT|STYLE|TEXTAREA|INPUT/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes=[], n; while((n=walker.nextNode())) nodes.push(n);
    nodes.forEach(function(node){
      var v = node.nodeValue;
      v = v.replace(/ROBUSTE eulma|ROBUSTE/gi, biz.name || 'Store');
      v = v.replace(/0656360457/g, contact.phoneLocal || '');
      v = v.replace(/\+213 656 36 04 57/g, contact.phoneInternational || '');
      v = v.replace(/laidaouih@gmail\.com/g, contact.email || '');
      node.nodeValue = v;
    });
  }
  function observeDynamicText(){
    try {
      var mo = new MutationObserver(function(muts){
        muts.forEach(function(m){ Array.prototype.forEach.call(m.addedNodes || [], function(node){ if (node.nodeType === 1) applyTextReplacements(node); }); });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch(e) {}
  }
  function announceOrder(order){
    try { window.dispatchEvent(new CustomEvent('template:order-created', { detail: order || {} })); } catch(e) {}
  }
  window.StoreTemplate = {
    config: cfg,
    formatMoney: formatMoney,
    waUrl: waUrl,
    buildPaymentUrl: buildPaymentUrl,
    maybeAddPaymentCta: maybeAddPaymentCta,
    announceOrder: announceOrder,
    applyBranding: applyBranding
  };
  window.addEventListener('template:order-created', function(e){
    var box = document.getElementById('orderSuccessOverlay') || document.querySelector('.status-indicator .alert') || document.querySelector('#statusMessage');
    maybeAddPaymentCta(box, e.detail || {});
  });
  function boot(){ initFirebaseConfigGlobals(); applyBranding(); applyTextReplacements(document.body); observeDynamicText(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
