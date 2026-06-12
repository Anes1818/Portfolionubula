/* ROBUSTE eulma — GA4 event tracking (safe & non-invasive).
   The base gtag.js tag lives in <head>; this file only adds shop events.
   Everything is wrapped in try/catch so it can never break the site. */
(function () {
  "use strict";

  function track(name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    } catch (e) {}
  }

  function num(str) {
    if (str == null) return undefined;
    var d = ("" + str).replace(/[^0-9]/g, "");
    return d ? parseInt(d, 10) : undefined;
  }

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  var CONFIRM = "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0637\u0644\u0628\u0643\u0645"; // تم تأكيد طلبكم
  var AMOUNT = "\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a"; // المبلغ الإجمالي
  var ORDERNO = "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628"; // رقم الطلب

  ready(function () {
    // 1) view_item on the product page
    try {
      var pid = null;
      try { pid = new URLSearchParams(location.search).get("pid"); } catch (e) {}
      if (pid || /product/i.test(location.pathname)) {
        track("view_item", pid ? { item_id: pid } : {});
      }
    } catch (e) {}

    // 2) WhatsApp clicks => contact (lead)
    document.addEventListener("click", function (e) {
      try {
        var t = e.target;
        var a = t && t.closest ? t.closest('a[href*="wa.me"],a[href*="whatsapp"]') : null;
        if (a) track("contact", { method: "whatsapp" });
      } catch (er) {}
    }, true);

    // 3) add_to_cart => wrap the global addToCart if it exists
    try {
      if (typeof window.addToCart === "function" && !window.addToCart.__gaWrapped) {
        var orig = window.addToCart;
        window.addToCart = function () {
          track("add_to_cart", {});
          return orig.apply(this, arguments);
        };
        window.addToCart.__gaWrapped = true;
      }
    } catch (e) {}

    // 4) begin_checkout => when the order modal opens
    try {
      document.addEventListener("shown.bs.modal", function () { track("begin_checkout", {}); });
    } catch (e) {}

    // 5) purchase => detect the success confirmation overlay
    var locked = false;
    function checkConfirm(node) {
      if (locked) return;
      try {
        var text = (node && node.textContent) || "";
        if (text.indexOf(CONFIRM) === -1) return;
        locked = true;
        var value = num((text.split(AMOUNT)[1] || "").split("\u062f")[0]); // digits before "د.ج"
        var afterNo = (text.split(ORDERNO)[1] || "");
        var tidMatch = afterNo.match(/[A-Za-z0-9\-]+/);
        var tid = (tidMatch && tidMatch[0]) || ("T" + Date.now());
        var params = { transaction_id: tid, currency: "DZD" };
        if (value != null) params.value = value;
        track("purchase", params);
        // allow a later, separate order to be counted again
        setTimeout(function () { locked = false; }, 10000);
      } catch (e) {}
    }

    checkConfirm(document.body);
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType === 1) checkConfirm(n);
            else if (n.nodeType === 3 && ("" + n.textContent).indexOf(CONFIRM) !== -1) checkConfirm(n.parentNode || document.body);
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  });
})();
