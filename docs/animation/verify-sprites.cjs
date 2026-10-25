/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node asset tooling. */
// Checks the shipped character sprites against the two manifests.
// Usage: node docs/animation/verify-sprites.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let sharp;
try { sharp = require('sharp'); }
catch { console.error('sharp is required (installed with Next.js). Run npm install first.'); process.exit(1); }

const root = path.resolve(__dirname, '../..');
const motions = require(path.join(root, 'src/lib/phaser/data/movementAnimations.json'));
const poses = require(path.join(root, 'src/lib/phaser/data/staticPoses.json'));
const MAX_TEXTURE = 4096; // common mobile WebGL limit
const SAFE_BORDER = 3; // transparent pixels kept around every frame

const columnsFor = frames => (frames <= 4 ? frames : Math.ceil(frames / 2));
const frameRect = (m, i) => ({ left: (i % m.columns) * m.frameWidth, top: Math.floor(i / m.columns) * m.frameHeight,
  width: m.frameWidth, height: m.frameHeight });

async function main() {
  assert.equal(new Set(motions.map(m => m.textureKey)).size, motions.length, 'unique motion keys');
  assert.equal(new Set(poses.map(p => p.textureKey)).size, poses.length, 'unique pose keys');
  const byKey = new Map(motions.map(m => [m.textureKey, m]));
  let frames = 0;

  for (const m of motions) {
    const file = path.join(root, 'public', m.path);
    assert(fs.existsSync(file), `${m.textureKey}: missing ${m.path}`);
    assert.equal(m.columns, columnsFor(m.frames), `${m.textureKey}: columns`);
    assert(Number.isInteger(m.restFrame) && m.restFrame >= 0 && m.restFrame < m.frames, `${m.textureKey}: restFrame`);
    assert.equal(m.frameWidth, m.referenceWidth + m.paddingX * 2, `${m.textureKey}: symmetric horizontal padding`);
    assert.equal(m.frameHeight, m.referenceHeight + m.paddingY * 2, `${m.textureKey}: symmetric vertical padding`);
    const meta = await sharp(file).metadata();
    assert.equal(meta.width, m.frameWidth * m.columns, `${m.textureKey}: sheet width`);
    assert.equal(meta.height, m.frameHeight * Math.ceil(m.frames / m.columns), `${m.textureKey}: sheet height`);
    assert(meta.width <= MAX_TEXTURE && meta.height <= MAX_TEXTURE, `${m.textureKey}: exceeds ${MAX_TEXTURE}px`);

    const hashes = new Set();
    for (let i = 0; i < m.frames; i++) {
      const raw = await sharp(file).extract(frameRect(m, i)).ensureAlpha().raw().toBuffer();
      let visible = 0;
      for (let y = 0; y < m.frameHeight; y++) for (let x = 0; x < m.frameWidth; x++) {
        const alpha = raw[(y * m.frameWidth + x) * 4 + 3];
        if (alpha > 32) visible++;
        const edge = x < SAFE_BORDER || y < SAFE_BORDER || x >= m.frameWidth - SAFE_BORDER || y >= m.frameHeight - SAFE_BORDER;
        assert(!(edge && alpha !== 0), `${m.textureKey}: frame ${i} touches the frame boundary`);
      }
      assert(visible > 0, `${m.textureKey}: frame ${i} is empty`);
      hashes.add(crypto.createHash('sha256').update(raw).digest('hex'));
    }
    assert.equal(hashes.size, m.frames, `${m.textureKey}: duplicate frames`);
    frames += m.frames;
  }

  for (const p of poses) {
    const m = byKey.get(p.motion);
    assert(m, `${p.textureKey}: unknown motion ${p.motion}`);
    for (const k of ['frameWidth', 'frameHeight', 'referenceWidth', 'referenceHeight', 'paddingX', 'paddingY']) {
      assert.equal(p[k], m[k], `${p.textureKey}: ${k} differs from ${p.motion}`);
    }
    if ('frame' in p) {
      // Rest pose served from the movement sheet; no separate image.
      assert.equal(p.path, m.path, `${p.textureKey}: rest pose must point at its sheet`);
      assert.equal(p.frame, m.restFrame, `${p.textureKey}: rest frame index`);
    } else {
      const file = path.join(root, 'public', p.path);
      assert(fs.existsSync(file), `${p.textureKey}: missing ${p.path}`);
      const meta = await sharp(file).metadata();
      assert.deepEqual([meta.width, meta.height], [p.frameWidth, p.frameHeight], `${p.textureKey}: canvas size`);
    }
  }

  console.log(JSON.stringify({ motions: motions.length, frames, poses: poses.length,
    standalonePoses: poses.filter(p => !('frame' in p)).length }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
