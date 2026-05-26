import { join } from 'node:path';
import { buildHeroSpritesTree } from './lib/build-hero-sprites-lib.mjs';

const HERO_DIR = join(import.meta.dirname, '..', 'public', 'hero');

const built = await buildHeroSpritesTree(HERO_DIR);
console.log(`Hero sprites: ${built} sequences`);
