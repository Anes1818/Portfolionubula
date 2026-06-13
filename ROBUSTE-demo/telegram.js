/* Template-safe order/review notifier.
   IMPORTANT: No Telegram bot token belongs in frontend code.
   Put TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as Cloudflare Worker secrets. */
(function () {
  'use strict';
  function cfg(){ return (window.STORE_CONFIG && window.STORE_CONFIG.notifications) || {}; }
  function simulate(kind, payload){
    try { window.dispatchEvent(new CustomEvent('robuste-demo:notify', { detail: { kind: kind, payload: payload, simulated: true } })); } catch(e) {}
    return Promise.resolve({ ok: true, simulated: true });
  }
  function send(kind, payload){
    var c = cfg();
    var url = c.workerUrl || '';
    if (!url) {
      if (c.simulateWhenMissing !== false) return simulate(kind, payload);
      return Promise.resolve({ ok: false, skipped: true, reason: 'workerUrl_missing' });
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, payload: payload || {}, source: location.href })
    }).then(function(r){ return r.json().catch(function(){ return { ok: r.ok, status: r.status }; }); })
      .catch(function(err){
        if (c.simulateWhenMissing !== false) return simulate(kind, payload);
        return { ok: false, error: String(err && err.message || err) };
      });
  }
  window.sendOrderToTelegram = function(order){ return send('order', order); };
  window.sendReviewToTelegram = function(review){ return send('review', review); };
})();
