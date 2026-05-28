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
export const HERO_INTRO_TEXT_DELAY_MS = 150;
export const HERO_INTRO_TEXT_FADE_MS = 650;
