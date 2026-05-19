import { renderScrollStepsCardsHtml } from '../render/scroll-steps.js';

const STEP_COUNT = 3;
const TRANSITION_COUNT = STEP_COUNT - 1;
const PAST_PIN_EPS = 2;
/** Вертикальный шаг стопки: больше — сильнее выглядывают задние карточки сверху. */
const STACK_OFFSET_Y = 84;
const STACK_SCALES = [1, 0.95, 0.9];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function stackPose(depth) {
  const d = clamp(depth, 0, 2);
  return {
    scale: STACK_SCALES[d] ?? STACK_SCALES[STACK_SCALES.length - 1],
    y: -d * STACK_OFFSET_Y,
    z: 3 - d,
  };
}

/** Плавная поза в стопке для дробной «глубины» (симметрично при скролле вверх). */
function stackPoseLerp(depth) {
  const d = clamp(depth, 0, 2);
  const d0 = Math.floor(d);
  const d1 = Math.min(2, d0 + 1);
  const localT = d - d0;
  const p0 = stackPose(d0);
  const p1 = stackPose(d1);

  return {
    scale: lerp(p0.scale, p1.scale, localT),
    y: lerp(p0.y, p1.y, localT),
    z: Math.round(lerp(p0.z, p1.z, localT)),
  };
}

function exitPose() {
  return {
    scale: 1.03,
    y: window.innerHeight * 0.92,
    z: 4,
  };
}

function applyPose(card, pose, hidden) {
  card.style.transform = `translate(-50%, ${pose.y}px) scale(${pose.scale})`;
  card.style.zIndex = String(pose.z);
  card.style.opacity = hidden ? '0' : '1';
  card.style.visibility = hidden ? 'hidden' : 'visible';
  card.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

/**
 * Непрерывная фаза карточки: activeFloat 0…2.
 * cardProgress < 0 — в стопке сзади; 0…1 — уход вниз; >= 1 — скрыта.
 */
function applyScrollStepsFrame(cards, progress) {
  const activeFloat = progress * TRANSITION_COUNT;

  cards.forEach((card, index) => {
    const cardProgress = activeFloat - index;

    if (cardProgress >= 1) {
      applyPose(card, exitPose(), true);
      return;
    }

    if (cardProgress >= 0) {
      applyPose(
        card,
        {
          scale: lerp(stackPose(0).scale, exitPose().scale, cardProgress),
          y: lerp(stackPose(0).y, exitPose().y, cardProgress),
          z: 3,
        },
        false,
      );
      return;
    }

    applyPose(card, stackPoseLerp(-cardProgress), false);
  });
}

function clearCardStyles(card) {
  card.style.removeProperty('transform');
  card.style.removeProperty('z-index');
  card.style.removeProperty('opacity');
  card.style.removeProperty('visibility');
  card.removeAttribute('aria-hidden');
}

export function initScrollSteps() {
  const pin = document.querySelector('[data-scroll-steps-pin]');
  const deck = document.querySelector('[data-scroll-steps-deck]');
  if (!pin || !deck) {
    return;
  }

  deck.innerHTML = renderScrollStepsCardsHtml();
  const cards = [...deck.querySelectorAll('[data-scroll-steps-card]')];
  if (cards.length !== STEP_COUNT) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;
  let listenersAttached = false;

  const applyPastPinFrame = () => {
    cards.forEach((card, index) => {
      if (index === STEP_COUNT - 1) {
        applyPose(card, stackPose(0), false);
      } else {
        applyPose(card, exitPose(), true);
      }
    });
  };

  const update = () => {
    ticking = false;
    const scrollRange = pin.offsetHeight - window.innerHeight;
    const pinRect = pin.getBoundingClientRect();
    const pastPin = pinRect.bottom <= window.innerHeight + PAST_PIN_EPS;
    const progress = scrollRange <= 0 ? 0 : clamp(-pinRect.top / scrollRange, 0, 1);

    if (pastPin) {
      applyPastPinFrame();
      return;
    }

    applyScrollStepsFrame(cards, progress);
  };

  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  const attach = () => {
    if (listenersAttached) {
      return;
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    listenersAttached = true;
    schedule();
  };

  const detach = () => {
    if (!listenersAttached) {
      return;
    }
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    listenersAttached = false;
    cards.forEach(clearCardStyles);
  };

  const applyMode = () => {
    if (reducedMotion.matches) {
      detach();
    } else {
      attach();
    }
  };

  reducedMotion.addEventListener('change', applyMode);
  applyMode();
}
