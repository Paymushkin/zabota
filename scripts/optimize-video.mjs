/**
 * Сжимает tv-video.mp4 для веба (faststart, ~1280px, без аудио).
 * Исходник: /tv-video.mp4 в корне проекта.
 */
import { access, mkdir, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const input = join(root, 'tv-video.mp4');
const backupDir = join(root, 'old', 'video');
const backup = join(backupDir, 'tv-video.source.mp4');
const out = join(root, 'public', 'video', 'tv-video.mp4');
const temp = join(root, 'public', 'video', 'tv-video.opt.mp4');

try {
  await access(input);
} catch {
  console.error('Missing source video:', input);
  process.exit(1);
}

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

await mkdir(backupDir, { recursive: true });

try {
  await access(out);
  await rename(out, backup);
} catch {
  // Первый прогон — предыдущего public/video/tv-video.mp4 нет.
}

await rename(temp, out);
console.log('Optimized:', out);
