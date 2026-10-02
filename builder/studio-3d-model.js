/* Independent 3D designs; the photographic studio's storage and recipes stay intact. */
(function (g) {
  'use strict';
  const { CAT, CONFIG } = g.NebulaConfig;
  const LIMIT = 36;
  const STORAGE_KEY = 'nebulaBouquet3D_v1';
  const IDS = ['rose_pink', 'rose_cream', 'rose_red', 'rose_white', 'rose_violet', 'rose_yellow',
    'tulip_pink', 'tulip_white', 'tulip_yellow', 'carnation_pink', 'carnation_white',
    'sunflower', 'gerbera_daisy', 'eucalyptus', 'babys_breath'];
  const SHAPES = ['gathered', 'dome', 'heart'];
  const PAPERS = ['ivory', 'blush', 'sage', 'noir', 'none'];
  const RIBBONS = ['ivory', 'rose', 'sage', 'none'];
  const PRESETS = {
    blush: { title: 'Blush hour', paper: 'ivory', ribbon: 'rose', ids: [
      'rose_pink', 'rose_cream', 'rose_pink', 'tulip_white', 'rose_cream',
      'rose_pink', 'carnation_white', 'rose_cream', 'rose_pink', 'tulip_white',
      'rose_cream', 'carnation_white', 'rose_pink', 'eucalyptus', 'eucalyptus'] },
    ivory: { title: 'Ivory garden', paper: 'sage', ribbon: 'ivory', ids: [
      'rose_white', 'rose_cream', 'gerbera_daisy', 'rose_white', 'tulip_white',
      'rose_cream', 'carnation_white', 'rose_white', 'tulip_white', 'rose_cream',
      'carnation_white', 'babys_breath', 'eucalyptus', 'eucalyptus', 'babys_breath'] },
    sunshine: { title: 'Golden day', paper: 'ivory', ribbon: 'sage', ids: [
      'sunflower', 'rose_yellow', 'rose_cream', 'tulip_yellow', 'sunflower',
      'rose_yellow', 'rose_cream', 'tulip_yellow', 'sunflower', 'rose_yellow',
      'rose_cream', 'gerbera_daisy', 'eucalyptus', 'eucalyptus', 'babys_breath'] }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function create(name = 'blush') {
    const p = PRESETS[name] || PRESETS.blush;
    return { version: 1, title: p.title, shape: 'gathered', paper: p.paper, ribbon: p.ribbon,
      greenery: false, nextId: p.ids.length + 1, items: p.ids.map((id, i) => ({ uid: 's' + (i + 1), id })) };
  }
  function validate(raw) {
    if (!raw || raw.version !== 1 || !SHAPES.includes(raw.shape) || !PAPERS.includes(raw.paper) ||
      !RIBBONS.includes(raw.ribbon) || raw.greenery !== false || typeof raw.title !== 'string' ||
      raw.title.length > 70 || !Array.isArray(raw.items) || raw.items.length > LIMIT ||
      !Number.isSafeInteger(raw.nextId) || raw.nextId < 1 || raw.nextId > 10000000) return null;
    const used = new Set();
    for (const item of raw.items) {
      if (!item || !IDS.includes(item.id) || typeof item.uid !== 'string' || !/^s[1-9]\d{0,6}$/.test(item.uid) ||
        +item.uid.slice(1) >= raw.nextId || used.has(item.uid)) return null;
      used.add(item.uid);
    }
    return { version: 1, title: raw.title, shape: raw.shape, paper: raw.paper, ribbon: raw.ribbon,
      greenery: false, nextId: raw.nextId, items: raw.items.map(({ uid, id }) => ({ uid, id })) };
  }
  function counts(design) {
    return design.items.reduce((out, item) => { out[item.id] = (out[item.id] || 0) + 1; return out; }, {});
  }
  function price(design) {
    const stems = design.items.reduce((sum, item) => sum + CAT[item.id].priceCents, 0);
    const mode = design.shape === 'gathered' ? 'classic' : design.shape;
    const preparation = design.items.length ? CONFIG.baseCents + CONFIG.laborCents[mode] : 0;
    const ribbon = design.items.length && design.ribbon !== 'none' ? CONFIG.extrasCents.ribbon : 0;
    return { stems, preparation, ribbon, total: stems + preparation + ribbon };
  }
  function add(design, id) {
    if (!IDS.includes(id) || design.items.length >= LIMIT || design.nextId >= 10000000) return false;
    design.items.push({ uid: 's' + design.nextId++, id }); return true;
  }
  function remove(design, uid) {
    const index = design.items.findIndex(item => item.uid === uid);
    if (index < 0) return false;
    design.items.splice(index, 1); return true;
  }
  function pack(design) {
    const clean = validate(design);
    if (!clean) throw new Error('Invalid 3D design');
    return { format: 'nebula-bouquet-3d', version: 1, design: clean };
  }
  function unpack(raw) { return raw?.format === 'nebula-bouquet-3d' && raw.version === 1 ? validate(raw.design) : null; }
  g.Nebula3DModel = { LIMIT, STORAGE_KEY, IDS, SHAPES, PAPERS, RIBBONS, PRESETS, create, validate, counts, price, add, remove, pack, unpack, clone };
})(typeof window !== 'undefined' ? window : globalThis);
