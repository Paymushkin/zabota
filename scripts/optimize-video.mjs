/**
 * Сжимает tv-video.mp4 для веба (faststart, ~1280px, без аудио).
 * Исходник: /tv-video.mp4 → old/video/tv-video.source.mp4 → public/video/tv-video.mp4
 */
import { access, copyFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(import.meta.dirname, '..');
const rootSrc = join(ROOT, 'tv-video.mp4');
const out = join(ROOT, 'public', 'video', 'tv-video.mp4');
const backup = join(ROOT, 'old', 'video', 'tv-video.source.mp4');
const temp = join(ROOT, 'public', 'video', 'tv-video.opt.mp4');

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function pickInput() {
  if (await pathExists(rootSrc)) {
    return { path: rootSrc, fromRoot: true };
  }
  if (await pathExists(backup)) {
    return { path: backup, fromRoot: false };
  }
  if (await pathExists(out)) {
    return { path: out, fromRoot: false, fromOut: true };
  }
  throw new Error('No tv-video source: add tv-video.mp4 to project root');
}

async function archiveSource({ path, fromRoot, fromOut }) {
  await mkdir(join(ROOT, 'old', 'video'), { recursive: true });

  if (fromRoot) {
    await copyFile(path, backup);
    return;
  }

  if (fromOut) {
    await rename(path, backup);
  }
}

const input = await pickInput();

await mkdir(join(ROOT, 'public', 'video'), { recursive: true });

const result = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    input.path,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '28',
    '-vf',
    // limited (tv) → full (pc): на Windows иначе «чёрный» фон видео сереет относительно #000
    "scale='min(1280,iw)':-2:in_range=auto:out_range=pc,format=yuv420p",
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-color_range',
    'pc',
    '-movflags',
    '+faststart',
    temp,
  ],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await archiveSource(input);
await rename(temp, out);
console.log('Optimized:', out);
