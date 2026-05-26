import { clamp } from './math.js';

export const PAST_PIN_EPS = 2;

export function getPinScrollProgress(pin) {
  const scrollRange = pin.offsetHeight - window.innerHeight;
  const pinTop = pin.getBoundingClientRect().top;

  return scrollRange <= 0 ? 0 : clamp(-pinTop / scrollRange, 0, 1);
}

export function isPinPast(pin) {
  return pin.getBoundingClientRect().bottom <= window.innerHeight + PAST_PIN_EPS;
}

/**
 * @param {() => void} onUpdate
 */
export function createRafScrollLoop(onUpdate) {
  let ticking = false;
  let attached = false;

  const update = () => {
    ticking = false;
    onUpdate();
  };

  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  const attach = () => {
    if (attached) {
      return;
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    attached = true;
    schedule();
  };

  const detach = () => {
    if (!attached) {
      return;
    }
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    attached = false;
  };

  return { schedule, attach, detach };
}
