import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const MAX_SHEET_DIM = 16384;
export const SHEET_COLS = 12;
export const SHEET_FRAME_WIDTH = 800;
export const SHEET_WEBP = { quality: 72, effort: 4 };
export const POSTER_WIDTH = 960;
export const POSTER_WEBP = { quality: 76, effort: 4 };

/**
 * @param {string} dir
 * @param {{ frameStep?: number; withPoster?: boolean }} [options]
 */
export async function buildSequenceSprite(dir, options = {}) {
  const { frameStep = 1, withPoster = false } = options;
  let files = (await readdir(dir))
    .filter((f) => /^.+\-\d+\.webp$/i.test(f) && f !== 'sheet.webp')
    .sort((a, b) => {
      const na = Number(a.match(/(\d+)\.webp$/i)?.[1] ?? 0);
      const nb = Number(b.match(/(\d+)\.webp$/i)?.[1] ?? 0);
      return na - nb;
    });

  if (frameStep > 1) {
    files = files.filter((_, index) => index % frameStep === 0);
  }

  if (files.length === 0) {
    return null;
  }

  const first = sharp(join(dir, files[0]));
  const sourceMeta = await first.metadata();
  const sourceWidth = sourceMeta.width ?? SHEET_FRAME_WIDTH;
  const sourceHeight = sourceMeta.height ?? Math.round((SHEET_FRAME_WIDTH * 9) / 16);
  const frameWidth = SHEET_FRAME_WIDTH;
  const frameHeight = Math.max(1, Math.round((frameWidth * sourceHeight) / sourceWidth));
  const count = files.length;
  const cols = Math.min(SHEET_COLS, count, Math.floor(MAX_SHEET_DIM / frameWidth));
  const rows = Math.ceil(count / cols);
  const sheetWidth = frameWidth * cols;
  const sheetHeight = frameHeight * rows;

  if (sheetWidth > MAX_SHEET_DIM || sheetHeight > MAX_SHEET_DIM) {
    throw new Error(`Sheet too large for ${dir}: ${sheetWidth}x${sheetHeight}`);
  }

  const composites = await Promise.all(
    files.map(async (file, index) => {
      const buffer = await sharp(join(dir, file))
        .resize({ width: frameWidth, withoutEnlargement: true })
        .toBuffer();
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        input: buffer,
        left: col * frameWidth,
        top: row * frameHeight,
      };
    }),
  );

  const sheetPath = join(dir, 'sheet.webp');
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp(SHEET_WEBP)
    .toFile(sheetPath);

  const manifest = {
    cols,
    rows,
    frameWidth,
    frameHeight,
    count,
  };

  await writeFile(join(dir, 'sheet.json'), `${JSON.stringify(manifest)}\n`);

  const stat = await readFile(sheetPath).then((b) => b.length);
  const label = dir.split('/').pop();
  const stepNote = frameStep > 1 ? `, 1/${frameStep} frames` : '';
  console.log(
    `  ${label}: ${count} frames → sheet.webp (${sheetWidth}x${sheetHeight}, ${(stat / 1024 / 1024).toFixed(2)} MB${stepNote})`,
  );

  if (withPoster) {
    const posterPath = join(dir, 'poster.webp');
    await sharp(join(dir, files[0]))
      .resize({ width: POSTER_WIDTH, withoutEnlargement: true })
      .webp(POSTER_WEBP)
      .toFile(posterPath);
    const posterStat = await readFile(posterPath).then((b) => b.length);
    console.log(`  ${label}: poster.webp (${(posterStat / 1024).toFixed(0)} KB)`);
  }

  return manifest;
}

/**
 * @param {string} heroRoot
 * @param {{ decimateLoopDirs?: Set<string> }} [options]
 */
export async function buildHeroSpritesTree(heroRoot, options = {}) {
  const { decimateLoopDirs = new Set() } = options;
  const entries = await readdir(heroRoot, { withFileTypes: true });
  let built = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dir = join(heroRoot, entry.name);
    const frameStep = decimateLoopDirs.has(entry.name) ? 2 : 1;
    const result = await buildSequenceSprite(dir, {
      frameStep,
      withPoster: entry.name === 'hero-1',
    });

    if (result) {
      built += 1;
    }
  }

  return built;
}
