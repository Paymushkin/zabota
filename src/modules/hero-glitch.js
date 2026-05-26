import {
  HERO_BALL_FADE_IN,
  HERO_INTRO_TEXT_DELAY_MS,
  HERO_INTRO_TEXT_FADE_MS,
  HERO_PIN_VIEWPORT,
  HERO_PROGRESS,
  HERO_TEXT_FADE_IN,
  HERO_TEXT_FADE_OUT,
} from '../data/hero.js';
import { getHeroSnapTarget } from '../utils/hero-snap.js';
import { getHeroTextOpacities } from '../utils/hero-text-opacity.js';
import { clamp, easeInOut } from '../utils/math.js';
import {
  createPinScrollTrigger,
  destroyPinScrollTrigger,
  refreshPinScrollTriggers,
} from '../utils/pin-scroll-trigger.js';
import { buildHeroGlitchStripes } from '../utils/hero-glitch-stripes.js';
import {
  resetHeroBallOverlap,
  scheduleHeroBallLayoutStabilization,
  shouldHeroBallOverlap,
} from '../utils/hero-ball-overlap.js';
import { isPinPast } from '../utils/scroll-pin.js';

export function initHeroGlitch() {
  const section = document.querySelector('[data-hero-glitch]');
  const photo = document.querySelector('[data-hero-glitch-photo]');
  const stripesField = document.querySelector('[data-hero-glitch-stripes]');
  const pin = document.querySelector('[data-hero-pin]');

  if (photo) {
    photo.src = `${import.meta.env.BASE_URL}hero/hero-bg.webp`;
  }

  if (stripesField) {
    buildHeroGlitchStripes(stripesField);
  }
  const phase3Ball = document.querySelector('[data-hero-ball]');
  const phase3BallImg = phase3Ball?.querySelector('.hero__ball__img');
  const scenes = [...document.querySelectorAll('[data-hero-scene]')];
  const benefitsHeader = document.querySelector('[data-benefits-header]');

  if (!section || !pin) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** @type {import('gsap/ScrollTrigger').ScrollTrigger | null} */
  let heroScrollTrigger = null;
  let listenersAttached = false;
  let scrollProgress = 0;
  let introOpacity = 0;
  let introStarted = false;
  let introTimer = null;
  let introRafId = 0;

  const snapConfig = {
    HERO_PROGRESS,
    HERO_TEXT_FADE_IN,
    HERO_TEXT_FADE_OUT,
  };

  const textOpacityConfig = {
    HERO_PROGRESS,
    HERO_TEXT_FADE_IN,
    HERO_TEXT_FADE_OUT,
  };

  const getBallOpacity = (progress) => {
    const { transfer23End } = HERO_PROGRESS;
    const p = clamp(progress, 0, 1);
    const fadeInEnd = transfer23End + HERO_BALL_FADE_IN;

    if (p < transfer23End) {
      return 0;
    }
    if (p < fadeInEnd) {
      return easeInOut((p - transfer23End) / HERO_BALL_FADE_IN);
    }
    return 1;
  };

  const applyStripeHeal = (healT) => {
    if (!stripesField) {
      return;
    }

    const stripes = stripesField.querySelectorAll('.hero-glitch__stripe');
    const count = stripes.length;
    if (count === 0) {
      return;
    }

    const visibleRatio = 1 - healT;

    stripes.forEach((stripe, index) => {
      const edge = visibleRatio * count - index;
      const visibility = clamp(edge, 0, 1);
      const soften = 1 - healT * 0.55;

      stripe.style.setProperty('--stripe-visibility', String(visibility));
      stripe.style.setProperty('--stripe-soften', String(soften));

      if (stripe.classList.contains('hero-glitch__stripe--blink')) {
        const on = Number.parseFloat(stripe.style.getPropertyValue('--stripe-on') || '0.5');
        const off = Number.parseFloat(stripe.style.getPropertyValue('--stripe-off') || '0.08');
        stripe.style.setProperty('--stripe-on-active', String(on * soften));
        stripe.style.setProperty('--stripe-off-active', String(off * soften));
      }
    });
  };

  const applyGlitchVisuals = () => {
    const p = scrollProgress;
    const { transfer23End } = HERO_PROGRESS;

    const healT = easeInOut(clamp(p / transfer23End, 0, 1));
    const scene3Fade = clamp((p - transfer23End) / HERO_TEXT_FADE_IN, 0, 1);

    const active = p < transfer23End + HERO_TEXT_FADE_IN;
    section.toggleAttribute('data-glitch-active', active);

    const stripeOpacity = 0.88 * (1 - healT);
    const photoDim = 0.06 + healT * 0.48;
    const photoOpacity = active ? 1 - scene3Fade : 0;
    const scanOpacity = 0.5 * (1 - healT);

    section.style.setProperty('--glitch-stripe-opacity', stripeOpacity.toFixed(3));
    section.style.setProperty('--photo-dim', photoDim.toFixed(3));
    section.style.setProperty('--photo-opacity', photoOpacity.toFixed(3));
    section.style.setProperty('--scan-opacity', scanOpacity.toFixed(3));

    applyStripeHeal(healT);
  };

  const applyTextOpacity = () => {
    const opacities = getHeroTextOpacities(scrollProgress, introOpacity, textOpacityConfig);
    scenes.forEach((scene) => {
      const id = scene.dataset.heroScene;
      const opacity = opacities[`scene${id}`] ?? 0;
      scene.style.opacity = String(opacity);
      scene.classList.toggle('is-active', opacity > 0.02);
      scene.setAttribute('aria-hidden', opacity <= 0.02 ? 'true' : 'false');
    });

    if (phase3Ball) {
      const opacity = getBallOpacity(scrollProgress);
      const ballVisible = opacity > 0.02;
      phase3Ball.style.opacity = String(opacity);
      phase3Ball.classList.toggle('is-active', ballVisible);
      const overlapActive = shouldHeroBallOverlap(benefitsHeader, pin, ballVisible);
      phase3Ball.classList.toggle('hero__ball--overlap', overlapActive);
      benefitsHeader?.classList.toggle('benefits__header--overlap', overlapActive);
      section.classList.toggle('hero--ball-overlap', overlapActive);
      phase3Ball.setAttribute('aria-hidden', ballVisible ? 'false' : 'true');

      if (phase3BallImg) {
        if (overlapActive) {
          phase3BallImg.style.removeProperty('transform');
        } else {
          const scale = reducedMotion.matches ? 1 : 0.85 + opacity * 0.15;
          phase3BallImg.style.transform = `translate3d(0, 32%, 0) scale(${scale})`;
        }
      }
    }
  };

  const render = () => {
    applyGlitchVisuals();
    applyTextOpacity();
  };

  const syncPinHeight = () => {
    pin.style.height = `${window.innerHeight * HERO_PIN_VIEWPORT}px`;
  };

  const mountScrollTrigger = () => {
    destroyPinScrollTrigger(heroScrollTrigger);
    heroScrollTrigger = createPinScrollTrigger({
      trigger: pin,
      reducedMotion: reducedMotion.matches,
      snapTo: (progress) => getHeroSnapTarget(progress, snapConfig),
      onUpdate: (progress) => {
        scrollProgress = progress;
        render();
      },
    });
  };

  const refreshScroll = () => {
    syncPinHeight();
    refreshPinScrollTriggers();
    scrollProgress = heroScrollTrigger?.progress ?? 0;
    render();
  };

  const stopIntroText = () => {
    clearTimeout(introTimer);
    introTimer = null;
    cancelAnimationFrame(introRafId);
    introRafId = 0;
  };

  const startIntroText = () => {
    if (introStarted) {
      return;
    }
    introStarted = true;

    stopIntroText();
    introOpacity = 0;
    applyTextOpacity();

    if (reducedMotion.matches) {
      introOpacity = 1;
      applyTextOpacity();
      return;
    }

    introTimer = setTimeout(() => {
      introTimer = null;
      const start = performance.now();

      const animateIntro = (now) => {
        introOpacity = easeInOut(clamp((now - start) / HERO_INTRO_TEXT_FADE_MS, 0, 1));
        applyTextOpacity();
        if (now - start < HERO_INTRO_TEXT_FADE_MS) {
          introRafId = requestAnimationFrame(animateIntro);
        }
      };

      introRafId = requestAnimationFrame(animateIntro);
    }, HERO_INTRO_TEXT_DELAY_MS);
  };

  const attach = () => {
    if (listenersAttached) {
      return;
    }
    window.addEventListener('resize', refreshScroll, { passive: true });
    listenersAttached = true;
    syncPinHeight();
    mountScrollTrigger();
    section.toggleAttribute('data-glitch-active', true);
    applyTextOpacity();
    scheduleHeroBallLayoutStabilization(refreshScroll);
    startIntroText();
    render();
  };

  const detach = () => {
    if (!listenersAttached) {
      return;
    }
    window.removeEventListener('resize', refreshScroll);
    destroyPinScrollTrigger(heroScrollTrigger);
    heroScrollTrigger = null;
    stopIntroText();
    listenersAttached = false;
    introOpacity = 0;
    introStarted = false;
    pin.style.removeProperty('height');
    section.toggleAttribute('data-glitch-active', false);
    section.style.removeProperty('--glitch-stripe-opacity');
    section.style.removeProperty('--photo-dim');
    section.style.removeProperty('--photo-opacity');
    section.style.removeProperty('--scan-opacity');
    resetHeroBallOverlap();
    section.classList.remove('hero--ball-overlap');
  };

  const applyMotionMode = () => {
    if (listenersAttached) {
      mountScrollTrigger();
      refreshScroll();
    }

    if (reducedMotion.matches) {
      stopIntroText();
      introOpacity = 1;
    } else if (!introStarted) {
      startIntroText();
    } else {
      introOpacity = 1;
      applyTextOpacity();
    }
    render();
  };

  reducedMotion.addEventListener('change', applyMotionMode);
  attach();
}
