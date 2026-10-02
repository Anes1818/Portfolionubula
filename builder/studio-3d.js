(function () {
  'use strict';
  const M = window.Nebula3DModel, { CAT, CONFIG } = window.NebulaConfig;
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: CONFIG.currency }).format(cents / 100);
  const name = id => CAT[id].en.replace(' sprig', '');
  let design = M.create(), scene = null, selected = null, family = 'all', activePreset = 'blush';
  let history = [], future = [], toastTimer, ready = false, rotating = false, storageOK = true;
  try {
    const saved = localStorage.getItem(M.STORAGE_KEY);
    if (saved) { const restored = M.unpack(JSON.parse(saved)); if (restored) { design = restored; activePreset = null; } }
  } catch (_) { storageOK = false; }

  function toast(message) {
    $('toast3d').textContent = message;
    $('toast3d').hidden = false;
    $('toast3d').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast3d').classList.remove('visible'); $('toast3d').hidden = true; }, 3300);
  }
  function persist() {
    try { localStorage.setItem(M.STORAGE_KEY, JSON.stringify(M.pack(design))); storageOK = true; }
    catch (_) { storageOK = false; }
    $('saveStatus3d').textContent = storageOK ? 'Saved on this device' : 'Download your design to keep it';
  }
  function commit(change, message) {
    const before = M.clone(design);
    change();
    if (JSON.stringify(before) === JSON.stringify(design)) return;
    history.push(before); if (history.length > 40) history.shift();
    future = []; activePreset = null;
    if (!design.items.some(item => item.uid === selected)) selected = null;
    render(); persist(); if (message) toast(message);
  }
  function addStem(id) {
    if (design.items.length >= M.LIMIT) { toast('Your bouquet has 36 stems. Remove one to make room.'); return; }
    commit(() => M.add(design, id), name(id) + ' added');
  }
  function setSelection(uid) {
    selected = uid;
    const item = design.items.find(item => item.uid === uid);
    $('selection3d').hidden = !item;
    if (item) $('selectedName3d').textContent = name(item.id);
    scene?.setSelected(uid);
  }
  function renderCatalogue() {
    const counts = M.counts(design);
    const ids = M.IDS.filter(id => family === 'all' || CAT[id].family === family || (family === 'accents' && CAT[id].family === 'carnation'));
    const fragment = document.createDocumentFragment();
    for (const id of ids) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'flower-card'; button.dataset.flower = id;
      button.setAttribute('aria-label', 'Add ' + name(id));
      button.disabled = design.items.length >= M.LIMIT;
      const img = document.createElement('img'); img.className = 'flower-image';
      img.src = 'assets/heads/' + id + '.webp'; img.alt = ''; img.loading = 'lazy'; img.width = 76; img.height = 76;
      const label = document.createElement('span'); label.className = 'flower-name'; label.textContent = name(id);
      const price = document.createElement('span'); price.className = 'flower-price'; price.textContent = money(CAT[id].priceCents) + ' / stem';
      const plus = document.createElement('span'); plus.className = 'flower-add'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true');
      button.append(img, label, price, plus);
      if (counts[id]) { const qty = document.createElement('span'); qty.className = 'flower-quantity'; qty.textContent = counts[id]; qty.setAttribute('aria-label', counts[id] + ' in bouquet'); button.append(qty); }
      fragment.append(button);
    }
    $('flowerGrid3d').replaceChildren(fragment);
  }
  function renderStems() {
    const fragment = document.createDocumentFragment();
    for (const [id, quantity] of Object.entries(M.counts(design))) {
      const row = document.createElement('div'); row.className = 'stem-row';
      const label = document.createElement('span'); label.textContent = name(id);
      const controls = document.createElement('span'); controls.className = 'stem-stepper';
      const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.dataset.remove = id; minus.setAttribute('aria-label', 'Remove one ' + name(id));
      const count = document.createElement('span'); count.textContent = quantity;
      const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.dataset.add = id; plus.disabled = design.items.length >= M.LIMIT; plus.setAttribute('aria-label', 'Add one ' + name(id));
      controls.append(minus, count, plus); row.append(label, controls); fragment.append(row);
    }
    if (!design.items.length) { const p = document.createElement('p'); p.textContent = 'A fresh start. Add your first flower from Blooms.'; fragment.append(p); }
    const price = M.price(design), summary = document.createElement('p'); summary.className = 'price-detail';
    summary.textContent = 'Stems ' + money(price.stems) + ' · Preparation ' + money(price.preparation) + (price.ribbon ? ' · Ribbon ' + money(price.ribbon) : '');
    fragment.append(summary); $('stemList3d').replaceChildren(fragment);
  }
  function render() {
    const focused = document.activeElement;
    const focusKey = ['flower', 'add', 'remove'].find(key => focused?.dataset?.[key]);
    const focusValue = focusKey ? focused.dataset[focusKey] : null;
    scene?.setDesign(design);
    setSelection(selected);
    $('stemCount').textContent = design.items.length;
    $('total3d').textContent = money(M.price(design).total);
    $('estimateLabel').textContent = CONFIG.demo ? 'SAMPLE ESTIMATE · ' + CONFIG.currency : 'ESTIMATE · ' + CONFIG.currency;
    $('empty3d').hidden = !!design.items.length || !ready;
    $('undo3d').disabled = !history.length; $('redo3d').disabled = !future.length;
    $('clear3d').disabled = !design.items.length;
    $('saveImage3d').disabled = !ready || !design.items.length;
    $('dialogImage3d').disabled = !ready || !design.items.length;
    $('designTitle').value = design.title;
    for (const key of ['paper', 'ribbon', 'shape']) all('[data-' + key + ']').forEach(button => button.setAttribute('aria-pressed', String(button.dataset[key] === design[key])));
    all('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === activePreset)));
    renderCatalogue(); renderStems();
    if (focusKey) document.querySelector('[data-' + focusKey + '="' + focusValue + '"]')?.focus({ preventScroll: true });
  }
  $('flowerGrid3d').addEventListener('click', event => { const card = event.target.closest('[data-flower]'); if (card) addStem(card.dataset.flower); });
  $('stemList3d').addEventListener('click', event => {
    const plus = event.target.closest('[data-add]'), minus = event.target.closest('[data-remove]');
    if (plus) addStem(plus.dataset.add);
    if (minus) { const item = [...design.items].reverse().find(item => item.id === minus.dataset.remove); if (item) commit(() => M.remove(design, item.uid), name(item.id) + ' removed'); }
  });
  all('[data-family]').forEach(button => button.addEventListener('click', () => {
    family = button.dataset.family;
    all('[data-family]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    renderCatalogue();
  }));
  all('[data-preset]').forEach(button => button.addEventListener('click', () => {
    commit(() => { design = M.create(button.dataset.preset); selected = null; }, M.PRESETS[button.dataset.preset].title + ' is ready to make your own');
    activePreset = button.dataset.preset;
    all('[data-preset]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  for (const key of ['paper', 'ribbon', 'shape']) all('[data-' + key + ']').forEach(button => button.addEventListener('click', () => commit(() => { design[key] = button.dataset[key]; })));
  $('designTitle').addEventListener('change', () => { const title = $('designTitle').value.trim().slice(0, 70); commit(() => { design.title = title; }); });
  function switchTab(button) {
    all('[data-tab]').forEach(tab => {
      const active = button === tab;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      $('panel-' + tab.dataset.tab).hidden = !active;
    });
  }
  all('[data-tab]').forEach(button => {
    button.addEventListener('click', () => switchTab(button));
    button.addEventListener('keydown', event => {
      const tabs = all('[data-tab]'), index = tabs.indexOf(button);
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== null) { event.preventDefault(); switchTab(tabs[next]); tabs[next].focus(); }
    });
  });
  function undo(redo = false) {
    const source = redo ? future : history, destination = redo ? history : future;
    if (!source.length) return;
    destination.push(M.clone(design)); design = source.pop(); selected = null; activePreset = null;
    render(); persist(); toast(redo ? 'Change restored' : 'Change undone');
  }
  $('undo3d').addEventListener('click', () => undo()); $('redo3d').addEventListener('click', () => undo(true));
  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || document.querySelector('dialog[open]')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(event.shiftKey); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && document.activeElement === $('bouquet3d') && selected) { event.preventDefault(); removeSelected(); }
  });
  function removeSelected() { if (selected) commit(() => { M.remove(design, selected); selected = null; }, 'Stem removed'); }
  $('removeSelected3d').addEventListener('click', removeSelected);
  function stopRotation() { rotating = false; scene?.setAutoRotate(false); $('rotate3d').setAttribute('aria-pressed', 'false'); }
  all('[data-view]').forEach(button => button.addEventListener('click', () => {
    stopRotation(); scene?.setView(button.dataset.view);
    all('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  $('zoomIn3d').addEventListener('click', () => scene?.zoom(1));
  $('zoomOut3d').addEventListener('click', () => scene?.zoom(-1));
  $('resetView3d').addEventListener('click', () => { stopRotation(); scene?.resetView(); all('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === 'perspective'))); });
  $('rotate3d').addEventListener('click', () => { rotating = !rotating; scene?.setAutoRotate(rotating); $('rotate3d').setAttribute('aria-pressed', String(rotating)); });
  $('bouquet3d').addEventListener('pointerdown', () => { stopRotation(); all('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false')); });

  $('clear3d').addEventListener('click', () => $('clearDialog3d').showModal());
  $('cancelClear3d').addEventListener('click', () => $('clearDialog3d').close());
  $('confirmClear3d').addEventListener('click', () => { commit(() => { design.items = []; selected = null; }, 'A fresh canvas, just for you'); $('clearDialog3d').close(); });
  $('saveDesign').addEventListener('click', () => $('saveDialog3d').showModal());
  $('closeSave3d').addEventListener('click', () => $('saveDialog3d').close());
  all('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));
  const filename = () => (design.title || 'my-bouquet').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-bouquet';
  function download(blob, file) {
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = file; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $('exportDesign3d').addEventListener('click', () => { download(new Blob([JSON.stringify(M.pack(design), null, 2)], { type: 'application/json' }), filename() + '-3d.json'); toast('Editable design downloaded'); });
  $('importDesign3d').addEventListener('click', () => $('importFile3d').click());
  $('importFile3d').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 200000) throw new Error('size');
      const loaded = M.unpack(JSON.parse(await file.text())); if (!loaded) throw new Error('format');
      commit(() => { design = loaded; selected = null; }, 'Your 3D design is ready'); $('saveDialog3d').close();
    } catch (_) { toast('Choose a valid Nebula 3D design (.json), up to 36 stems.'); }
  });
  async function saveImage() {
    if (!ready || !design.items.length) return;
    try {
      const image = new Image(); image.src = scene.capture(); await image.decode();
      const output = document.createElement('canvas'); output.width = 1600; output.height = 1600;
      const ctx = output.getContext('2d'); ctx.fillStyle = '#f4f1e9'; ctx.fillRect(0, 0, 1600, 1600);
      const scale = Math.min(1460 / image.width, 1270 / image.height), w = image.width * scale, h = image.height * scale;
      ctx.drawImage(image, (1600 - w) / 2, 125 + (1270 - h) / 2, w, h);
      ctx.fillStyle = '#344c3d'; ctx.font = '52px Georgia'; ctx.fillText(CONFIG.brand, 72, 94);
      ctx.font = '18px Arial'; ctx.textAlign = 'right'; ctx.fillText('THE 3D BOUQUET STUDIO', 1528, 88);
      ctx.textAlign = 'left'; ctx.font = '46px Georgia'; ctx.fillText(design.title || 'Your bouquet, your way.', 72, 1460, 1050);
      ctx.font = '21px Arial'; ctx.fillStyle = '#637066'; ctx.fillText('3D color & shape study · ' + design.items.length + ' stems', 72, 1510);
      ctx.textAlign = 'right'; ctx.fillText((CONFIG.demo ? 'Sample estimate ' : 'Estimate ') + money(M.price(design).total), 1528, 1460);
      ctx.font = '18px Arial'; ctx.fillText('Your florist confirms availability and final price.', 1528, 1510);
      const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png')); if (!blob) throw new Error('export');
      download(blob, filename() + '-3d.png'); toast('Your bouquet picture is downloaded');
    } catch (_) { toast('The picture could not be saved. Try again, or save the editable design.'); }
  }
  $('saveImage3d').addEventListener('click', saveImage); $('dialogImage3d').addEventListener('click', saveImage);
  function showFallback() {
    ready = false; $('loading3d').hidden = true; $('fallback3d').hidden = false;
    $('empty3d').hidden = true;
    all('[data-view], #zoomIn3d, #zoomOut3d, #resetView3d, #rotate3d, #saveImage3d, #dialogImage3d').forEach(button => { button.disabled = true; });
  }
  try {
    scene = new window.Nebula3DScene({ canvas: $('bouquet3d'), onSelect: setSelection,
      onReady: () => { ready = true; $('loading3d').hidden = true; }, onError: showFallback });
  } catch (_) { showFallback(); }
  render(); persist();
  window.addEventListener('pagehide', event => { if (event.persisted) stopRotation(); else scene?.dispose(); });
  // Read-only snapshots for integrations and diagnostics; all edits go through the UI.
  window.Nebula3DStudio = { getDesign: () => M.clone(design), getPrice: () => M.price(design) };
})();
