import { clamp, easeInOut } from './math.js';

/**
 * @param {{ HERO_PROGRESS: { loop1End: number; loop2End: number }; HERO_TEXT_FADE_IN: number; HERO_TEXT_FADE_OUT: number }} config
 */
export function getHeroTextSceneReadyProgress(config) {
  const { HERO_PROGRESS, HERO_TEXT_FADE_IN } = config;
  const { loop1End, loop2End } = HERO_PROGRESS;

  return {
    scene2: loop1End + HERO_TEXT_FADE_IN,
    scene3: loop2End + HERO_TEXT_FADE_IN,
  };
}

/**
 * Кроссфейд заголовков: следующий появляется, когда уходит предыдущий (без «пустого» progress).
 *
 * @param {number} progress
 * @param {number} introScale
 * @param {{ HERO_PROGRESS: { loop1End: number; loop2End: number }; HERO_TEXT_FADE_IN: number; HERO_TEXT_FADE_OUT: number }} config
 */
export function getHeroTextOpacities(progress, introScale, config) {
  const { HERO_PROGRESS, HERO_TEXT_FADE_IN, HERO_TEXT_FADE_OUT } = config;
  const { loop1End, loop2End } = HERO_PROGRESS;
  const p = clamp(progress, 0, 1);

  const fadeIn = (start) => {
    if (p < start) {
      return 0;
    }
    const end = start + HERO_TEXT_FADE_IN;
    if (p < end) {
      return easeInOut((p - start) / HERO_TEXT_FADE_IN);
    }
    return 1;
  };

  const fadeOut = (start) => {
    if (p < start) {
      return 1;
    }
    const end = start + HERO_TEXT_FADE_OUT;
    if (p < end) {
      return 1 - easeInOut((p - start) / HERO_TEXT_FADE_OUT);
    }
    return 0;
  };

  const crossfade = (inStart, outStart) => {
    if (p < inStart) {
      return 0;
    }
    if (p < outStart) {
      return fadeIn(inStart);
    }
    return fadeOut(outStart);
  };

  return {
    scene1: introScale * fadeOut(loop1End),
    scene2: crossfade(loop1End, loop2End),
    scene3: crossfade(loop2End, 1),
  };
}
