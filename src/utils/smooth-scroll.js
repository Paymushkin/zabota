import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let smoothScrollInstance = null;

function isReducedMotionPreferred() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Initializes Lenis as scroll transport and bridges it with GSAP ScrollTrigger.
 * Returns a cleanup function for potential future teardown.
 * @returns {() => void}
 */
export function initSmoothScroll() {
  if (smoothScrollInstance || isReducedMotionPreferred()) {
    return () => {};
  }

  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    syncTouch: true,
    // More inertia + lower sensitivity to short gestures.
    lerp: 0.05,
    wheelMultiplier: 1.5,
    touchMultiplier: 1.5,
    syncTouchLerp: 0.05,
  });

  ScrollTrigger.scrollerProxy(document.documentElement, {
    scrollTop(value) {
      if (typeof value === 'number') {
        lenis.scrollTo(value, { immediate: true });
        return undefined;
      }

      return window.scrollY || window.pageYOffset || 0;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    pinType: 'fixed',
  });

  ScrollTrigger.defaults({ scroller: document.documentElement });

  const updateScrollTrigger = () => ScrollTrigger.update();
  lenis.on('scroll', updateScrollTrigger);

  const onTick = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(onTick);
  gsap.ticker.lagSmoothing(0);

  smoothScrollInstance = lenis;

  return () => {
    gsap.ticker.remove(onTick);
    lenis.off('scroll', updateScrollTrigger);
    lenis.destroy();
    smoothScrollInstance = null;
  };
}

export function refreshSmoothScrollLayout() {
  if (!smoothScrollInstance) {
    return;
  }

  smoothScrollInstance.resize();
  ScrollTrigger.refresh();
}
