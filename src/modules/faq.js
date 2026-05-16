import { FAQ_ITEMS, FAQ_VISIBLE_COUNT } from '../data/faq.js';
import { renderFaqListHtml } from '../render/faq.js';

function setFaqItemOpen(item, open) {
  const button = item.querySelector('.faq__question');
  const answer = item.querySelector('.faq__answer');

  item.classList.toggle('faq__item_open', open);
  button.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open) {
    answer.removeAttribute('aria-hidden');
  } else {
    answer.setAttribute('aria-hidden', 'true');
  }
}

function renderFaq() {
  const list = document.getElementById('faq-list');
  const moreBtn = document.getElementById('faq-more');
  if (!list) return;

  list.innerHTML = renderFaqListHtml();

  if (moreBtn) {
    const hasHidden = FAQ_ITEMS.length > FAQ_VISIBLE_COUNT;
    moreBtn.classList.toggle('faq__more_hidden', !hasHidden);
    moreBtn.toggleAttribute('aria-hidden', !hasHidden);
  }
}

function bindFaqEvents() {
  const items = document.querySelectorAll('[data-faq-item]');
  const moreBtn = document.getElementById('faq-more');

  items.forEach((item) => {
    const button = item.querySelector('.faq__question');

    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('faq__item_open');

      items.forEach((other) => {
        if (other !== item) setFaqItemOpen(other, false);
      });

      setFaqItemOpen(item, !isOpen);
    });
  });

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      document.querySelectorAll('[data-faq-hidden]').forEach((item) => {
        item.classList.remove('faq__item_hidden');
      });
      moreBtn.classList.add('faq__more_hidden');
      moreBtn.setAttribute('aria-hidden', 'true');
      moreBtn.setAttribute('aria-expanded', 'true');
    });
  }
}

export function initFaq() {
  const list = document.getElementById('faq-list');
  if (!list) return;

  if (!list.children.length) {
    renderFaq();
  }

  bindFaqEvents();
}
