import { isPinPast } from './scroll-pin.js';

let overlapEngaged = false;

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
  if (!ballVisible || !benefitsHeader || isPinPast(pin)) {
    overlapEngaged = false;
    return false;
  }

  const top = benefitsHeader.getBoundingClientRect().top;
  const on = window.innerHeight * OVERLAP_ON_RATIO;
  const off = window.innerHeight * OVERLAP_OFF_RATIO;

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
