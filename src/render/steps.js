import { STEPS_ITEMS } from '../data/steps.js';
import { stripHtmlPlain } from '../utils/dom.js';

export function renderStepsTablistHtml() {
  return STEPS_ITEMS.map((item, index) => {
    const n = index + 1;
    const selected = index === 0;

    return `
      <li class="steps__item${selected ? ' steps__item_active' : ''}" role="presentation">
        <button
          class="steps__tab"
          type="button"
          role="tab"
          id="steps-tab-${n}"
          aria-selected="${selected ? 'true' : 'false'}"
          aria-controls="steps-panel-${n}"
          tabindex="${selected ? '0' : '-1'}"
          aria-label="${stripHtmlPlain(item.title)}"
        >
          <img
            class="steps__number"
            src="${item.number.src}"
            alt=""
            width="${item.number.width}"
            height="${item.number.height}"
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
          <span class="steps__item-title">${item.title}</span>
        </button>
      </li>
    `;
  }).join('');
}

export function renderStepsPanelsHtml() {
  return STEPS_ITEMS.map((item, index) => {
    const n = index + 1;
    const active = index === 0;

    return `
      <div
        class="steps__panel"
        id="steps-panel-${n}"
        role="tabpanel"
        aria-labelledby="steps-tab-${n}"
        ${active ? '' : 'hidden'}
      >
        <p class="steps__note">${item.note}</p>
        <div class="steps__media">
          <img
            class="steps__image"
            src="${item.image.src}"
            alt="${item.image.alt}"
            width="${item.image.width}"
            height="${item.image.height}"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    `;
  }).join('');
}
