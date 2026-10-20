import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync(new URL('../docs/demos/manifest.json', import.meta.url), 'utf8'));
for (const clip of manifest.clips) {
  test(`recorded browser GIF is intact, looping and correctly labeled: ${clip.id}`, () => {
    const bytes = readFileSync(new URL(`../docs/demos/${clip.file}`, import.meta.url));
    assert.match(manifest.method, /Chrome Web/);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), clip.sha256);
    assert.match(bytes.subarray(0, 6).toString('ascii'), /^GIF8[79]a$/);
    assert.equal(bytes.readUInt16LE(6), 402);
    assert.equal(bytes.readUInt16LE(8), 874);
    assert.ok(bytes.includes(Buffer.from('NETSCAPE2.0')));
    assert.ok(clip.frames >= 30 && clip.durationMs >= 9000);
    assert.ok(clip.bytes < 10 * 1024 * 1024);
    assert.equal(clip.before.tripCount, 5);
    assert.equal(clip.after.mapReady, 'true');
    assert.deepEqual(clip.pageErrors, []);
  });
}
