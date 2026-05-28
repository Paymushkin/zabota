import { FAQ_ITEMS, FAQ_VISIBLE_COUNT } from '../data/faq.js';
import { renderFaqListHtml } from '../render/faq.js';
import { refreshSmoothScrollLayout } from '../utils/smooth-scroll.js';

const FAQ_MORE_LABEL_EXPAND = 'Показать ещё';
const FAQ_MORE_LABEL_COLLAPSE = 'Свернуть';

function setFaqMoreExpanded(moreBtn, expanded) {
  moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  moreBtn.textContent = expanded ? FAQ_MORE_LABEL_COLLAPSE : FAQ_MORE_LABEL_EXPAND;
}

function setFaqListExpanded(expanded) {
  document.querySelectorAll('[data-faq-hidden]').forEach((item) => {
    item.classList.toggle('faq__item_hidden', !expanded);
  });
}

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
  const card = document.querySelector('.faq__card');
  let refreshRafId = 0;

  const scheduleScrollRefresh = () => {
    if (refreshRafId) {
      cancelAnimationFrame(refreshRafId);
    }

    // Ждём применения классов/transition, затем пересчитываем лимиты Lenis и pin/end.
    refreshRafId = requestAnimationFrame(() => {
      refreshRafId = 0;
      refreshSmoothScrollLayout();
    });
  };

  if (card && 'ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      scheduleScrollRefresh();
    });
    observer.observe(card);
  }

  items.forEach((item) => {
    const button = item.querySelector('.faq__question');
    const answer = item.querySelector('.faq__answer');

    answer.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'grid-template-rows') {
        scheduleScrollRefresh();
      }
    });

    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('faq__item_open');

      items.forEach((other) => {
        if (other !== item) setFaqItemOpen(other, false);
      });

      setFaqItemOpen(item, !isOpen);
      // Fallback на случай, если ResizeObserver недоступен/задержался.
      scheduleScrollRefresh();
    });
  });

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      const expanded = moreBtn.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !expanded;

      setFaqListExpanded(nextExpanded);
      setFaqMoreExpanded(moreBtn, nextExpanded);
      // Fallback на случай, если ResizeObserver недоступен/задержался.
      scheduleScrollRefresh();
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
