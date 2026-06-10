// Quick logic check that runs in Node (no browser needed).
require('./money.js');
require('./store.config.js');
var Money = globalThis.Money;
var SC = globalThis.StoreConfig;

console.log('--- Money formatting (base price $49.99) ---');
['USD','EUR','GBP','CAD','AUD'].forEach(function (c) {
  console.log(c.padEnd(4), Money.price(49.99, c));
});

console.log('\n--- Shipping fee (US domestic) ---');
SC.fulfillment.methods.forEach(function (m) {
  console.log(m.id.padEnd(9), Money.price(SC.shippingFee(m.id, 49.99), 'USD'), '| subtotal $49.99');
});
console.log('standard  ', Money.price(SC.shippingFee('standard', 120), 'USD'), '| subtotal $120 (free over $' + SC.fulfillment.freeShippingOver + ')');

console.log('\n--- US sales tax (NY on $49.99) ---');
var rate = SC.taxRateForState('NY');
console.log('rate', rate, '| tax', Money.price(49.99 * rate, 'USD'), '| total', Money.price(49.99 * (1 + rate), 'USD'));

console.log('\n--- Variant axes ---');
SC.variantOptions.forEach(function (o) {
  console.log(o.name + ':', o.values.join(', '));
});
