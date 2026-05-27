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

/**
 * Вертикальное смещение сцен синхронно с opacity.
 *
 * shift:
 *  - +1 означает "снизу" (translateY вверх по модулю, то есть вниз по экрану)
 *  - -1 означает "уходит вверх" при выходе
 *
 * @param {number} progress
 * @param {{ HERO_PROGRESS: { loop1End: number; loop2End: number }; HERO_TEXT_FADE_IN: number; HERO_TEXT_FADE_OUT: number }} config
 * @returns {{ scene1: number; scene2: number; scene3: number }}
 */
export function getHeroTextSceneShifts(progress, config) {
  const { HERO_PROGRESS, HERO_TEXT_FADE_IN, HERO_TEXT_FADE_OUT } = config;
  const { loop1End, loop2End } = HERO_PROGRESS;
  const p = clamp(progress, 0, 1);

  // Возвращаем "visibility" (по сути 0..1) для fade-фаз.
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

  // Идея:
  // - исходящая сцена уходит вверх одновременно с fade-out до opacity=0
  // - входящая сцена приходит снизу одновременно с fade-in до opacity=1
  //
  // shift в диапазоне [-1..+1], где:
  //   +1 — максимально "снизу"
  //   -1 — максимально "сверху"

  // scene1: только fadeOut(loop1End)
  // opacity: 1 -> 0, shift: 0 -> -1
  const scene1Shift = -(1 - fadeOut(loop1End));

  // scene2: сначала fade-in (снизу), потом fade-out (вверх)
  const scene2In = fadeIn(loop1End);
  const scene2Out = fadeOut(loop2End);
  const scene2Shift = p < loop2End ? 1 - scene2In : -(1 - scene2Out);

  // scene3: только fade-in (снизу)
  const scene3In = fadeIn(loop2End);
  const scene3Shift = 1 - scene3In;

  return {
    scene1: scene1Shift,
    scene2: scene2Shift,
    scene3: scene3Shift,
  };
}
