import './styles/scroll.scss';
import { initScrollHero } from './modules/scroll-hero.js';
import { initLinks } from './modules/links.js';
import { initFaq } from './modules/faq.js';
import { initSteps } from './modules/steps.js';
import { initTypography } from './modules/typography.js';
import { initViewportMode, isDesktopViewport } from './utils/viewport.js';

function scheduleMetrika() {
  import('./metrika.js').then(({ initMetrika }) => initMetrika());
}

function init() {
  initViewportMode();
  initScrollHero();

  if (!isDesktopViewport()) {
    return;
  }

  initLinks();
  initFaq();
  initSteps();
  initTypography();
  scheduleMetrika();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
