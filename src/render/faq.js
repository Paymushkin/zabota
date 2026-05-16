import { FAQ_ICON } from '../assets/icons.js';
import { FAQ_ITEMS, FAQ_VISIBLE_COUNT } from '../data/faq.js';
export function renderFaqListHtml() {
  return FAQ_ITEMS.map((item, index) => {
    const n = index + 1;
    const isOpen = index === 0;
    const isHidden = index >= FAQ_VISIBLE_COUNT;

    return `
      <li class="faq__item${isOpen ? ' faq__item_open' : ''}${isHidden ? ' faq__item_hidden' : ''}" data-faq-item${isHidden ? ' data-faq-hidden' : ''}>
        <button
          class="faq__question"
          type="button"
          aria-expanded="${isOpen ? 'true' : 'false'}"
          aria-controls="faq-answer-${n}"
          id="faq-question-${n}"
        >
          <span class="faq__question-text">${item.question}</span>
          ${FAQ_ICON}
        </button>
        <div class="faq__answer" id="faq-answer-${n}" role="region" aria-labelledby="faq-question-${n}"${isOpen ? '' : ' aria-hidden="true"'}>
          <div class="faq__answer-inner">${item.answer}</div>
        </div>
      </li>
    `;
  }).join('');
}
