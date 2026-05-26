/** Длина pin в долях viewport. */
export const HERO_PIN_VIEWPORT = 4.5;

/**
 * Границы progress (0…1).
 * loop1 → transfer12 → loop2 → transfer23 → black
 */
export const HERO_PROGRESS = {
  loop1End: 0.22,
  transfer12End: 0.32,
  loop2End: 0.52,
  transfer23End: 0.62,
};

/** Длительность fade-out / fade-in заголовков (доля progress). */
export const HERO_TEXT_FADE_OUT = 0.06;
export const HERO_TEXT_FADE_IN = 0.06;

/** Появление мяча в фазе 3 (доля progress, дольше текста). */
export const HERO_BALL_FADE_IN = 0.12;

/** Появление текста фазы 1 при загрузке (без скролла). */
export const HERO_INTRO_TEXT_DELAY_MS = 500;
export const HERO_INTRO_TEXT_FADE_MS = 650;

export const HERO_SEQUENCES = {
  loop1: {
    path: 'hero/hero-1',
    prefix: 'hero-1-',
    count: 118,
  },
  transfer12: {
    path: 'hero/transfer-1-2',
    prefix: 'transfer-1-2-',
    count: 60,
  },
  loop2: {
    path: 'hero/hero-2',
    prefix: 'hero-2-',
    count: 120,
  },
  transfer23: {
    path: 'hero/transfer-2-3',
    prefix: 'transfer-2-3-',
    count: 120,
  },
};

export const HERO_LOOP_FPS = 24;
