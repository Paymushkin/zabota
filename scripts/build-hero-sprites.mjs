import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const HERO_DIR = join(ROOT, 'public', 'hero');
const MAX_SHEET_DIM = 16384;
const SHEET_COLS = 12;
const SHEET_FRAME_WIDTH = 960;
const SHEET_WEBP = { quality: 78, effort: 4 };

/**
 * @param {string} dir
 */
async function buildSequenceSprite(dir) {
  const files = (await readdir(dir))
    .filter((f) => /^.+\-\d+\.webp$/i.test(f) && f !== 'sheet.webp')
    .sort((a, b) => {
      const na = Number(a.match(/(\d+)\.webp$/i)?.[1] ?? 0);
      const nb = Number(b.match(/(\d+)\.webp$/i)?.[1] ?? 0);
      return na - nb;
    });

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
  console.log(`  ${dir.split('/').pop()}: ${count} frames → sheet.webp (${sheetWidth}x${sheetHeight}, ${(stat / 1024 / 1024).toFixed(2)} MB)`);

  return manifest;
}

async function build() {
  const entries = await readdir(HERO_DIR, { withFileTypes: true });
  let built = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(HERO_DIR, entry.name);
    const result = await buildSequenceSprite(dir);
    if (result) {
      built += 1;
    }
  }

  console.log(`Hero sprites: ${built} sequences`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
