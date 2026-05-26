import { access, copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const PUBLIC_ROOT = join(ROOT, 'public');
const SRC_DIR = join(ROOT, 'img');
const OUT_DIR = join(ROOT, 'public', 'img');
const FONTS_OUT = join(ROOT, 'public', 'fonts');
const HERO_DIR = join(ROOT, 'public', 'hero');

/** PNG из img/ → public/img/*.webp */
const SRC_VARIANTS = {
  'step-1.png': { width: 1160, quality: 88 },
  'step-2.png': { width: 1160, quality: 88 },
  'step-3.png': { width: 1160, quality: 88 },
};

/** PNG из img/ → public/hero/*.webp */
const HERO_STATIC_VARIANTS = {
  'hero-bg.png': { width: 1920, quality: 82 },
};

/** PNG уже в public/img → webp, исходник удаляется */
const PUBLIC_VARIANTS = {
  'ball.png': { width: 624, quality: 90 },
  'fig-1.png': { width: 390, quality: 90 },
  'fig-2.png': { width: 390, quality: 90 },
  'tv-1.png': { width: 1358, quality: 85 },
  'tv-2.png': { width: 1358, quality: 85 },
};

const HERO_WEBP = { quality: 82, effort: 4 };

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Корень проекта: favicon.png → public/favicon.png (для <link rel="icon">) */
async function optimizeFavicon() {
  const input = join(ROOT, 'favicon.png');
  if (!(await pathExists(input))) {
    return;
  }

  await mkdir(PUBLIC_ROOT, { recursive: true });
  const output = join(PUBLIC_ROOT, 'favicon.png');
  await sharp(input)
    .resize({
      width: 192,
      height: 192,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log('  favicon.png → public/');
}

async function copyFonts() {
  const srcFontsDir = join(ROOT, 'fonts');
  if (!(await pathExists(srcFontsDir))) {
    if (await pathExists(FONTS_OUT)) {
      console.log('  fonts: using committed public/fonts');
      return;
    }
    throw new Error('Fonts missing: add /fonts locally or commit public/fonts');
  }

  await mkdir(FONTS_OUT, { recursive: true });
  const fonts = await readdir(srcFontsDir);
  await Promise.all(
    fonts
      .filter((f) => f.endsWith('.woff2'))
      .map((f) => copyFile(join(srcFontsDir, f), join(FONTS_OUT, f))),
  );
}

/**
 * @param {string} input
 * @param {string} output
 * @param {{ width?: number; quality: number }} opts
 */
async function pngToWebp(input, output, { width, quality }) {
  let pipeline = sharp(input);
  if (width) {
    pipeline = pipeline.resize({ width, withoutEnlargement: true });
  }
  await pipeline.webp({ quality, effort: 6 }).toFile(output);
}

/**
 * @param {string} file
 * @param {{ width?: number; quality: number }} opts
 */
async function convertNamedPng(file, opts) {
  const input = join(SRC_DIR, file);
  const { name } = parse(file);
  const output = join(OUT_DIR, `${name}.webp`);
  await pngToWebp(input, output, opts);
  console.log(`  ${name}.webp`);
}

/**
 * @param {string} file
 * @param {{ width?: number; quality: number }} opts
 */
async function convertPublicPng(file, opts) {
  const input = join(OUT_DIR, file);
  try {
    await stat(input);
  } catch {
    return;
  }
  const { name } = parse(file);
  const output = join(OUT_DIR, `${name}.webp`);
  await pngToWebp(input, output, opts);
  await unlink(input);
  console.log(`  ${name}.webp (from public)`);
}

async function optimizeStatic() {
  await mkdir(OUT_DIR, { recursive: true });

  if (await pathExists(SRC_DIR)) {
    const logoSrc = join(SRC_DIR, 'logo.svg');
    if (await pathExists(logoSrc)) {
      await copyFile(logoSrc, join(OUT_DIR, 'logo.svg'));
    }

    const srcFiles = await readdir(SRC_DIR);
    for (const file of srcFiles) {
      if (!file.endsWith('.png')) continue;
      const opts = SRC_VARIANTS[file];
      if (!opts) continue;
      await convertNamedPng(file, opts);
    }
  }

  for (const [file, opts] of Object.entries(PUBLIC_VARIANTS)) {
    await convertPublicPng(file, opts);
  }
}

async function optimizeHeroStatic() {
  let converted = 0;

  for (const [file, opts] of Object.entries(HERO_STATIC_VARIANTS)) {
    const input = join(SRC_DIR, file);
    if (!(await pathExists(input))) {
      continue;
    }

    const { name } = parse(file);
    const output = join(HERO_DIR, `${name}.webp`);
    await pngToWebp(input, output, opts);
    console.log(`  ${name}.webp → public/hero/`);
    converted += 1;
  }

  if (converted > 0) {
    console.log(`Hero static: ${converted} image(s) → webp`);
  }
}

async function optimizeHeroFrames() {
  const sequences = await readdir(HERO_DIR, { withFileTypes: true });
  let converted = 0;

  for (const entry of sequences) {
    if (!entry.isDirectory()) continue;

    const dir = join(HERO_DIR, entry.name);
    const frames = (await readdir(dir)).filter((f) => f.endsWith('.jpg'));

    for (const file of frames) {
      const input = join(dir, file);
      const output = join(dir, file.replace(/\.jpg$/i, '.webp'));
      await sharp(input).webp(HERO_WEBP).toFile(output);
      await unlink(input);
      converted += 1;
    }

    if (frames.length > 0) {
      console.log(`  ${entry.name}: ${frames.length} frames`);
    }
  }

  console.log(`Hero: ${converted} frames → webp`);
}

async function optimize() {
  await copyFonts();
  console.log('Favicon:');
  await optimizeFavicon();
  console.log('Static images:');
  await optimizeStatic();
  console.log('Hero static:');
  await optimizeHeroStatic();
  console.log('Hero sequences:');
  await optimizeHeroFrames();
  console.log('Done.');
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
