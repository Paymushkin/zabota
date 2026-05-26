import { clamp } from './math.js';

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
  const p = clamp(progress, 0, 1);

  const scene2Ready = transfer12End + HERO_TEXT_FADE_IN;
  const scene3Ready = transfer23End + HERO_TEXT_FADE_IN;

  if (p > loop1End && p < transfer12End) {
    return nearest(p, [loop1End, scene2Ready]);
  }

  if (p > loop2End && p < transfer23End) {
    return nearest(p, [loop2End, scene3Ready]);
  }

  if (p > loop1End - HERO_TEXT_FADE_OUT && p < loop1End) {
    return nearest(p, [Math.max(0, loop1End - HERO_TEXT_FADE_OUT), loop1End]);
  }

  if (p > transfer12End && p < scene2Ready) {
    return nearest(p, [transfer12End, scene2Ready]);
  }

  if (p > loop2End - HERO_TEXT_FADE_OUT && p < loop2End) {
    return nearest(p, [scene2Ready, loop2End]);
  }

  if (p > transfer23End && p < scene3Ready) {
    return nearest(p, [transfer23End, scene3Ready]);
  }

  return p;
}

/**
 * @param {{ HERO_PROGRESS: { loop1End: number; transfer12End: number; loop2End: number; transfer23End: number }; HERO_TEXT_FADE_IN: number }} config
 */
export function buildHeroSnapPoints(config) {
  const { HERO_PROGRESS, HERO_TEXT_FADE_IN } = config;
  const { loop1End, transfer12End, loop2End, transfer23End } = HERO_PROGRESS;

  return [
    0,
    loop1End,
    transfer12End + HERO_TEXT_FADE_IN,
    loop2End,
    transfer23End + HERO_TEXT_FADE_IN,
    1,
  ];
}
