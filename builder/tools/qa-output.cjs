/* Generated review material stays outside client sources and public builds. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../.private/qa');

function directory(...parts) {
  if (!parts.every(part => /^[a-z0-9-]+$/.test(part))) {
    throw new Error('Invalid QA output directory');
  }
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid QA output path');
  fs.mkdirSync(target, {recursive: true});
  return target;
}

function prepareLaFlor() {
  for (const part of ['', 'next-phase', 'celebration', 'crimson', 'wrap-fit']) {
    directory('la-flor-eterna', ...(part ? [part] : []));
  }
}

module.exports = {directory, prepareLaFlor};
