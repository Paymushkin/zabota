import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

function ensureRegistered() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
}

/**
 * @param {{
 *   trigger: Element;
 *   onUpdate: (progress: number) => void;
 *   snapTo?: (progress: number) => number;
 *   reducedMotion?: boolean;
 * }} options
 * @returns {ScrollTrigger}
 */
export function createPinScrollTrigger({
  trigger,
  onUpdate,
  snapTo,
  reducedMotion = false,
}) {
  ensureRegistered();

  const st = ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    onUpdate: (self) => onUpdate(self.progress),
    snap:
      reducedMotion || !snapTo
        ? false
        : {
            snapTo,
            duration: { min: 0.22, max: 0.5 },
            delay: 0.06,
            ease: 'power2.inOut',
          },
  });

  onUpdate(st.progress);
  return st;
}

/** @param {ScrollTrigger | null | undefined} st */
export function destroyPinScrollTrigger(st) {
  st?.kill();
}

export function refreshPinScrollTriggers() {
  ensureRegistered();
  ScrollTrigger.refresh();
}
