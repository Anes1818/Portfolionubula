/* ROBUSTE - Telegram order notifications
 * Sends every website order to the store owner's Telegram instantly.
 * Safe by design: wrapped in try/catch and never blocks the order flow.
 */
(function () {
  'use strict';

  var TG_TOKEN = '8763877858:AAGajhzW0CLppcvMLdwBa08ls-d3JfYaQkQ';
  var TG_CHAT = '7612146734';
  var TG_API = 'https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function num(n) {
    var v = Number(n || 0);
    if (isNaN(v)) v = 0;
    try { return v.toLocaleString('fr-DZ'); } catch (e) { return String(v); }
  }

  function fmtProducts(products) {
    if (!products || !products.length) return '';
    var lines = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i] || {};
      var qty = p.quantity || 1;
      var price = Number(p.price || 0);
      lines.push('\u2022 ' + esc(p.name || 'منتج') + ' \u00d7' + qty + ' = ' + num(price * qty) + ' دج');
    }
    return lines.join('\n');
  }

  // window.sendOrderToTelegram(order)
  // order: { products[], customer, phone, wilaya, address, payment, totalPrice, productName? }
  window.sendOrderToTelegram = function (order) {
    try {
      order = order || {};
      var productsText = fmtProducts(order.products);
      var productLine = productsText
        ? ('\ud83d\udce6 <b>المنتجات:</b>\n' + productsText + '\n')
        : (order.productName ? ('\ud83d\udce6 <b>المنتج:</b> ' + esc(order.productName) + '\n') : '');

      var msg =
        '\ud83d\udecd <b>طلب جديد \u2014 ROBUSTE</b>\n' +
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n' +
        productLine +
        '\ud83d\udc64 <b>الاسم:</b> ' + esc(order.customer || order.fullName || '-') + '\n' +
        '\ud83d\udcde <b>الهاتف:</b> ' + esc(order.phone || '-') + '\n' +
        '\ud83d\udccd <b>الولاية:</b> ' + esc(order.wilaya || '-') + '\n' +
        '\ud83c\udfe0 <b>العنوان:</b> ' + esc(order.address || '-') + '\n' +
        '\ud83d\udcb3 <b>الدفع:</b> ' + esc(order.payment || 'الدفع عند الاستلام') + '\n' +
        '\ud83d\udcb0 <b>المجموع:</b> ' + num(order.totalPrice) + ' دج\n' +
        '\ud83d\udd52 ' + new Date().toLocaleString('fr-DZ');

      return fetch(TG_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text: msg,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }).catch(function (e) { try { console.warn('Telegram send failed', e); } catch (x) {} });
    } catch (e) {
      try { console.warn('Telegram error', e); } catch (x) {}
    }
  };
})();
