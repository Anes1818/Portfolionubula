/* ROBUSTE - DEMO image fallback + small niceties.
   Keeps every real `images/...` path untouched: once the real image folder is
   uploaded to the repo, genuine photos appear automatically. Until then,
   broken images get a tasteful branded placeholder instead of a broken icon. */
(function () {
  'use strict';
  var ACCENT = '#ff6600';
  function escapeXml(s) { return String(s).replace(/[<>&"']/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]; }); }
  function placeholder(label) {
    label = (label || 'ROBUSTE').toString().slice(0, 22);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fff3e9"/><stop offset="1" stop-color="#ffe0c7"/></linearGradient></defs>' +
      '<rect width="600" height="600" fill="url(#g)"/>' +
      '<g fill="none" stroke="' + ACCENT + '" stroke-width="6" opacity="0.5">' +
      '<rect x="190" y="180" width="220" height="170" rx="16"/><circle cx="300" cy="265" r="48"/></g>' +
      '<text x="300" y="430" font-family="Tajawal,Arial,sans-serif" font-size="30" font-weight="700" fill="' + ACCENT + '" text-anchor="middle">ROBUSTE</text>' +
      '<text x="300" y="470" font-family="Tajawal,Arial,sans-serif" font-size="20" fill="#b96a2e" text-anchor="middle">' + escapeXml(label) + '</text>' +
      '<text x="300" y="520" font-family="Tajawal,Arial,sans-serif" font-size="14" fill="#c98a5e" text-anchor="middle" opacity="0.8">demo preview image</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function fix(img) {
    if (!img || img.__demoFixed) return;
    img.__demoFixed = true;
    var label = img.getAttribute('alt') || img.getAttribute('title') || '';
    img.src = placeholder(label);
    img.style.objectFit = img.style.objectFit || 'contain';
  }
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && !/^data:/.test(t.src) && !t.getAttribute('data-orig')) fix(t);
  }, true);
  function sweep() {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.complete && im.naturalWidth === 0 && !/^data:/.test(im.src)) fix(im);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(sweep, 300); });
  else setTimeout(sweep, 300);
  window.addEventListener('load', function () { setTimeout(sweep, 300); });
  var n = 0, iv = setInterval(function () { sweep(); if (++n > 10) clearInterval(iv); }, 600);
})();
