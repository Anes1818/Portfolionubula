/*
 * cart.js — SINGLE shopping-cart state module (one source of truth).
 * ------------------------------------------------------------------
 * WHY THIS EXISTS:
 *   The cart logic was duplicated: main.js (homepage) and product.html each
 *   had their own `cart` array, their own localStorage read/write, and their
 *   own add/remove/quantity rules. Two copies = two ways for the same cart to
 *   drift apart. This module owns the DATA; each page owns its RENDERING.
 *
 * DESIGN — separate STATE from VIEW:
 *   - State lives here (items, persistence, totals, merge-by-id rule).
 *   - Each page keeps its own renderer and subscribes via Cart.onChange(fn).
 *   - The internal items array is mutated IN PLACE (never reassigned), so a
 *     page can safely hold `var cart = Cart.items` and the reference stays
 *     valid for the life of the page. This is the key trick that lets us share
 *     state without rewriting every line that reads `cart`.
 *
 * API:
 *   Cart.items        -> live array of { id, name, price, image, quantity }
 *   Cart.load()       -> read from localStorage (in place) + notify renderers
 *   Cart.save()       -> write to localStorage + notify renderers
 *   Cart.add({id,name,price,image,quantity?}) -> merge by id, else push
 *   Cart.setQty(i,n)  -> set quantity (n < 1 removes the line)
 *   Cart.removeAt(i)  -> remove a line
 *   Cart.clear()      -> empty the cart
 *   Cart.count()      -> total number of units
 *   Cart.subtotal()   -> sum of price * quantity (a NUMBER; format with money.js)
 *   Cart.onChange(fn) -> register a renderer; called after every change
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'robuste_cart';
  var items = [];
  var listeners = [];

  function hasStorage() {
    return typeof global.localStorage !== 'undefined' && global.localStorage;
  }

  // Mutate the SAME array object in place so external references stay valid.
  function setItems(arr) {
    items.length = 0;
    if (Array.isArray(arr)) {
      for (var i = 0; i < arr.length; i++) items.push(arr[i]);
    }
  }

  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      // A broken renderer must never break the cart itself.
      try { listeners[i](api); } catch (e) {}
    }
  }

  function load() {
    var parsed = [];
    try {
      var raw = hasStorage() ? global.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) parsed = JSON.parse(raw) || [];
    } catch (e) { parsed = []; }
    setItems(parsed);
    emit();
    return items;
  }

  function save() {
    try {
      if (hasStorage()) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { /* storage full / private mode — keep in-memory cart */ }
    emit();
  }

  function add(product) {
    product = product || {};
    var id = (product.id != null && product.id !== '') ? product.id : Date.now().toString();
    var qty = product.quantity || 1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) { items[i].quantity += qty; save(); return; }
    }
    items.push({
      id: id,
      name: product.name || '',
      price: Number(product.price) || 0,
      image: product.image || '',
      quantity: qty
    });
    save();
  }

  function setQty(index, qty) {
    if (index < 0 || index >= items.length) return;
    if (qty < 1) { removeAt(index); return; }
    items[index].quantity = qty;
    save();
  }

  function removeAt(index) {
    if (index < 0 || index >= items.length) return;
    items.splice(index, 1);
    save();
  }

  function clear() { setItems([]); save(); }

  function count() {
    var c = 0;
    for (var i = 0; i < items.length; i++) c += items[i].quantity || 0;
    return c;
  }

  function subtotal() {
    var t = 0;
    for (var i = 0; i < items.length; i++) {
      t += (Number(items[i].price) || 0) * (items[i].quantity || 0);
    }
    return t;
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    items: items,
    load: load,
    save: save,
    add: add,
    setQty: setQty,
    removeAt: removeAt,
    clear: clear,
    count: count,
    subtotal: subtotal,
    onChange: function (cb) { if (typeof cb === 'function') listeners.push(cb); return api; }
  };

  load();

  global.Cart = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
