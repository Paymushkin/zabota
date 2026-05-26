import {
  HERO_LOOP_FPS,
  HERO_PIN_VIEWPORT,
  HERO_PROGRESS,
  HERO_SEQUENCES,
  HERO_BALL_FADE_IN,
  HERO_INTRO_TEXT_DELAY_MS,
  HERO_INTRO_TEXT_FADE_MS,
  HERO_TEXT_FADE_IN,
  HERO_TEXT_FADE_OUT,
} from '../data/hero.js';
import { loadImage } from '../utils/media-loader.js';
import { clamp, easeInOut } from '../utils/math.js';
import { isPinPast } from '../utils/scroll-pin.js';

/** @type {readonly (keyof typeof HERO_SEQUENCES)[]} */
const DEFERRED_SHEET_KEYS = ['transfer12', 'loop2', 'transfer23'];

const SCROLL_PREFETCH = {
  transfer12: 0.14,
  loop2: 0.28,
  transfer23: 0.48,
};

/**
 * @typedef {{ cols: number; rows: number; frameWidth: number; frameHeight: number; count: number }} SpriteMeta
 * @typedef {{ image: HTMLImageElement; meta: SpriteMeta }} HeroSheet
 */

/**
 * @param {{ path: string }} spec
 */
function sheetBaseUrl(spec) {
  return `${import.meta.env.BASE_URL}${spec.path}`;
}

/**
 * @param {number} progress
 */
function getMediaState(progress) {
  const p = clamp(progress, 0, 1);
  const { loop1End, transfer12End, loop2End, transfer23End } = HERO_PROGRESS;

  if (p < loop1End) {
    return { mode: 'loop1' };
  }
  if (p < transfer12End) {
    const t = (p - loop1End) / (transfer12End - loop1End);
    return { mode: 'transfer12', healT: clamp(t, 0, 1) };
  }
  if (p < loop2End) {
    return { mode: 'loop2' };
  }
  if (p < transfer23End) {
    const t = (p - loop2End) / (transfer23End - loop2End);
    return { mode: 'transfer23', healT: clamp(t, 0, 1) };
  }
  return { mode: 'black' };
}

/**
 * @param {number} progress
 * @param {number} fadeInStart
 * @param {number} fadeOutStart
 */
function sceneOpacity(progress, fadeInStart, fadeOutStart) {
  const p = clamp(progress, 0, 1);
  const fadeInEnd = fadeInStart + HERO_TEXT_FADE_IN;
  const fadeOutEnd = fadeOutStart + HERO_TEXT_FADE_OUT;

  if (p < fadeInStart) {
    return 0;
  }
  if (p < fadeInEnd) {
    return easeInOut((p - fadeInStart) / HERO_TEXT_FADE_IN);
  }
  if (p < fadeOutStart) {
    return 1;
  }
  if (p < fadeOutEnd) {
    return 1 - easeInOut((p - fadeOutStart) / HERO_TEXT_FADE_OUT);
  }
  return 0;
}

/** Скрытие по скроллу (без fade-in в начале pin). */
function sceneFadeOutOnly(progress, fadeOutStart) {
  const p = clamp(progress, 0, 1);
  const fadeOutEnd = fadeOutStart + HERO_TEXT_FADE_OUT;

  if (p < fadeOutStart) {
    return 1;
  }
  if (p < fadeOutEnd) {
    return 1 - easeInOut((p - fadeOutStart) / HERO_TEXT_FADE_OUT);
  }
  return 0;
}

/** Появление мяча в фазе 3 (fade + scale по скроллу). */
function getBallOpacity(progress) {
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
}

/**
 * @param {number} progress
 * @param {number} introOpacity 0…1, появление текста фазы 1 при загрузке
 */
function getTextOpacity(progress, introOpacity) {
  const { loop1End, transfer12End, loop2End, transfer23End } = HERO_PROGRESS;

  return {
    scene1: introOpacity * sceneFadeOutOnly(progress, loop1End),
    scene2: sceneOpacity(progress, transfer12End, loop2End),
    scene3: sceneOpacity(progress, transfer23End, 1),
  };
}

