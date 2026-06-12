/* ROBUSTE - DEMO build of telegram.js
 * SAFE BY DESIGN: this demo version contains NO bot token and NO chat id.
 * It never sends anything to the real Telegram/owner. Instead it triggers a
 * visual "owner notification" illustration so portfolio visitors can SEE what
 * the shop owner receives the moment a customer confirms an order.
 *
 * The real production file sends a live Telegram message + the store also
 * emails the owner. Here we only simulate that, locally, in the browser.
 */
(function () {
  'use strict';

  function showOwnerNotification(kind, data) {
    try {
      if (window.RobusteDemo && typeof window.RobusteDemo.showOwnerNotification === 'function') {
        window.RobusteDemo.showOwnerNotification(kind, data || {});
      } else {
        // Guide not loaded yet -> queue it.
        window.__robusteOwnerQueue = window.__robusteOwnerQueue || [];
        window.__robusteOwnerQueue.push({ kind: kind, data: data || {} });
      }
    } catch (e) { try { console.warn('[demo] owner notif failed', e); } catch (x) {} }
  }

  // Same signatures as the real file, but they only simulate.
  window.sendOrderToTelegram = function (order) {
    try { console.info('[ROBUSTE DEMO] order captured (not sent to real Telegram):', order); } catch (e) {}
    showOwnerNotification('order', order || {});
    return Promise.resolve({ demo: true });
  };

  window.sendReviewToTelegram = function (review) {
    try { console.info('[ROBUSTE DEMO] review captured (not sent):', review); } catch (e) {}
    showOwnerNotification('review', review || {});
    return Promise.resolve({ demo: true });
  };
})();
