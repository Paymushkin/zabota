const STRIPE_COLORS = [
  '#ffffff',
  '#66eeff',
  '#ffdd44',
  '#ff5555',
  '#99ccff',
  '#66ff88',
  '#00eeff',
  '#ff9933',
];

const STRIPE_COUNT = 42;

/**
 * @param {HTMLElement} container
 */
export function buildHeroGlitchStripes(container) {
  if (container.dataset.built === '1') {
    return;
  }

  container.dataset.built = '1';
  container.replaceChildren();

  for (let i = 0; i < STRIPE_COUNT; i += 1) {
    const stripe = document.createElement('div');
    const isBlink = (i * 7 + 3) % 10 < 6;

    stripe.className = isBlink
      ? 'hero-glitch__stripe hero-glitch__stripe--blink'
      : 'hero-glitch__stripe hero-glitch__stripe--static';

    const leftPct = (i / Math.max(1, STRIPE_COUNT - 1)) * 76;
    const width = i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1;

    stripe.style.left = `${leftPct}%`;
    stripe.style.width = `${width}px`;
    stripe.style.backgroundColor = STRIPE_COLORS[i % STRIPE_COLORS.length];

    if (isBlink) {
      const delay = ((i * 0.31) % 1.6).toFixed(2);
      const duration = (0.5 + (i % 8) * 0.14).toFixed(2);
      stripe.style.setProperty('--stripe-delay', `${delay}s`);
      stripe.style.setProperty('--stripe-duration', `${duration}s`);
      stripe.style.setProperty('--stripe-on', String(0.42 + (i % 5) * 0.09));
      stripe.style.setProperty('--stripe-off', String(0.06 + (i % 4) * 0.03));
    } else {
      stripe.style.setProperty('--stripe-static-base', String(0.22 + (i % 7) * 0.05));
    }

    container.appendChild(stripe);
  }
}
