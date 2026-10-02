/* Run with: node --test builder/tests/3d/model.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const plain = value => JSON.parse(JSON.stringify(value));
function load(shop) {
  const context = vm.createContext({ window: shop ? { NEBULA_SHOP: shop } : {} });
  for (const name of ['config.js', 'studio-3d-model.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, { filename: name });
  }
  return { M: context.window.Nebula3DModel, C: context.window.NebulaConfig };
}
function oneStem(M, id = 'rose_pink') {
  const design = M.create();
  design.items = [{ uid: 's1', id }];
  design.nextId = 2;
  return design;
}

test('every offered starting bouquet imports, survives an editable JSON round trip, and uses available stems', () => {
  const { M, C } = load();
  assert.ok(Object.keys(M.PRESETS).length >= 3);
  for (const preset of Object.keys(M.PRESETS)) {
    const design = M.create(preset);
    assert.ok(design.items.length > 0 && design.items.length <= M.LIMIT, preset);
    assert.equal(new Set(design.items.map(item => item.uid)).size, design.items.length, preset);
    for (const item of design.items) assert.ok(C.CAT[item.id], item.id);
    assert.deepEqual(plain(M.validate(design)), plain(design), preset);
    assert.deepEqual(plain(M.unpack(JSON.parse(JSON.stringify(M.pack(design))))), plain(design), preset);
  }
  assert.deepEqual(plain(M.create('missing-preset')), plain(M.create()));
  assert.notEqual(M.STORAGE_KEY, C.CONFIG.storageKey, '3D storage must not overwrite the photographic studio');
});

test('the supplied Blush hour bouquet has the exact sample estimate', () => {
  const { M } = load();
  // Nine roses, two tulips, two carnations, and two eucalyptus sprigs.
  assert.deepEqual(plain(M.price(M.create('blush'))), {
    stems: 9 * 400 + 2 * 300 + 2 * 250 + 2 * 200,
    preparation: 3500,
    ribbon: 0,
    total: 8600
  });
});

test('shop overrides affect stem, shape-specific preparation, and optional ribbon prices', () => {
  const { M } = load({
    baseCents: 1200,
    laborCents: { classic: 800, dome: 1100, heart: 1700 },
    extrasCents: { ribbon: 650 },
    flowerPrices: { rose_pink: 425 }
  });
  const design = oneStem(M);
  for (const [shape, preparation] of [['gathered', 2000], ['dome', 2300], ['heart', 2900]]) {
    design.shape = shape;
    design.ribbon = 'rose';
    assert.deepEqual(plain(M.price(design)), { stems: 425, preparation, ribbon: 650, total: 425 + preparation + 650 });
    design.ribbon = 'none';
    assert.equal(M.price(design).total, 425 + preparation, 'removing a ribbon removes its charge');
  }
});

test('an empty bouquet never charges preparation or optional ribbon', () => {
  const { M } = load({ extrasCents: { ribbon: 900 } });
  const design = M.create();
  design.items = [];
  for (const shape of M.SHAPES) {
    design.shape = shape;
    assert.deepEqual(plain(M.price(design)), { stems: 0, preparation: 0, ribbon: 0, total: 0 });
  }
});

test('adding and removing stops at 36, keeps identity stable, and never reuses a removed identity', () => {
  const { M } = load();
  const design = oneStem(M);
  for (let i = 1; i < 36; i++) assert.equal(M.add(design, 'rose_red'), true);
  assert.equal(design.items.length, 36);
  const full = plain(design);
  assert.equal(M.add(design, 'rose_red'), false);
  assert.deepEqual(plain(design), full, 'a rejected addition cannot mutate the design');
  const removed = design.items[7].uid;
  const kept = design.items.filter(item => item.uid !== removed).map(item => item.uid);
  assert.equal(M.remove(design, removed), true);
  assert.deepEqual(plain(design.items.map(item => item.uid)), plain(kept));
  assert.equal(M.add(design, 'tulip_white'), true);
  assert.notEqual(design.items.at(-1).uid, removed);
  assert.ok(M.validate(design));
  assert.equal(M.counts(design).rose_pink, 1);
  assert.equal(M.counts(design).rose_red, 34);
  assert.equal(M.counts(design).tulip_white, 1);
});

test('unknown stems and missing removals leave a design unchanged', () => {
  const { M } = load();
  const design = M.create(), before = plain(design);
  for (const id of ['unknown', '__proto__', 'constructor', '', null]) assert.equal(M.add(design, id), false);
  assert.equal(M.remove(design, 's999999'), false);
  assert.deepEqual(plain(design), before);
});

test('malformed, legacy, and foreign export envelopes are rejected without throwing', () => {
  const { M } = load();
  for (const raw of [null, false, 12, 'text', [], {}, { format: 'nebula-bouquet-3d', version: 2 },
    { format: 'other-app', version: 1, design: M.create() },
    { format: 'nebula-bouquet-3d', version: 1, design: {} }]) {
    assert.equal(M.unpack(raw), null);
  }
});

test('design schema rejects impossible choices, counts, versions, and identifiers', () => {
  const { M } = load();
  const invalid = [
    ['version', 0], ['version', '1'], ['shape', 'sphere'], ['paper', 'gold'],
    ['ribbon', 'blue'], ['greenery', true], ['title', 7], ['title', 'x'.repeat(71)],
    ['items', null], ['items', {}], ['nextId', 0], ['nextId', 1.5],
    ['nextId', Number.MAX_SAFE_INTEGER], ['nextId', '16']
  ];
  for (const [key, value] of invalid) {
    const raw = plain(M.create()); raw[key] = value;
    assert.equal(M.validate(raw), null, key + '=' + value);
  }
  const many = plain(M.create());
  many.items = Array.from({ length: 37 }, (_, i) => ({ uid: 's' + (i + 1), id: 'rose_red' }));
  many.nextId = 38;
  assert.equal(M.validate(many), null, 'oversized imports cannot bypass the limit');
  for (const item of [null, {}, { uid: 's1', id: 'unknown' }, { uid: 's1', id: '__proto__' },
    { uid: 's0', id: 'rose_red' }, { uid: 's01', id: 'rose_red' }, { uid: 's-1', id: 'rose_red' },
    { uid: 's10000000', id: 'rose_red' }, { uid: 1, id: 'rose_red' }]) {
    const raw = oneStem(M); raw.items = [item];
    assert.equal(M.validate(raw), null, JSON.stringify(item));
  }
});

test('duplicate identities and a nextId that could collide are rejected', () => {
  const { M } = load();
  const duplicate = plain(M.create()); duplicate.items[1].uid = duplicate.items[0].uid;
  assert.equal(M.validate(duplicate), null);
  const collision = oneStem(M); collision.nextId = 1;
  assert.equal(M.validate(collision), null);
});

test('identity exhaustion cannot produce an invalid saved design', () => {
  const { M } = load();
  const design = oneStem(M); design.nextId = 9999999;
  assert.equal(M.add(design, 'rose_red'), true);
  assert.ok(M.validate(design));
  const before = plain(design);
  assert.equal(M.add(design, 'rose_red'), false);
  assert.deepEqual(plain(design), before);
});

test('imported extra fields and prototype-shaped keys are discarded without polluting objects', () => {
  const { M } = load();
  const clean = plain(M.create());
  const raw = JSON.parse(JSON.stringify(clean));
  Object.defineProperty(raw, '__proto__', { enumerable: true, value: { polluted: true } });
  raw.constructor = { prototype: { polluted: true } };
  raw.script = '<script>alert(1)</script>';
  raw.items[0].priceCents = -900000;
  raw.items[0].position = { x: Infinity };
  const restored = M.unpack({ format: 'nebula-bouquet-3d', version: 1, design: raw, token: 'discard' });
  assert.deepEqual(plain(restored), clean);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(restored, '__proto__'), false);
});

test('export serialization includes only the supported schema', () => {
  const { M } = load();
  const design = plain(M.create());
  const expected = plain(design);
  design.sessionToken = 'must-not-export';
  design.items[0].internalNote = 'must-not-export';
  const exported = JSON.parse(JSON.stringify(M.pack(design)));
  assert.deepEqual(exported, { format: 'nebula-bouquet-3d', version: 1, design: expected });
});

test('clones, validation results, exports, and newly created bouquets do not alias mutable state', () => {
  const { M } = load();
  const design = M.create(), baseline = plain(design);
  const copies = [M.clone(design), M.validate(design), M.pack(design).design, M.create()];
  for (const copy of copies) { copy.items[0].id = 'sunflower'; copy.items.push({ uid: 's99', id: 'sunflower' }); }
  assert.deepEqual(plain(design), baseline);
  assert.deepEqual(plain(M.create()), baseline);
});
