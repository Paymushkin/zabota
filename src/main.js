import './styles/main.scss';
import { initLinks } from './modules/links.js';
import { initFaq } from './modules/faq.js';
import { initHeroGlitch } from './modules/hero-glitch.js';
import { initTypography } from './modules/typography.js';
import { initWhenNear } from './utils/defer-init.js';
import { initSmoothScroll } from './utils/smooth-scroll.js';
import { initViewportMode } from './utils/viewport.js';

function scheduleMetrika() {
  import('./metrika.js').then(({ initMetrika }) => initMetrika());
}

function initBelowFoldSections() {
  initWhenNear(
    '.tv-showcase',
    () => {
      import('./modules/tv-showcase.js').then(({ initTvShowcase }) => initTvShowcase());
    },
    '200% 0px',
  );

  initWhenNear('.scroll-steps', () => {
    import('./modules/scroll-steps.js').then(({ initScrollSteps }) => initScrollSteps());
  });
}

function init() {
  initViewportMode();
  initSmoothScroll();
  initLinks();
  initFaq();
  initTypography();

  initHeroGlitch();
  initBelowFoldSections();
  scheduleMetrika();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
