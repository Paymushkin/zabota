import './styles/main.scss';
import { initLinks } from './modules/links.js';
import { initFaq } from './modules/faq.js';
import { initSteps } from './modules/steps.js';
import { initTypography } from './modules/typography.js';

function scheduleMetrika() {
  import('./metrika.js').then(({ initMetrika }) => initMetrika());
}

function init() {
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
