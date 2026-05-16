import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const SRC_DIR = join(ROOT, 'img');
const OUT_DIR = join(ROOT, 'public', 'img');
const FONTS_OUT = join(ROOT, 'public', 'fonts');

/** Только ассеты, используемые в вёрстке */
const VARIANTS = {
  'hero.png': [
    { suffix: '', width: 1376, quality: 85 },
    { suffix: '@2x', width: 2752, quality: 80 },
    { suffix: '-mobile', width: 768, quality: 82 },
  ],
  'image-2.png': [{ suffix: '', width: 1376, quality: 85 }],
  'image-3.png': [{ suffix: '', width: 1376, quality: 85 }],
  'figure-1.png': [{ suffix: '', width: 161, quality: 90 }],
  'figure-2.png': [{ suffix: '', width: 156, quality: 90 }],
  'number-1.png': [{ suffix: '', width: 102, quality: 90 }],
  'number-2.png': [{ suffix: '', width: 102, quality: 90 }],
  'number-3.png': [{ suffix: '', width: 102, quality: 90 }],
};

async function copyFonts() {
  await mkdir(FONTS_OUT, { recursive: true });
  const fonts = await readdir(join(ROOT, 'fonts'));
  await Promise.all(
    fonts
      .filter((f) => f.endsWith('.woff2'))
      .map((f) => copyFile(join(ROOT, 'fonts', f), join(FONTS_OUT, f))),
  );
}

async function optimize() {
  await mkdir(OUT_DIR, { recursive: true });
  await copyFile(join(SRC_DIR, 'logo.svg'), join(OUT_DIR, 'logo.svg'));
  await copyFonts();

  const files = await readdir(SRC_DIR);

  for (const file of files) {
    if (!file.endsWith('.png')) continue;

    const variants = VARIANTS[file];
    if (!variants) continue;

    const input = join(SRC_DIR, file);
    const { name } = parse(file);

    for (const { suffix, width, quality } of variants) {
      const outName = `${name}${suffix}.webp`;
      await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toFile(join(OUT_DIR, outName));
    }
  }

  console.log('Assets prepared in public/');
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
