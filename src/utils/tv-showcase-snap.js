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
 * @param {number} progress 0…1
 * @param {typeof import('../data/tv-showcase.js').TV_SHOWCASE_PROGRESS} progressMap
 */
export function getTvShowcaseSnapTarget(progress, progressMap) {
  const p = clamp(progress, 0, 1);
  const { crossfadeStart, crossfadeEnd, revealStart, revealEnd, videoStart, videoEnd } =
    progressMap;

  if (p > crossfadeStart && p < crossfadeEnd) {
    return nearest(p, [crossfadeStart, crossfadeEnd]);
  }

  if (p > crossfadeEnd && p < revealStart) {
    return nearest(p, [crossfadeEnd, revealStart]);
  }

  if (p > revealStart && p < revealEnd) {
    return nearest(p, [revealStart, revealEnd]);
  }

  if (p > revealEnd && p < videoStart) {
    return nearest(p, [revealEnd, videoStart]);
  }

  if (p > videoStart && p < videoEnd) {
    return nearest(p, [videoStart, videoEnd]);
  }

  return p;
}
