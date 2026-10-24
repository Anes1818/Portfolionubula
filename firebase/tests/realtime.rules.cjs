'use strict';
// Local emulator only. Never reads or writes the production database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:9019';
const ns = 'demo-nebula-review';
const now = Date.now();
function token(uid) {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return enc({ alg: 'none', typ: 'JWT' }) + '.' + enc({ sub: uid, user_id: uid, aud: ns, iss: 'https://securetoken.google.com/' + ns, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600, auth_time: Math.floor(now / 1000), firebase: { sign_in_provider: 'custom', identities: {} } }) + '.';
}
async function request(route, method = 'GET', body, identity) {
  const url = new URL(route + '.json', base); url.searchParams.set('ns', ns);
  const headers = { 'Content-Type': 'application/json' };
  if (identity === 'emulator-owner') headers.Authorization = 'Bearer owner';
  else if (identity) url.searchParams.set('auth', token(identity));
  const result = await fetch(url, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await result.text();
  return { status: result.status, text };
}
async function allowed(...args) { const r = await request(...args); assert.ok(r.status >= 200 && r.status < 300, JSON.stringify(r)); return r; }
async function denied(...args) { const r = await request(...args); assert.ok([401, 403].includes(r.status), JSON.stringify(r)); }
(async () => {
  const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '../realtime.rules.json'), 'utf8'));
  await allowed('/.settings/rules', 'PUT', rules, 'emulator-owner');
  await allowed('/', 'PUT', { adminUids: { owner: true } }, 'emulator-owner');
  const id = 'd'.repeat(22), setupId = 's'.repeat(22);
  const code = Buffer.from(JSON.stringify([7, 1, 11, [['rose_pink', 32]], {}])).toString('base64url');
  const design = { shopId: 'la-flor-eterna', code, purpose: 'share', createdAt: now, expiresAt: now + 7776000000 };
  await allowed('/nebula/la-flor-eterna/designs/' + id, 'PUT', design);
  await allowed('/nebula/la-flor-eterna/designs/' + id);
  await denied('/nebula/la-flor-eterna/designs');
  await denied('/nebula/la-flor-eterna/designs/' + id, 'PUT', { ...design, purpose: 'request' });
  await denied('/nebula/la-flor-eterna/designs/' + id, 'DELETE');
  const privateCode = Buffer.from(JSON.stringify({ email: 'private@example.invalid' })).toString('base64url');
  await denied('/nebula/la-flor-eterna/designs/' + setupId, 'PUT', { ...design, code: privateCode });
  // Historical private payloads are hidden without deleting them.
  await allowed('/nebula/la-flor-eterna/designs/' + setupId, 'PUT', { ...design, code: privateCode }, 'emulator-owner');
  await denied('/nebula/la-flor-eterna/designs/' + setupId);
  await allowed('/nebula/la-flor-eterna/designs/' + setupId, 'GET', undefined, 'owner');
  const setup = { id: setupId, code: privateCode, createdAt: now, expiresAt: now + 7776000000 };
  await allowed('/nebula/setups/' + setupId, 'PUT', setup);
  for (const route of ['/nebula', '/nebula/setups', '/nebula/setups/' + setupId]) {
    await denied(route); await denied(route, 'GET', undefined, 'stranger'); await allowed(route, 'GET', undefined, 'owner');
  }
  await denied('/nebula/setups/' + setupId, 'PUT', setup);
  await denied('/nebula/setups/' + setupId, 'DELETE');
  await denied('/adminUids/stranger', 'PUT', true, 'stranger');
  await denied('/adminUids/owner', 'GET', undefined, 'stranger');
  await allowed('/adminUids/owner', 'GET', undefined, 'owner');
  const lead = { source: 'demo', name: 'Fixture', contact: 'fixture@example.invalid', createdAt: now };
  await allowed('/nebula/leads/test-lead', 'PUT', lead);
  await denied('/nebula/leads'); await denied('/nebula/leads/test-lead');
  await denied('/nebula/leads/invalid', 'PUT', { ...lead, arbitrary: 'unvalidated field' });
  await allowed('/nebula/leads/test-lead', 'GET', undefined, 'owner');
  const req = { ...design, designId: id, customerName: 'Private fixture', requestedDate: '2099-01-01', method: 'Pickup', reference: 'TEST-ONLY', shortUrl: 'https://nebulastudio.site/b/#' + id, status: 'prepared' }; delete req.purpose;
  await allowed('/nebula/la-flor-eterna/requests/' + setupId, 'PUT', req);
  await denied('/nebula/la-flor-eterna/requests'); await denied('/nebula/la-flor-eterna/requests/' + setupId);
  await allowed('/nebula/la-flor-eterna/requests/' + setupId, 'GET', undefined, 'owner');
  console.log('PASS emulator: public bouquet retrieval; private leads, setups and requests; legacy payload protection; owner access; no role escalation, overwrite or deletion.');
})().catch(error => { console.error(error); process.exitCode = 1; });
