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

/** Доля цикла, когда полоска «включена» (как steps(2) в CSS). */
const BLINK_ON_RATIO = 0.46;

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
      const phaseMs = Math.round((((i * 0.31) % 1.6) * 1000));
      const durationMs = Math.round((0.5 + (i % 8) * 0.14) * 1000);
      stripe.dataset.stripeOn = String(0.42 + (i % 5) * 0.09);
      stripe.dataset.stripeOff = String(0.06 + (i % 4) * 0.03);
      stripe.dataset.stripeDuration = String(durationMs);
      stripe.dataset.stripePhase = String(phaseMs);
    } else {
      stripe.style.setProperty('--stripe-static-base', String(0.22 + (i % 7) * 0.05));
    }

    container.appendChild(stripe);
  }
}

/**
 * JS-мигание полосок: надёжнее CSS @keyframes + custom properties (Windows/Chrome).
 *
 * @param {HTMLElement} container
 */
export function createHeroGlitchStripeBlinkLoop(container) {
  let rafId = 0;
  let running = false;

  const tick = (time) => {
    if (!running) {
      return;
    }

    const stripes = container.querySelectorAll('.hero-glitch__stripe--blink');

    stripes.forEach((stripe) => {
      const on = Number(stripe.dataset.stripeOn ?? 0.5);
      const off = Number(stripe.dataset.stripeOff ?? 0.1);
      const durationMs = Number(stripe.dataset.stripeDuration ?? 600);
      const phaseMs = Number(stripe.dataset.stripePhase ?? 0);
      const visibility = Number(stripe.style.getPropertyValue('--stripe-visibility') || 1);
      const soften = Number(stripe.style.getPropertyValue('--stripe-soften') || 1);

      const phase = ((time + phaseMs) % durationMs) / durationMs;
      const level = phase < BLINK_ON_RATIO ? on : off;
      stripe.style.opacity = String(level * visibility * soften);
    });

    rafId = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (running) {
        return;
      }
      running = true;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
  };
}
