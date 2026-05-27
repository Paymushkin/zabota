/** Длина pin в долях viewport (3 перехода между 4 стадиями). */
export const TV_SHOWCASE_PIN_VIEWPORT = 4;

/** Декоративная анимация (GIF в public/video). */
export const TV_SHOWCASE_MOTION_SRC = `${import.meta.env.BASE_URL}video/tv-video.gif`;

/**
 * Границы progress (0…1).
 * stage1 → crossfade → stage2 → reveal → stage3 → motion (gif)
 */
export const TV_SHOWCASE_PROGRESS = {
  crossfadeStart: 0.2,
  crossfadeEnd: 0.3,
  revealStart: 0.42,
  revealEnd: 0.58,
  videoStart: 0.68,
  videoEnd: 0.82,
  /** Начать загрузку gif (доля progress pin). */
  videoPrefetchStart: 0.35,
};

/** Масштаб на третьей стадии (полностью в правой колонке). */
export const TV_SHOWCASE_STAGE3_SCALE = 0.58;

/** Масштаб стадии при показе gif. */
export const TV_SHOWCASE_VIDEO_STAGE_SCALE = 0.8;
