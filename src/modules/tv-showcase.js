import {
  TV_SHOWCASE_PIN_VIEWPORT,
  TV_SHOWCASE_PROGRESS,
  TV_SHOWCASE_STAGE3_SCALE,
  TV_SHOWCASE_VIDEO_PLAYBACK_RATE,
  TV_SHOWCASE_VIDEO_SRC,
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
const VIDEO_END_EPS = 0.05;

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
 */
function measureLayout(media, img) {
  const mediaRect = media.getBoundingClientRect();
  const imgWidth = img.offsetWidth;
  const scale = TV_SHOWCASE_STAGE3_SCALE;
  const scaledWidth = imgWidth * scale;

  const peekLeft = window.innerWidth - imgWidth * PEEK_VISIBLE_RATIO;
  const peekX = peekLeft - mediaRect.left;
  const revealX = mediaRect.width - scaledWidth;

  return { peekX, revealX, scale };
}

/**
 * @param {HTMLVideoElement} video
 */
function parkVideoOnLastFrame(video) {
  const { duration } = video;

  if (!Number.isFinite(duration) || duration <= 0) {
    video.pause();
    return;
  }

  video.pause();
  video.currentTime = Math.max(0, duration - VIDEO_END_EPS);
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
 */
function syncVideoPlayback(video, shouldPlay) {
  if (!shouldPlay) {
    video.pause();
    video.currentTime = 0;
    return;
  }

  if (video.ended) {
    parkVideoOnLastFrame(video);
    return;
  }

  const startPlayback = () => {
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
 */
function applyTvShowcaseFrame(stage, media, img1, img2, videoWrap, video, progress, prefetchVideo) {
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
  const layout = measureLayout(media, img2);

  const translateX = lerp(layout.peekX, layout.revealX, revealT);
  const scale = lerp(1, layout.scale, revealT);

  stage.style.transform = `translate3d(${translateX}px, -50%, 0) scale(${scale})`;

  if (progress >= videoPrefetchStart) {
    prefetchVideo();
  }

  const wantsVideo = progress >= videoStart;
  const showVideo = wantsVideo && isVideoReadyToShow(video);

  if (showVideo) {
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 0);
    setLayerOpacity(videoWrap, 1);
    syncVideoPlayback(video, true);
    return;
  }

  setLayerOpacity(videoWrap, 0);
  syncVideoPlayback(video, false);

  if (wantsVideo) {
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 1);
    return;
  }

  setLayerOpacity(img1, 1 - crossfadeT);
  setLayerOpacity(img2, crossfadeT);
}

function clearTvShowcaseStyles(stage, img1, img2, videoWrap) {
  stage.style.removeProperty('transform');
  for (const el of [img1, img2, videoWrap]) {
    el.style.removeProperty('opacity');
    el.classList.remove('is-visible');
  }
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** @type {import('gsap/ScrollTrigger').ScrollTrigger | null} */
  let pinScrollTrigger = null;
  let resizeAttached = false;

  const syncLayout = () => {
    pin.style.height = `${TV_SHOWCASE_PIN_VIEWPORT * window.innerHeight}px`;
  };

  const applyFinalFrame = () => {
    prefetchVideo();
    applyTvShowcaseFrame(stage, media, img1, img2, videoWrap, video, 1, prefetchVideo);
  };

  const handleProgress = (progress) => {
    if (isPinPast(pin)) {
      applyFinalFrame();
      parkVideoOnLastFrame(video);
      return;
    }

    applyTvShowcaseFrame(
      stage,
      media,
      img1,
      img2,
      videoWrap,
      video,
      progress,
      prefetchVideo,
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
      reducedMotion: reducedMotion.matches,
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

  const detachScroll = () => {
    destroyPinScrollTrigger(pinScrollTrigger);
    pinScrollTrigger = null;
    if (resizeAttached) {
      window.removeEventListener('resize', onResize);
      resizeAttached = false;
    }
  };

  video.addEventListener('ended', () => parkVideoOnLastFrame(video));

  const onMediaReady = () => refreshScroll();

  img1.addEventListener('load', onMediaReady, { once: true });
  img2.addEventListener('load', onMediaReady, { once: true });
  video.addEventListener('loadeddata', onMediaReady, { once: true });
  video.addEventListener('canplay', onMediaReady);

  const detachAll = () => {
    detachScroll();
    video.pause();
    clearTvShowcaseStyles(stage, img1, img2, videoWrap);
    pin.style.removeProperty('height');
  };

  const applyMode = () => {
    if (reducedMotion.matches) {
      detachAll();
      applyFinalFrame();
      parkVideoOnLastFrame(video);
      if (!Number.isFinite(video.duration)) {
        video.addEventListener('loadedmetadata', () => parkVideoOnLastFrame(video), {
          once: true,
        });
      }
    } else {
      attachScroll();
    }
  };

  reducedMotion.addEventListener('change', applyMode);
  applyMode();
}
