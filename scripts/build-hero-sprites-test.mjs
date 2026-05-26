/**
 * Спрайты для test.html: loop1/loop2 — каждый 2-й кадр, transfer — полностью.
 * Читает кадры из public/hero/*, пишет в public/hero-test/*.
 */
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildSequenceSprite } from './lib/build-hero-sprites-lib.mjs';

const ROOT = join(import.meta.dirname, '..');
const SOURCE_ROOT = join(ROOT, 'public', 'hero');
const OUT_ROOT = join(ROOT, 'public', 'hero-test');
const DECIMATE_DIRS = new Set(['hero-1', 'hero-2']);

async function copySourceFrames(seqName) {
  const srcDir = join(SOURCE_ROOT, seqName);
  const outDir = join(OUT_ROOT, seqName);
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(srcDir)).filter((f) => /^.+\-\d+\.webp$/i.test(f));
  await Promise.all(files.map((file) => cp(join(srcDir, file), join(outDir, file))));
}

const sequences = (await readdir(SOURCE_ROOT, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

await rm(OUT_ROOT, { recursive: true, force: true });
await mkdir(OUT_ROOT, { recursive: true });

console.log('Copy frames → hero-test/');
for (const seq of sequences) {
  await copySourceFrames(seq);
}

console.log('Build sprites (loop 1/2 — every 2nd frame):');
let built = 0;

for (const seq of sequences) {
  const dir = join(OUT_ROOT, seq);
  const frameStep = DECIMATE_DIRS.has(seq) ? 2 : 1;
  const result = await buildSequenceSprite(dir, {
    frameStep,
    withPoster: seq === 'hero-1',
  });
  if (result) {
    built += 1;
  }
}

console.log(`Hero-test sprites: ${built} sequences`);

console.log('Remove per-frame copies (keep sheet + poster only):');
for (const seq of sequences) {
  const dir = join(OUT_ROOT, seq);
  const files = await readdir(dir);
  await Promise.all(
    files
      .filter((f) => /^.+\-\d+\.webp$/i.test(f))
      .map((f) => rm(join(dir, f))),
  );
}
