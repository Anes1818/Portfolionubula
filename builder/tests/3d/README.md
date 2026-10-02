# 3D studio verification

From the repository root:

```powershell
node --test builder/tests/3d/model.test.cjs
node --check builder/studio-3d-scene.js
node --check builder/studio-3d.js
```

Browser checks require Playwright and Chromium/Edge. If Playwright is supplied
outside this repo, set `NODE_PATH` to its `node_modules` directory. Start a static
server from the repository root on port 8765, then run:

```powershell
node builder/tests/3d/browser.test.cjs
```

Pass another URL as the first argument, or set `BROWSER_PATH` for another browser
executable. The default browser is the standard Windows Edge installation.
The test uses software WebGL to avoid depending on a machine's GPU.

The model suite checks exact sample estimates, shop overrides, empty designs,
stem limits and identities, rejected imports, schema-only exports and isolation
between snapshots. The browser suite checks desktop and 390px phone rendering,
drag/keyboard/automatic rotation, camera views/zoom, raycast selection/deletion,
catalogue filtering and edits, undo/redo, shapes and finishes, reload persistence,
photo-studio storage isolation, PNG/JSON downloads, JSON import rejection,
capacity, direct file opening, WebGL fallback and the original studio's phone
layout. Screenshots and exported PNGs are generated under ignored `artifacts/`.

Verified locally in Edge/Chromium with emulated phone dimensions on 2026-10-01.
Physical phone hardware and Safari have not been checked.