export function initHero() {
  const pin = document.querySelector('[data-hero-pin]');
  const canvas = document.querySelector('[data-hero-canvas]');
  const phase3Ball = document.querySelector('[data-hero-ball]');
  const phase3BallImg = phase3Ball?.querySelector('.hero__ball__img');
  const scenes = [...document.querySelectorAll('[data-hero-scene]')];
  const benefitsHeader = document.querySelector('[data-benefits-header]');
  if (!pin || !canvas) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    return;
  }

  /** @type {Partial<Record<keyof typeof HERO_SEQUENCES, HeroSheet>>} */
  const sheets = {};
  /** @type {Partial<Record<keyof typeof HERO_SEQUENCES, Promise<HeroSheet>>>} */
  const sheetLoads = {};
  let loop1Index = 0;
  let loop2Index = 0;
  let lastLoopTime = 0;
  let scrollProgress = 0;
  let rafId = 0;
  let listenersAttached = false;
  let ready = false;
  let introOpacity = 0;
  let introTimer = null;
  let introRafId = 0;

  const syncPinHeight = () => {
    pin.style.height = `${window.innerHeight * HERO_PIN_VIEWPORT}px`;
  };

  const syncCanvasSize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const drawBlack = () => {
    syncCanvasSize();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  /**
   * @param {HeroSheet} sheet
   * @param {number} frameIndex
   */
  const drawSpriteFrame = (sheet, frameIndex) => {
    const { image, meta } = sheet;
    if (!image?.complete) {
      return;
    }

    const idx = clamp(frameIndex, 0, meta.count - 1);
    const col = idx % meta.cols;
    const row = Math.floor(idx / meta.cols);
    const sx = col * meta.frameWidth;
    const sy = row * meta.frameHeight;

    syncCanvasSize();
    const { width, height } = canvas;
    const scale = Math.max(width / meta.frameWidth, height / meta.frameHeight);
    const dw = meta.frameWidth * scale;
    const dh = meta.frameHeight * scale;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, sx, sy, meta.frameWidth, meta.frameHeight, dx, dy, dw, dh);
  };

  /**
   * @param {'loop1' | 'loop2'} mode
   */
  const pickLoopFrameIndex = (mode) => {
    const key = mode;
    const sheet = sheets[key];
    if (!sheet) {
      return 0;
    }
    if (mode === 'loop1') {
      return loop1Index % sheet.meta.count;
    }
    return loop2Index % sheet.meta.count;
  };

  /**
   * @param {'transfer12' | 'transfer23'} key
   * @param {number} healT
   */
  const pickTransferFrameIndex = (key, healT) => {
    const sheet = sheets[key];
    if (!sheet) {
      return 0;
    }
    return clamp(Math.round(healT * (sheet.meta.count - 1)), 0, sheet.meta.count - 1);
  };

  const applyTextOpacity = () => {
    const opacities = getTextOpacity(scrollProgress, introOpacity);
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
      const benefitsOverlap =
        Boolean(benefitsHeader) &&
        benefitsHeader.getBoundingClientRect().top < window.innerHeight * 0.92;
      const overlapActive = ballVisible && benefitsOverlap && !isPinPast(pin);
      phase3Ball.classList.toggle('hero__ball--overlap', overlapActive);
      benefitsHeader?.classList.toggle('benefits__header--overlap', overlapActive);
      phase3Ball.setAttribute('aria-hidden', ballVisible ? 'false' : 'true');

      if (phase3BallImg) {
        const scale = reducedMotion.matches ? 1 : 0.85 + opacity * 0.15;
        phase3BallImg.style.transform = `translate3d(0, 32%, 0) scale(${scale})`;
      }
    }
  };

  const renderCanvas = () => {
    if (!ready) {
      return;
    }

    const state = getMediaState(scrollProgress);

    if (state.mode === 'black') {
      drawBlack();
      return;
    }

    if (state.mode === 'transfer12' || state.mode === 'transfer23') {
      const sheet = sheets[state.mode];
      if (sheet) {
        drawSpriteFrame(sheet, pickTransferFrameIndex(state.mode, state.healT));
        return;
      }
      const fallback = state.mode === 'transfer12' ? sheets.loop1 : sheets.loop2;
      if (fallback) {
        drawSpriteFrame(fallback, pickLoopFrameIndex(state.mode === 'transfer12' ? 'loop1' : 'loop2'));
      }
      return;
    }

    const sheet = sheets[state.mode];
    if (sheet) {
      drawSpriteFrame(sheet, pickLoopFrameIndex(state.mode));
    }
  };

  const render = () => {
    renderCanvas();
    applyTextOpacity();
  };

  const advanceLoops = (time) => {
    if (reducedMotion.matches || !ready) {
      return;
    }

    const state = getMediaState(scrollProgress);
    if (state.mode !== 'loop1' && state.mode !== 'loop2') {
      return;
    }

    const interval = 1000 / HERO_LOOP_FPS;
    if (time - lastLoopTime < interval) {
      return;
    }
    lastLoopTime = time;

    if (state.mode === 'loop1' && sheets.loop1) {
      loop1Index = (loop1Index + 1) % sheets.loop1.meta.count;
    }
    if (state.mode === 'loop2' && sheets.loop2) {
      loop2Index = (loop2Index + 1) % sheets.loop2.meta.count;
    }
  };

  const tick = (time) => {
    rafId = requestAnimationFrame(tick);
    advanceLoops(time);
    render();
  };

  const getScrollProgress = () => {
    const scrollRange = Math.max(0, pin.offsetHeight - window.innerHeight);
    if (scrollRange <= 0) {
      return 0;
    }
    return clamp(-pin.getBoundingClientRect().top / scrollRange, 0, 1);
  };

  /**
   * @param {keyof typeof HERO_SEQUENCES} key
   */
  const loadSheet = (key) => {
    if (sheets[key]) {
      return Promise.resolve(sheets[key]);
    }

    if (!sheetLoads[key]) {
      const spec = HERO_SEQUENCES[key];
      const base = sheetBaseUrl(spec);

      sheetLoads[key] = Promise.all([
        fetch(`${base}/sheet.json`).then((res) => {
          if (!res.ok) {
            throw new Error(`hero sheet manifest failed: ${key}`);
          }
          return res.json();
        }),
        loadImage(`${base}/sheet.webp`),
      ]).then(([meta, image]) => {
        /** @type {HeroSheet} */
        const sheet = { image, meta };
        sheets[key] = sheet;
        render();
        return sheet;
      });
    }

    return sheetLoads[key];
  };

  const prefetchByScroll = (progress) => {
    if (progress >= SCROLL_PREFETCH.transfer12) {
      void loadSheet('transfer12');
    }
    if (progress >= SCROLL_PREFETCH.loop2) {
      void loadSheet('loop2');
    }
    if (progress >= SCROLL_PREFETCH.transfer23) {
      void loadSheet('transfer23');
    }
  };

  const update = () => {
    syncPinHeight();
    scrollProgress = getScrollProgress();
    prefetchByScroll(scrollProgress);
    render();
  };

  const schedule = () => {
    if (!listenersAttached) {
      return;
    }
    update();
  };

  const stopIntroText = () => {
    clearTimeout(introTimer);
    introTimer = null;
    cancelAnimationFrame(introRafId);
    introRafId = 0;
  };

  const startIntroText = () => {
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

  const startLoop = () => {
    cancelAnimationFrame(rafId);
    lastLoopTime = 0;
    rafId = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const markReady = () => {
    ready = true;
    loop1Index = 0;
    loop2Index = 0;
    if (sheets.loop1) {
      drawSpriteFrame(sheets.loop1, 0);
    }
    startIntroText();
    startLoop();
    update();
  };

  const bootstrap = async () => {
    try {
      await loadSheet('loop1');
      markReady();
    } catch {
      ready = false;
    }
  };

  const attach = () => {
    if (listenersAttached) {
      return;
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    listenersAttached = true;
    syncPinHeight();
    drawBlack();
    applyTextOpacity();
    void bootstrap();
  };

  const detach = () => {
    if (!listenersAttached) {
      return;
    }
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    stopLoop();
    stopIntroText();
    listenersAttached = false;
    ready = false;
    introOpacity = 0;
    pin.style.removeProperty('height');
    for (const key of DEFERRED_SHEET_KEYS) {
      delete sheetLoads[key];
      delete sheets[key];
    }
    delete sheets.loop1;
    delete sheetLoads.loop1;
  };

  const applyMotionMode = () => {
    if (reducedMotion.matches) {
      stopLoop();
      stopIntroText();
      if (ready) {
        introOpacity = 1;
      }
    } else if (ready) {
      startIntroText();
      startLoop();
    }
    render();
  };

  reducedMotion.addEventListener('change', applyMotionMode);
  attach();
}
