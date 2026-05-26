import { isPinPast } from './scroll-pin.js';

let overlapEngaged = false;
let layoutStabilized = false;

const OVERLAP_ON_RATIO = 0.88;
const OVERLAP_OFF_RATIO = 0.94;

/**
 * Стабильный overlap мяча и заголовка benefits (гистерезис для Safari).
 *
 * @param {HTMLElement | null} benefitsHeader
 * @param {HTMLElement} pin
 * @param {boolean} ballVisible
 */
export function shouldHeroBallOverlap(benefitsHeader, pin, ballVisible) {
  if (!layoutStabilized || !ballVisible || !benefitsHeader || isPinPast(pin)) {
    if (!ballVisible || isPinPast(pin)) {
      overlapEngaged = false;
    }
    return false;
  }

  const rect = benefitsHeader.getBoundingClientRect();
  if (rect.height < 1) {
    return false;
  }

  const vh = window.innerHeight;
  const top = rect.top;

  // До первого входа заголовка в зону overlap не включаем (Safari 17 иногда отдаёт top≈0).
  if (!overlapEngaged && top >= vh * OVERLAP_OFF_RATIO) {
    return false;
  }

  const on = vh * OVERLAP_ON_RATIO;
  const off = vh * OVERLAP_OFF_RATIO;

  if (!overlapEngaged && top < on) {
    overlapEngaged = true;
  } else if (overlapEngaged && top > off) {
    overlapEngaged = false;
  }

  return overlapEngaged;
}

export function resetHeroBallOverlap() {
  overlapEngaged = false;
}

function markHeroBallLayoutStabilized() {
  layoutStabilized = true;
}

/**
 * После первого стабильного layout (rAF ×2, fonts, load) пересчитывает overlap и pin.
 *
 * @param {() => void} onStabilize
 */
export function scheduleHeroBallLayoutStabilization(onStabilize) {
  const run = () => {
    markHeroBallLayoutStabilized();
    resetHeroBallOverlap();
    onStabilize();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });

  document.fonts?.ready.then(run);

  if (document.readyState === 'complete') {
    run();
  } else {
    window.addEventListener('load', run, { once: true });
  }
}
