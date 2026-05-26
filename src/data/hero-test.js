/** Конфиг hero для test.html — спрайты в hero-test/ (loop с шагом 2 кадра). */

export const HERO_PIN_VIEWPORT = 4.5;

export const HERO_PROGRESS = {
  loop1End: 0.22,
  transfer12End: 0.32,
  loop2End: 0.52,
  transfer23End: 0.62,
};

export const HERO_TEXT_FADE_OUT = 0.06;
export const HERO_TEXT_FADE_IN = 0.06;
export const HERO_BALL_FADE_IN = 0.12;
export const HERO_INTRO_TEXT_DELAY_MS = 150;
export const HERO_INTRO_TEXT_FADE_MS = 650;

/** @typedef {{ path: string; count: number }} HeroSequenceSpec */

/** @type {Record<'loop1' | 'transfer12' | 'loop2' | 'transfer23', HeroSequenceSpec>} */
export const HERO_SEQUENCES = {
  loop1: {
    path: 'hero-test/hero-1',
    count: 59,
  },
  transfer12: {
    path: 'hero-test/transfer-1-2',
    count: 60,
  },
  loop2: {
    path: 'hero-test/hero-2',
    count: 60,
  },
  transfer23: {
    path: 'hero-test/transfer-2-3',
    count: 120,
  },
};

export const HERO_LOOP_FPS = 24;
