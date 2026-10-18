// Inspection thumbnails only. Original Simulator PNGs remain untouched.
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root = process.argv[2];
if (!root) throw new Error('Pass downloaded capture artifact directory');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const items = manifest.pages.filter(item => item.status === 'captured');
const output = path.join(root, 'inspection');
await mkdir(output, { recursive: true });
for (let offset = 0; offset < items.length; offset += 8) {
  const layers = [];
  const group = items.slice(offset, offset + 8);
  for (const [i, item] of group.entries()) {
    const x = (i % 4) * 222, y = Math.floor(i / 4) * 510;
    layers.push({ input: await sharp(path.join(root, item.file)).resize(218, 474, { fit: 'contain', background: '#777' }).toBuffer(), left: x, top: y + 30 });
    layers.push({ input: Buffer.from(`<svg width="220" height="28"><rect width="220" height="28" fill="white"/><text x="4" y="18" font-family="Arial" font-size="11">${item.key} ${item.theme}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: 888, height: Math.ceil(group.length / 4) * 510, channels: 3, background: '#777' } }).composite(layers).png().toFile(path.join(output, `contact-${offset / 8 + 1}.png`));
}
console.log(`${items.length} originals indexed in ${output}`);
