/**
 * Сборка и публикация на ветку gh-pages (force push, только dist + спрайты).
 */
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const dist = join(root, 'dist');
const stage = join(root, '.gh-pages-stage');

const FRAME_FILE = /\/(hero-1|hero-2|transfer-1-2|transfer-2-3)-\d+\.webp$/;

async function pruneHeroFrames(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await pruneHeroFrames(path);
        return;
      }
      if (FRAME_FILE.test(path.replace(/\\/g, '/'))) {
        await rm(path);
      }
    }),
  );
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

console.log('Building…');
run('npm', ['run', 'build'], { env: { BASE_PATH: '/zabota/' } });

console.log('Staging dist (without per-frame hero webp)…');
for (const name of await readdir(dist)) {
  await cp(join(dist, name), join(stage, name), { recursive: true });
}
await pruneHeroFrames(join(stage, 'hero'));
await writeFile(join(stage, '.nojekyll'), '');

const remoteUrl =
  process.env.GH_PAGES_REMOTE ??
  spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).stdout.trim();

console.log('Force push to gh-pages…');
const gitEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
};
run('git', ['init', '-b', 'gh-pages'], { cwd: stage, env: gitEnv });
run('git', ['remote', 'add', 'origin', remoteUrl], { cwd: stage, env: gitEnv });
run('git', ['add', '-A'], { cwd: stage, env: gitEnv });
run('git', ['commit', '-m', 'Deploy: sprites only'], { cwd: stage, env: gitEnv });
run('git', ['-c', 'credential.helper=!gh auth git-credential', 'push', '-f', 'origin', 'HEAD:gh-pages'], {
  cwd: stage,
  env: gitEnv,
});

await rm(stage, { recursive: true, force: true });
console.log('Done: https://paymushkin.github.io/zabota/');
