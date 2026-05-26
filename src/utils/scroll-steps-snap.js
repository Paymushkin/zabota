import { clamp } from './math.js';

const TRANSITION_COUNT = 2;

/**
 * @param {number} value
 * @param {number[]} targets
 */
function nearest(value, targets) {
  return targets.reduce((best, point) =>
    Math.abs(point - value) < Math.abs(best - value) ? point : best,
  );
}

/** Snap к полностью активному шагу (0, 0.5, 1 для трёх карточек). */
export function getScrollStepsSnapTarget(progress) {
  const p = clamp(progress, 0, 1);
  const stepSize = 1 / TRANSITION_COUNT;

  for (let i = 0; i < TRANSITION_COUNT; i += 1) {
    const start = i * stepSize;
    const end = (i + 1) * stepSize;

    if (p > start + 0.001 && p < end - 0.001) {
      return nearest(p, [start, end]);
    }
  }

  return p;
}
