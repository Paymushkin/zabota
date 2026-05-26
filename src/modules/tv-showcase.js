import {
  TV_SHOWCASE_PIN_VIEWPORT,
  TV_SHOWCASE_PROGRESS,
  TV_SHOWCASE_STAGE3_SCALE,
  TV_SHOWCASE_VIDEO_PLAYBACK_RATE,
  TV_SHOWCASE_VIDEO_SRC,
} from '../data/tv-showcase.js';
import { lerp, segmentT } from '../utils/math.js';
import { createRafScrollLoop, getPinScrollProgress, isPinPast } from '../utils/scroll-pin.js';

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
 * @param {() => void} bindVideoSource
 */
function syncVideoPlayback(video, shouldPlay, bindVideoSource) {
  if (!shouldPlay) {
    video.pause();
    video.currentTime = 0;
    return;
  }

  bindVideoSource();

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
function bindVideoSource(video) {
  const src = TV_SHOWCASE_VIDEO_SRC;
  const source = video.querySelector('source');

  if (source) {
    if (source.getAttribute('src') !== src) {
      source.src = src;
      video.load();
    }
    return;
  }

  if (video.getAttribute('src') !== src) {
    video.src = src;
    video.load();
  }
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
 * @param {() => void} bindVideoSource
 */
function applyTvShowcaseFrame(stage, media, img1, img2, videoWrap, video, progress, bindVideoSource) {
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
    bindVideoSource();
  }

  const wantsVideo = progress >= videoStart;
  const showVideo = wantsVideo && isVideoReadyToShow(video);

  if (showVideo) {
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 0);
    setLayerOpacity(videoWrap, 1);
    syncVideoPlayback(video, true, bindVideoSource);
    return;
  }

  setLayerOpacity(videoWrap, 0);
  syncVideoPlayback(video, false, bindVideoSource);

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
  video.preload = 'auto';

  const bindVideoSourceOnce = () => {
    bindVideoSource(video);
  };

  bindVideoSourceOnce();

  const syncLayout = () => {
    pin.style.height = `${TV_SHOWCASE_PIN_VIEWPORT * window.innerHeight}px`;
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  video.addEventListener('ended', () => parkVideoOnLastFrame(video));

  const applyFinalFrame = () => {
    bindVideoSourceOnce();
    applyTvShowcaseFrame(stage, media, img1, img2, videoWrap, video, 1, bindVideoSourceOnce);
  };

  const { schedule, attach, detach } = createRafScrollLoop(() => {
    syncLayout();

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
      getPinScrollProgress(pin),
      bindVideoSourceOnce,
    );
  });

  const onMediaReady = () => schedule();

  img1.addEventListener('load', onMediaReady, { once: true });
  img2.addEventListener('load', onMediaReady, { once: true });
  video.addEventListener('loadeddata', onMediaReady, { once: true });
  video.addEventListener('canplay', onMediaReady);

  const detachAll = () => {
    detach();
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
      attach();
    }
  };

  reducedMotion.addEventListener('change', applyMode);
  applyMode();
}
