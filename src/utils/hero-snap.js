import { clamp } from './math.js';
import { getHeroTextSceneReadyProgress } from './hero-text-opacity.js';

/**
 * @param {number} value
 * @param {number[]} targets
 */
function nearest(value, targets) {
  return targets.reduce((best, point) =>
    Math.abs(point - value) < Math.abs(best - value) ? point : best,
  );
}

/**
 * Snap-цели для hero: не оставляем пользователя в середине transfer и в fade заголовков.
 *
 * @param {number} progress 0…1
 * @param {{ HERO_PROGRESS: { loop1End: number; transfer12End: number; loop2End: number; transfer23End: number }; HERO_TEXT_FADE_IN: number; HERO_TEXT_FADE_OUT: number }} config
 */
export function getHeroSnapTarget(progress, config) {
  const { HERO_PROGRESS, HERO_TEXT_FADE_IN, HERO_TEXT_FADE_OUT } = config;
  const { loop1End, transfer12End, loop2End, transfer23End } = HERO_PROGRESS;
  const { scene2: scene2Ready, scene3: scene3Ready } = getHeroTextSceneReadyProgress(config);
  const p = clamp(progress, 0, 1);

  if (p > loop1End && p < transfer12End) {
    return nearest(p, [loop1End, scene2Ready]);
  }

  if (p > loop2End && p < transfer23End) {
    return nearest(p, [loop2End, scene3Ready]);
  }

  if (p > loop1End - HERO_TEXT_FADE_OUT && p < loop1End) {
    return nearest(p, [Math.max(0, loop1End - HERO_TEXT_FADE_OUT), loop1End]);
  }

  if (p > loop2End - HERO_TEXT_FADE_OUT && p < loop2End) {
    return nearest(p, [scene2Ready, loop2End]);
  }

  if (p > loop2End && p < scene3Ready) {
    return nearest(p, [loop2End, scene3Ready]);
  }

  return p;
}

/**
 * @param {{ HERO_PROGRESS: { loop1End: number; transfer12End: number; loop2End: number; transfer23End: number }; HERO_TEXT_FADE_IN: number }} config
 */
export function buildHeroSnapPoints(config) {
  const { HERO_PROGRESS } = config;
  const { loop1End, loop2End } = HERO_PROGRESS;
  const { scene2: scene2Ready, scene3: scene3Ready } = getHeroTextSceneReadyProgress(config);

  return [0, loop1End, scene2Ready, loop2End, scene3Ready, 1];
}
