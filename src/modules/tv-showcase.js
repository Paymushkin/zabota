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
import { createTvShowcasePlaybackDebug } from '../utils/tv-showcase-playback-debug.js';

const PEEK_VISIBLE_RATIO = 0.5;
/** Смещение к последнему кадру (≈1 кадр при 30 fps). */
const VIDEO_LAST_FRAME_OFFSET = 1 / 30;
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
 * @param {HTMLVideoElement} video
 * @param {{ parked: boolean; playBlocked: boolean }} state
 */
function parkVideoOnLastFrame(video, state) {
  video.pause();

  if (state.parked) {
    return;
  }

  state.parked = true;
  state.playBlocked = false;

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
 * @param {{ parked: boolean; playBlocked: boolean }} state
 */
function resetVideoPlayback(video, state) {
  state.parked = false;
  state.playBlocked = false;
  video.pause();
  video.currentTime = 0;
}

/**
 * @param {HTMLVideoElement} video
 */
function isVideoReadyToShow(video) {
  // HAVE_CURRENT_DATA = только первый кадр; Safari часто не стартует play без буфера.
  return video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
}

/**
 * @param {HTMLVideoElement} video
 * @param {{ parked: boolean; playBlocked: boolean }} state
 * @param {ReturnType<typeof createTvShowcasePlaybackDebug>} playbackDebug
 * @param {() => void} [onPlayBlocked]
 * @param {() => void} [onPlaySuccess]
 */
function requestVideoPlay(video, state, playbackDebug, onPlayBlocked, onPlaySuccess) {
  if (state.parked || video.ended) {
    parkVideoOnLastFrame(video, state);
    return;
  }

  if (!video.paused) {
    state.playBlocked = false;
    playbackDebug.clear();
    onPlaySuccess?.();
    return;
  }

  const playPromise = video.play();
  if (playPromise === undefined) {
    return;
  }

  playPromise
    .then(() => {
      state.playBlocked = false;
      playbackDebug.clear();
      onPlaySuccess?.();
    })
    .catch((err) => {
      state.playBlocked = true;
      playbackDebug.reportPlayError(err);
      onPlayBlocked?.();
    });
}

/**
 * @param {HTMLVideoElement} video
 * @param {'play' | 'pause' | 'reset'} action
 * @param {{ parked: boolean; playBlocked: boolean }} state
 * @param {ReturnType<typeof createTvShowcasePlaybackDebug>} playbackDebug
 * @param {() => void} onPlayBlocked
 */
function syncVideoPlayback(video, action, state, playbackDebug, onPlayBlocked) {
  if (action === 'reset') {
    resetVideoPlayback(video, state);
    return;
  }

  if (action === 'pause') {
    if (!state.parked) {
      video.pause();
    }
    return;
  }

  if (state.parked || video.ended) {
    parkVideoOnLastFrame(video, state);
    return;
  }

  const tryPlay = () => requestVideoPlay(video, state, playbackDebug, onPlayBlocked);

  if (isVideoReadyToShow(video)) {
    tryPlay();
    return;
  }

  video.addEventListener('canplay', tryPlay, { once: true });
}

/**
 * @param {number} progress
 * @param {boolean} wantsVideoEffective
 */
function shouldResetVideoProgress(progress, wantsVideoEffective) {
  const { videoStart, videoPrefetchStart } = TV_SHOWCASE_PROGRESS;

  if (progress < videoPrefetchStart) {
    return true;
  }

  if (wantsVideoEffective) {
    return false;
  }

  return progress < videoStart - VIDEO_DEACTIVATE_EPS;
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
 * @param {{ parked: boolean; playBlocked: boolean }} videoState
 * @param {ReturnType<typeof createTvShowcasePlaybackDebug>} playbackDebug
 * @param {() => void} onPlayBlocked
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
  playbackDebug,
  onPlayBlocked,
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

  let videoActivatedLocal = videoActivated;
  const isReady = isVideoReadyToShow(video);

  if (!videoActivatedLocal && wantsVideo && isReady) {
    videoActivatedLocal = true;
  }

  if (videoActivatedLocal && !wantsVideo && progress < videoStart - VIDEO_DEACTIVATE_EPS) {
    videoActivatedLocal = false;
  }

  const wantsVideoEffective = wantsVideo || videoActivatedLocal;
  const showVideo = wantsVideoEffective && isReady;
  const resetVideo = shouldResetVideoProgress(progress, wantsVideoEffective);

  const imageScale = lerp(1, imageLayout.scale, revealT);

  if (showVideo) {
    const videoLayout = measureLayout(media, img2, TV_SHOWCASE_VIDEO_STAGE_SCALE);
    stage.style.transform = `translate3d(${videoLayout.revealX}px, -50%, 0) scale(${TV_SHOWCASE_VIDEO_STAGE_SCALE})`;
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 0);
    setLayerOpacity(videoWrap, 1);
    syncVideoPlayback(video, 'play', videoState, playbackDebug, onPlayBlocked);
    return videoActivatedLocal;
  }

  const translateX = lerp(imageLayout.peekX, imageLayout.revealX, revealT);
  stage.style.transform = `translate3d(${translateX}px, -50%, 0) scale(${imageScale})`;

  setLayerOpacity(videoWrap, 0);
  syncVideoPlayback(video, resetVideo ? 'reset' : 'pause', videoState, playbackDebug, onPlayBlocked);

  if (wantsVideoEffective) {
    setLayerOpacity(img1, 0);
    setLayerOpacity(img2, 1);
    return videoActivatedLocal;
  }

  setLayerOpacity(img1, 1 - crossfadeT);
  setLayerOpacity(img2, crossfadeT);
  return videoActivatedLocal;
}

/**
 * @param {HTMLVideoElement} video
 * @param {{ parked: boolean; playBlocked: boolean }} videoState
 * @param {() => boolean} isVideoVisible
 * @param {ReturnType<typeof createTvShowcasePlaybackDebug>} playbackDebug
 */
function createPlayGestureUnlock(video, videoState, isVideoVisible, playbackDebug) {
  let attached = false;

  const detach = () => {
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('touchstart', onGesture, true);
    attached = false;
  };

  const onGesture = () => {
    if (!isVideoVisible()) {
      detach();
      return;
    }

    if (!videoState.playBlocked) {
      detach();
      return;
    }

    requestVideoPlay(video, videoState, playbackDebug, attachUnlock, detach);
  };

  const attachUnlock = () => {
    if (attached || !videoState.playBlocked) {
      return;
    }
    attached = true;
    document.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
    document.addEventListener('touchstart', onGesture, { capture: true, passive: true });
  };

  return attachUnlock;
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
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.playbackRate = TV_SHOWCASE_VIDEO_PLAYBACK_RATE;
  ensureVideoSource(video);

  const prefetchVideo = createVideoPrefetch(video);
  /** @type {import('gsap/ScrollTrigger').ScrollTrigger | null} */
  let pinScrollTrigger = null;
  let resizeAttached = false;
  let videoActivated = false;
  const videoState = { parked: false, playBlocked: false };
  const playbackDebug = createTvShowcasePlaybackDebug();

  playbackDebug.bindVideoElement(video);

  const isVideoVisible = () => videoWrap.classList.contains('is-visible');
  const attachPlayUnlock = createPlayGestureUnlock(
    video,
    videoState,
    isVideoVisible,
    playbackDebug,
  );

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
      playbackDebug,
      attachPlayUnlock,
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
      playbackDebug,
      attachPlayUnlock,
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

  prefetchVideo();
  attachScroll();
}
