import { LINKS } from '../config/links.js';

export function initLinks() {
  document.querySelectorAll('[data-link]').forEach((el) => {
    const key = el.dataset.link;
    if (LINKS[key]) {
      el.href = LINKS[key];
    }

    if (!el.href || el.href === '#' || el.href.endsWith('#')) return;

    try {
      const url = new URL(el.href, window.location.href);
      if (url.origin !== window.location.origin) {
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
    } catch {
      // ignore invalid URLs
    }
  });
}
