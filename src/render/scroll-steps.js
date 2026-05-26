import { SCROLL_STEPS_IMAGE_VERSION, SCROLL_STEPS_ITEMS } from '../data/scroll-steps.js';

function assetUrl(path) {
  const base = import.meta.env.BASE_URL;
  const url = `${base}${path.replace(/^\//, '')}`;
  return `${url}?v=${SCROLL_STEPS_IMAGE_VERSION}`;
}

export function renderScrollStepsCardsHtml() {
  return SCROLL_STEPS_ITEMS.map((item, index) => {
    const n = index + 1;
    const titleId = `scroll-steps-card-title-${n}`;

    return `
      <article
        class="scroll-steps__card"
        data-scroll-steps-card
        data-step-index="${index}"
        aria-labelledby="${titleId}"
      >
        <header class="scroll-steps__card-header">
          <div class="scroll-steps__card-heading">
            <p class="scroll-steps__badge">Шаг ${n}</p>
            <h3 class="scroll-steps__card-title" id="${titleId}">${item.title}</h3>
          </div>
          <p class="scroll-steps__card-note">${item.note}</p>
        </header>
        <div class="scroll-steps__card-media">
          <img
            class="scroll-steps__card-image"
            src="${assetUrl(item.image.src)}"
            alt="${item.image.alt}"
            width="${item.image.width}"
            height="${item.image.height}"
            loading="lazy"
            decoding="async"
          />
        </div>
      </article>
    `;
  }).join('');
}
