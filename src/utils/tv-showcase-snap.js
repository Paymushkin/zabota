import { clamp } from './math.js';

const SNAP_THRESHOLD = 0.045;

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

  if (p > crossfadeStart && p < videoEnd) {
    const snapPoint = nearest(p, [
      crossfadeStart,
      crossfadeEnd,
      revealStart,
      revealEnd,
      videoStart,
      videoEnd,
    ]);
    return Math.abs(p - snapPoint) <= SNAP_THRESHOLD ? snapPoint : p;
  }

  return p;
}
