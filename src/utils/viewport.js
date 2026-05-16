const DESKTOP_MEDIA_QUERY = '(min-width: 980px)';

export function isDesktopViewport() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function syncViewportMode() {
  const desktop = isDesktopViewport();
  const page = document.querySelector('.page');
  const footer = document.querySelector('.footer');
  const stub = document.querySelector('.viewport-stub');
  const skipLink = document.querySelector('.skip-link');

  if (page) page.hidden = !desktop;
  if (footer) footer.hidden = !desktop;
  if (stub) stub.hidden = desktop;
  if (skipLink) skipLink.hidden = !desktop;
}

export function initViewportMode() {
  syncViewportMode();
  window.matchMedia(DESKTOP_MEDIA_QUERY).addEventListener('change', syncViewportMode);
}
