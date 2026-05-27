import {
  TV_SHOWCASE_PIN_VIEWPORT,
  TV_SHOWCASE_PROGRESS,
  TV_SHOWCASE_STAGE3_SCALE,
  TV_SHOWCASE_VIDEO_PLAYBACK_RATE,
  TV_SHOWCASE_VIDEO_SRC,
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

const PEEK_VISIBLE_RATIO = 0.5;
/** Смещение к последнему кадру (≈1 кадр при 30 fps). */
const VIDEO_LAST_FRAME_OFFSET = 1 / 30;

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
 * @param {HTMLVideoElement} video
 * @param {{ parked: boolean }} state
 */
function parkVideoOnLastFrame(video, state) {
  video.pause();

  if (state.parked) {
    return;
  }

  state.parked = true;

  const { duration } = video;
  if (!Number.isFinite(duration) || duration <= 0) {
    return;
  }

  const lastFrameTime = Math.max(0, duration - VIDEO_LAST_FRAME_OFFSET);
  if (Math.abs(video.currentTime - lastFrameTime) > 0.001) {
    video.currentTime = lastFrameTime;
  }
}

/**
 * @param {HTMLVideoElement} video
 * @param {{ parked: boolean }} state
 */
function resetVideoPlayback(video, state) {
  state.parked = false;
  video.pause();
  video.currentTime = 0;
}

/**
 * @param {HTMLVideoElement} video
 */
function isVideoReadyToShow(video) {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

/**
 * @param {HTMLVideoElement} video
 * @param {boolean} shouldPlay
 * @param {{ parked: boolean }} state
 */
function syncVideoPlayback(video, shouldPlay, state) {
  if (!shouldPlay) {
    resetVideoPlayback(video, state);
    return;
  }

  if (state.parked || video.ended) {
    parkVideoOnLastFrame(video, state);
    return;
  }

  const startPlayback = () => {
    if (state.parked || video.ended) {
      parkVideoOnLastFrame(video, state);
      return;
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  };

  if (isVideoReadyToShow(video)) {
    startPlayback();
    return;
  }

  video.addEventListener('canplay', startPlayback, { once: true });
}

/**
 * @param {HTMLVideoElement} video
 */
function ensureVideoSource(video) {
  const src = TV_SHOWCASE_VIDEO_SRC;
  const source = video.querySelector('source');

  if (source && source.getAttribute('src') !== src) {
    source.src = src;
  }

  if (!video.getAttribute('src') && !source?.getAttribute('src')) {
    video.src = src;
  }
}

/**
 * @param {HTMLVideoElement} video
 */
function createVideoPrefetch(video) {
  let started = false;

  return () => {
    if (started) {
      return;
    }
    started = true;
    ensureVideoSource(video);
    video.preload = 'auto';
    video.load();
  };
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
 * @param {HTMLElement} videoWrap
 * @param {HTMLVideoElement} video
 * @param {number} progress
 * @param {() => void} prefetchVideo
 * @param {boolean} videoActivated
 * @param {{ parked: boolean }} videoState
 * @returns {boolean} updated videoActivated
 */
function applyTvShowcaseFrame(
  stage,
  media,
  img1,
  img2,
  videoWrap,
  video,
  progress,
  prefetchVideo,
  videoActivated,
  videoState,
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
    prefetchVideo();
  }

  const wantsVideo = progress >= videoStart;
  const VIDEO_DEACTIVATE_EPS = 0.03; // гистерезис: не возвращаемся к картинкам на микропрыжках progress

  let videoActivatedLocal = videoActivated;
  const isReady = isVideoReadyToShow(video);

  // Активируем видео только после первого момента, когда оно действительно готово.
  if (!videoActivatedLocal && wantsVideo && isReady) {
    videoActivatedLocal = true;
  }

  // Если пользователь уходит назад достаточно далеко — можно снова переключаться на картинки.
  if (videoActivatedLocal && !wantsVideo && progress < videoStart - VIDEO_DEACTIVATE_EPS) {
    videoActivatedLocal = false;
  }

  const wantsVideoEffective = wantsVideo || videoActivatedLocal;
  const showVideo = wantsVideoEffective && isReady;

  const imageScale = lerp(1, imageLayout.scale, revealT);

  if (showVideo) {
    const videoLayout = measureLayout(media, img2, TV_SHOWCASE_VIDEO_STAGE_SCALE);
    stage.style.transform = `translate3d(${videoLayout.revealX}px, -50%, 0) scale(${TV_SHOWCASE_VIDEO_STAGE_SCALE})`;
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 0);
    setLayerOpacity(videoWrap, 1);
    syncVideoPlayback(video, true, videoState);
    return videoActivatedLocal;
  }

  const translateX = lerp(imageLayout.peekX, imageLayout.revealX, revealT);
  stage.style.transform = `translate3d(${translateX}px, -50%, 0) scale(${imageScale})`;

  setLayerOpacity(videoWrap, 0);
  syncVideoPlayback(video, false, videoState);

  if (wantsVideoEffective) {
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 1);
    return videoActivatedLocal;
  }

  setLayerOpacity(img1, 1 - crossfadeT);
  setLayerOpacity(img2, crossfadeT);
  return videoActivatedLocal;
}

export function initTvShowcase() {
  const pin = document.querySelector('[data-tv-showcase-pin]');
  const media = document.querySelector('[data-tv-showcase-media]');
  const stage = document.querySelector('[data-tv-showcase-stage]');
  const img1 = document.querySelector('[data-tv-showcase-img="1"]');
  const img2 = document.querySelector('[data-tv-showcase-img="2"]');
  const videoWrap = document.querySelector('[data-tv-showcase-video-wrap]');
  const video = document.querySelector('[data-tv-showcase-video]');

  if (!pin || !media || !stage || !img1 || !img2 || !videoWrap || !video) {
    return;
  }

  hydrateLazyImages(stage);
  video.playbackRate = TV_SHOWCASE_VIDEO_PLAYBACK_RATE;
  ensureVideoSource(video);

  const prefetchVideo = createVideoPrefetch(video);
  /** @type {import('gsap/ScrollTrigger').ScrollTrigger | null} */
  let pinScrollTrigger = null;
  let resizeAttached = false;
  let videoActivated = false;
  const videoState = { parked: false };

  const syncLayout = () => {
    pin.style.height = `${TV_SHOWCASE_PIN_VIEWPORT * window.innerHeight}px`;
  };

  const applyFinalFrame = () => {
    prefetchVideo();
    videoActivated = applyTvShowcaseFrame(
      stage,
      media,
      img1,
      img2,
      videoWrap,
      video,
      1,
      prefetchVideo,
      videoActivated,
      videoState,
    );
  };

  const handleProgress = (progress) => {
    if (isPinPast(pin)) {
      applyFinalFrame();
      return;
    }

    videoActivated = applyTvShowcaseFrame(
      stage,
      media,
      img1,
      img2,
      videoWrap,
      video,
      progress,
      prefetchVideo,
      videoActivated,
      videoState,
    );
  };

  const refreshScroll = () => {
    syncLayout();
    refreshPinScrollTriggers();
    handleProgress(pinScrollTrigger?.progress ?? 0);
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

  video.addEventListener('ended', () => parkVideoOnLastFrame(video, videoState));

  const onMediaReady = () => refreshScroll();

  img1.addEventListener('load', onMediaReady, { once: true });
  img2.addEventListener('load', onMediaReady, { once: true });
  video.addEventListener('loadeddata', onMediaReady, { once: true });
  video.addEventListener('canplay', onMediaReady);

  attachScroll();
}
