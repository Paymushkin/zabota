import {
  TV_SHOWCASE_MOTION_SRC,
  TV_SHOWCASE_PIN_VIEWPORT,
  TV_SHOWCASE_PROGRESS,
  TV_SHOWCASE_STAGE3_SCALE,
  TV_SHOWCASE_VIDEO_STAGE_SCALE,
} from '../data/tv-showcase.js';
import { lerp, segmentT } from '../utils/math.js';
import {
  createPinScrollTrigger,
  destroyPinScrollTrigger,
  refreshPinScrollTriggers,
} from '../utils/pin-scroll-trigger.js';
import { isPinPast } from '../utils/scroll-pin.js';
import { getTvShowcaseSnapTarget } from '../utils/tv-showcase-snap.js';
import { createTvShowcasePlaybackDebug } from '../utils/tv-showcase-playback-debug.js';
import { getStableViewportHeight } from '../utils/viewport.js';

const PEEK_VISIBLE_RATIO = 0.5;
const VIDEO_DEACTIVATE_EPS = 0.03;

/**
 * @param {ParentNode} root
 */
function hydrateLazyImages(root) {
  root.querySelectorAll('img[data-src]').forEach((img) => {
    const src = img.getAttribute('data-src');
    if (!src) {
      return;
    }
    img.src = `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`;
    img.removeAttribute('data-src');
  });
}

/**
 * @param {HTMLElement} media
 * @param {HTMLImageElement} img
 * @param {number} stageScale
 */
function measureLayout(media, img, stageScale) {
  const mediaRect = media.getBoundingClientRect();
  const imgWidth = img.offsetWidth;
  const scaledWidth = imgWidth * stageScale;

  const peekLeft = window.innerWidth - imgWidth * PEEK_VISIBLE_RATIO;
  const peekX = peekLeft - mediaRect.left;
  const revealX = mediaRect.width - scaledWidth;

  return { peekX, revealX, scale: stageScale };
}

/**
 * Для логики «активировали зону motion» — gif реально отрисовался.
 *
 * @param {HTMLImageElement} motionImg
 */
function isMotionDecoded(motionImg) {
  return motionImg.complete && motionImg.naturalWidth > 0;
}

/**
 * @param {number} progress
 * @param {boolean} wantsMotionEffective
 */
function shouldResetMotionSrc(progress, wantsMotionEffective) {
  const { videoStart, videoPrefetchStart } = TV_SHOWCASE_PROGRESS;

  if (progress < videoPrefetchStart) {
    return true;
  }

  if (wantsMotionEffective) {
    return false;
  }

  return progress < videoStart - VIDEO_DEACTIVATE_EPS;
}

/**
 * Прогрев кэша без привязки к скрытому <img> — иначе gif «замирает» на 1-м кадре.
 */
function createMotionPrefetch() {
  let started = false;

  return () => {
    if (started) {
      return;
    }
    started = true;
    const probe = new Image();
    probe.src = TV_SHOWCASE_MOTION_SRC;
  };
}

/**
 * Запуск/перезапуск анимации при показе слоя (Safari/Chrome не крутят gif, загруженный в hidden).
 *
 * @param {HTMLImageElement} motionImg
 */
function restartMotionGif(motionImg) {
  const src = TV_SHOWCASE_MOTION_SRC;
  motionImg.src = '';
  motionImg.src = src;
}

/**
 * @param {HTMLImageElement} motionImg
 */
function clearMotionSrc(motionImg) {
  motionImg.removeAttribute('src');
  motionImg.src = '';
}

/**
 * @param {HTMLElement} element
 * @param {number} opacity
 */
function setLayerOpacity(element, opacity) {
  const clamped = Math.max(0, Math.min(1, opacity));
  element.style.opacity = String(clamped);
  element.classList.toggle('is-visible', clamped > 0.02);
}

/**
 * @param {HTMLElement} stage
 * @param {HTMLElement} media
 * @param {HTMLImageElement} img1
 * @param {HTMLImageElement} img2
 * @param {HTMLElement} motionWrap
 * @param {HTMLImageElement} motionImg
 * @param {number} progress
 * @param {() => void} prefetchMotion
 * @param {boolean} motionActivated
 * @param {{ visible: boolean }} motionPlayback
 * @returns {boolean} updated motionActivated
 */
