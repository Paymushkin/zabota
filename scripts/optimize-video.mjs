/**
 * Сжимает public/video/tv-video.mp4 для веба (faststart, ~1280px, без аудио).
 * Исходник: tv-video.source.mp4 или текущий tv-video.mp4
 */
import { access, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..');
const out = join(root, 'public', 'video', 'tv-video.mp4');
const backup = join(root, 'old', 'video', 'tv-video.source.mp4');
const temp = join(root, 'public', 'video', 'tv-video.opt.mp4');

async function pickInput() {
  try {
    await access(backup);
    return backup;
  } catch {
    return out;
  }
}

const input = await pickInput();

const result = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    input,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '28',
    '-vf',
    "scale='min(1280,iw)':-2",
    '-movflags',
    '+faststart',
    temp,
  ],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (input === out) {
  await rename(out, backup);
}

await rename(temp, out);
console.log('Optimized:', out);
