/* webp.js — WebP-first image loading with automatic fallback.
   Every <img> whose src is .jpg/.jpeg/.png first tries the same path with
   .webp. If the .webp is missing, we quietly fall back to the original file
   (stopping other error handlers for that attempt so placeholder systems
   don't fire prematurely). If the original is missing too, the normal error
   flow (pixel.js placeholders) takes over. Handles dynamic images via
   MutationObserver. Runs synchronously so its handlers register first. */
(function () {
  'use strict';
  var RE = /\.(jpe?g|png)(\?[^#]*)?$/i;

  function upgrade(img) {
    var src = img.getAttribute('src') || '';
    if (!RE.test(src)) return;                 // not a raster we handle (or already .webp)
    if (img.dataset.webpFrom === src) return;  // this src IS our fallback — don't retry
    var webp = src.replace(RE, '.webp$2');
    img.dataset.webpFrom = src;                // remember the original for this attempt
    var prev = img.onerror;
    img.onerror = function (e) {
      this.onerror = prev || null;             // restore whatever was there
      if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
      this.setAttribute('src', src);           // fall back to the original file
    };
    img.setAttribute('src', webp);
  }

  function scan(root) {
    var imgs = root.querySelectorAll ? root.querySelectorAll('img[src]') : [];
    for (var i = 0; i < imgs.length; i++) upgrade(imgs[i]);
    if (root.tagName === 'IMG' && root.getAttribute('src')) upgrade(root);
  }

  function observe() {
    new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        var mu = muts[m];
        if (mu.type === 'attributes') { upgrade(mu.target); continue; }
        for (var n = 0; n < mu.addedNodes.length; n++) {
          var node = mu.addedNodes[n];
          if (node.nodeType === 1) scan(node);
        }
      }
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  // Run NOW (script sits at the end of <body>), so our error handlers are
  // registered before any other error listeners react to the .webp attempt.
  scan(document);
  observe();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(document); });
  }
})();