function applyTvShowcaseFrame(
  stage,
  media,
  img1,
  img2,
  motionWrap,
  motionImg,
  progress,
  prefetchMotion,
  motionActivated,
  motionPlayback,
) {
  const {
    crossfadeStart,
    crossfadeEnd,
    revealStart,
    revealEnd,
    videoStart,
    videoPrefetchStart,
  } = TV_SHOWCASE_PROGRESS;
  const crossfadeT = segmentT(progress, crossfadeStart, crossfadeEnd);
  const revealT = segmentT(progress, revealStart, revealEnd);
  const imageLayout = measureLayout(media, img2, TV_SHOWCASE_STAGE3_SCALE);

  if (progress >= videoPrefetchStart) {
    prefetchMotion();
  }

  const wantsMotion = progress >= videoStart;

  let motionActivatedLocal = motionActivated;

  if (!motionActivatedLocal && wantsMotion && isMotionDecoded(motionImg)) {
    motionActivatedLocal = true;
  }

  if (motionActivatedLocal && !wantsMotion && progress < videoStart - VIDEO_DEACTIVATE_EPS) {
    motionActivatedLocal = false;
  }

  const wantsMotionEffective = wantsMotion || motionActivatedLocal;
  const showMotion = wantsMotionEffective;
  const resetMotion = shouldResetMotionSrc(progress, wantsMotionEffective);

  const imageScale = lerp(1, imageLayout.scale, revealT);

  if (showMotion) {
    if (!motionPlayback.visible) {
      restartMotionGif(motionImg);
      motionPlayback.visible = true;
    }

    const motionLayout = measureLayout(media, img2, TV_SHOWCASE_VIDEO_STAGE_SCALE);
    stage.style.transform = `translate3d(${motionLayout.revealX}px, -50%, 0) scale(${TV_SHOWCASE_VIDEO_STAGE_SCALE})`;
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 0);
    setLayerOpacity(motionWrap, 1);
    return motionActivatedLocal;
  }

  const translateX = lerp(imageLayout.peekX, imageLayout.revealX, revealT);
  stage.style.transform = `translate3d(${translateX}px, -50%, 0) scale(${imageScale})`;

  setLayerOpacity(motionWrap, 0);
  if (motionPlayback.visible) {
    motionPlayback.visible = false;
  }
  if (resetMotion) {
    clearMotionSrc(motionImg);
  }

  setLayerOpacity(img1, 1 - crossfadeT);
  setLayerOpacity(img2, crossfadeT);
  return motionActivatedLocal;
}

export function initTvShowcase() {
  const pin = document.querySelector('[data-tv-showcase-pin]');
  const media = document.querySelector('[data-tv-showcase-media]');
  const stage = document.querySelector('[data-tv-showcase-stage]');
  const img1 = document.querySelector('[data-tv-showcase-img="1"]');
  const img2 = document.querySelector('[data-tv-showcase-img="2"]');
  const motionWrap = document.querySelector('[data-tv-showcase-video-wrap]');
  const motionImg = document.querySelector('[data-tv-showcase-motion]');

  if (!pin || !media || !stage || !img1 || !img2 || !motionWrap || !motionImg) {
    return;
  }

  hydrateLazyImages(stage);
  stage.style.transformOrigin = 'left center';

  const prefetchMotion = createMotionPrefetch();
  /** @type {import('gsap/ScrollTrigger').ScrollTrigger | null} */
  let pinScrollTrigger = null;
  let resizeAttached = false;
  let motionActivated = false;
  const motionPlayback = { visible: false };

  const playbackDebug = createTvShowcasePlaybackDebug();
  playbackDebug.bindMotionImage(motionImg);

  const syncLayout = () => {
    pin.style.height = `${TV_SHOWCASE_PIN_VIEWPORT * getStableViewportHeight()}px`;
  };

  const refreshScroll = () => {
    syncLayout();
    refreshPinScrollTriggers();
    handleProgress(pinScrollTrigger?.progress ?? 0);
  };

  const applyFinalFrame = () => {
    prefetchMotion();
    motionActivated = applyTvShowcaseFrame(
      stage,
      media,
      img1,
      img2,
      motionWrap,
      motionImg,
      1,
      prefetchMotion,
      motionActivated,
      motionPlayback,
    );
  };

  const handleProgress = (progress) => {
    if (isPinPast(pin)) {
      applyFinalFrame();
      return;
    }

    motionActivated = applyTvShowcaseFrame(
      stage,
      media,
      img1,
      img2,
      motionWrap,
      motionImg,
      progress,
      prefetchMotion,
      motionActivated,
      motionPlayback,
    );
  };

  const onResize = () => {
    refreshScroll();
  };

  const mountScrollTrigger = () => {
    destroyPinScrollTrigger(pinScrollTrigger);
    syncLayout();
    pinScrollTrigger = createPinScrollTrigger({
      trigger: pin,
      reducedMotion: false,
      snapTo: (progress) => getTvShowcaseSnapTarget(progress, TV_SHOWCASE_PROGRESS),
      onUpdate: handleProgress,
    });
  };

  const attachScroll = () => {
    mountScrollTrigger();
    if (!resizeAttached) {
      window.addEventListener('resize', onResize, { passive: true });
      resizeAttached = true;
    }
  };

  const onMediaReady = () => refreshScroll();

  img1.addEventListener('load', onMediaReady, { once: true });
  img2.addEventListener('load', onMediaReady, { once: true });
  motionImg.addEventListener('load', onMediaReady);

  prefetchMotion();
  attachScroll();
}
