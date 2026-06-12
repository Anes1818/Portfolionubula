/* ROBUSTE - DEMO Telegram notifier (mock).
   The real store sends every order to the owner's Telegram instantly.
   In this public demo there is NO real bot token and NO network call.
   We simulate the notification and broadcast an event so the demo UI can
   show a "sent to owner" confirmation. */
(function () {
  'use strict';
  function num(n) { var v = Number(n || 0); if (isNaN(v)) v = 0; try { return v.toLocaleString('fr-DZ'); } catch (e) { return String(v); } }
  function announce(kind, payload) {
    try { window.dispatchEvent(new CustomEvent('robuste-demo:notify', { detail: { kind: kind, payload: payload } })); } catch (e) {}
    try { console.log('[DEMO] Telegram notification simulated:', kind, payload); } catch (e) {}
  }
  window.sendOrderToTelegram = function (order) {
    order = order || {};
    announce('order', {
      customer: order.customer || order.fullName || '-',
      phone: order.phone || '-',
      wilaya: order.wilaya || '-',
      total: num(order.totalPrice)
    });
    return Promise.resolve({ ok: true, demo: true });
  };
  window.sendReviewToTelegram = function (review) {
    review = review || {};
    announce('review', { name: review.name || '-', rating: review.rating || 5 });
    return Promise.resolve({ ok: true, demo: true });
  };
})();
