const DESKTOP_MEDIA_QUERY = '(min-width: 980px)';
const STABLE_VIEWPORT_CSS_VAR = '--app-svh';

let stableViewportHeight = 0;
let stableViewportWidth = 0;

function readViewportSize() {
  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight),
  };
}

function applyStableViewport(height, width) {
  stableViewportHeight = height;
  stableViewportWidth = width;
  document.documentElement.style.setProperty(STABLE_VIEWPORT_CSS_VAR, `${height / 100}px`);
}

function refreshStableViewport(force = false) {
  const { width, height } = readViewportSize();
  if (!stableViewportHeight || !stableViewportWidth) {
    applyStableViewport(height, width);
    return;
  }

  const widthChanged = Math.abs(width - stableViewportWidth) > 4;
  const majorHeightJump = Math.abs(height - stableViewportHeight) > 160;

  if (force || widthChanged || majorHeightJump) {
    applyStableViewport(height, width);
  }
}

export function isDesktopViewport() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function getStableViewportHeight() {
  if (!stableViewportHeight) {
    refreshStableViewport(true);
  }
  return stableViewportHeight || window.innerHeight;
}

export function syncViewportMode() {
  const page = document.querySelector('.page');
  const footer = document.querySelector('.footer');
  const stub = document.querySelector('.viewport-stub');
  const skipLink = document.querySelector('.skip-link');

  if (page) page.hidden = false;
  if (footer) footer.hidden = false;
  if (stub) stub.hidden = true;
  if (skipLink) skipLink.hidden = false;
}

export function initViewportMode() {
  refreshStableViewport(true);
  syncViewportMode();
  window.addEventListener('resize', () => refreshStableViewport(), { passive: true });
  window.addEventListener('orientationchange', () => refreshStableViewport(true), { passive: true });
  window.addEventListener('pageshow', () => refreshStableViewport(true), { passive: true });
  window.matchMedia(DESKTOP_MEDIA_QUERY).addEventListener('change', syncViewportMode);
}
