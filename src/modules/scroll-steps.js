import { renderScrollStepsCardsHtml } from '../render/scroll-steps.js';
import { clamp, easeInOut, lerp } from '../utils/math.js';
import {
  createPinScrollTrigger,
  destroyPinScrollTrigger,
  refreshPinScrollTriggers,
} from '../utils/pin-scroll-trigger.js';
import { isPinPast } from '../utils/scroll-pin.js';
import { getScrollStepsSnapTarget } from '../utils/scroll-steps-snap.js';

const STEP_COUNT = 3;
const TRANSITION_COUNT = STEP_COUNT - 1;
const DESKTOP_MQ = '(min-width: 980px)';
/** Выглядывание из-под предыдущей карточки: 2-я — 60px, 3-я — 110px. */
const STACK_PEEK_Y = [0, 60, 110];
const STACK_PEEK_MAX = Math.max(...STACK_PEEK_Y);
/** Скролл на один переход между шагами (доля viewport). */
const SCROLL_PER_STEP_VH = 1;
const STACK_SCALES = [1, 0.95, 0.9];
const INACTIVE_OPACITY = 0.9;

function stackPose(depth) {
  const d = clamp(depth, 0, 2);
  return {
    scale: STACK_SCALES[d] ?? STACK_SCALES[STACK_SCALES.length - 1],
    y: -(STACK_PEEK_Y[d] ?? STACK_PEEK_Y[STACK_PEEK_Y.length - 1]),
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

/** Прозрачность всей карточки в стопке — скрывает текст следующих шагов сзади. */
function cardStackOpacity(cardProgress) {
  if (cardProgress >= 0) {
    return 1;
  }
  if (cardProgress > -1) {
    return lerp(INACTIVE_OPACITY, 1, easeInOut(1 + cardProgress));
  }
  return INACTIVE_OPACITY;
}

/**
 * Текст: 0 в глубине стопки; плавный вход при выходе на передний план;
 * плавный выход, когда активная карточка уезжает вниз.
 */
function cardTextOpacity(cardProgress) {
  if (cardProgress >= 1) {
    return 0;
  }
  if (cardProgress >= 0) {
    return 1 - easeInOut(cardProgress);
  }
  if (cardProgress > -1) {
    return easeInOut(1 + cardProgress);
  }
  return 0;
}

function applyPose(card, pose, hidden, cardOpacity = 1, textOpacity = 1) {
  card.style.transform = `translate(-50%, ${pose.y}px) scale(${pose.scale})`;
  card.style.zIndex = String(pose.z);
  card.style.opacity = hidden ? '0' : String(cardOpacity);
  card.style.setProperty('--scroll-steps-text-opacity', hidden ? '0' : String(textOpacity));
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
        1,
        cardTextOpacity(cardProgress),
      );
      return;
    }

    applyPose(
      card,
      stackPoseLerp(-cardProgress),
      false,
      cardStackOpacity(cardProgress),
      cardTextOpacity(cardProgress),
    );
  });
}

function clearCardStyles(card) {
  card.style.removeProperty('transform');
  card.style.removeProperty('z-index');
  card.style.removeProperty('opacity');
  card.style.removeProperty('--scroll-steps-text-opacity');
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

  const section = pin.closest('.scroll-steps');
  const desktopMq = window.matchMedia(DESKTOP_MQ);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** @type {import('gsap/ScrollTrigger').ScrollTrigger | null} */
  let pinScrollTrigger = null;
  let resizeAttached = false;

  const syncLayout = () => {
    const card = cards[0];
    if (!card) {
      return;
    }
    deck.style.minHeight = `${card.offsetHeight + STACK_PEEK_MAX}px`;

    const scrollTrack = TRANSITION_COUNT * window.innerHeight * SCROLL_PER_STEP_VH;
    const viewportHeight = window.innerHeight;
    const pinHeight = desktopMq.matches
      ? viewportHeight + scrollTrack
      : deck.offsetHeight + scrollTrack;

    pin.style.height = `${pinHeight}px`;
    section?.style.removeProperty('min-height');
  };

  const applyPastPinFrame = () => {
    cards.forEach((card, index) => {
      if (index === STEP_COUNT - 1) {
        applyPose(card, stackPose(0), false);
      } else {
        applyPose(card, exitPose(), true);
      }
    });
  };

  const handleProgress = (progress) => {
    if (isPinPast(pin)) {
      applyPastPinFrame();
      return;
    }

    applyScrollStepsFrame(cards, progress);
  };

  const refreshScroll = () => {
    syncLayout();
    refreshPinScrollTriggers();
    handleProgress(pinScrollTrigger?.progress ?? 0);
  };

  const onResize = () => {
    refreshScroll();
  };

  const mountScrollTrigger = () => {
    destroyPinScrollTrigger(pinScrollTrigger);
    syncLayout();
    pinScrollTrigger = createPinScrollTrigger({
      trigger: pin,
      reducedMotion: reducedMotion.matches,
      snapTo: getScrollStepsSnapTarget,
      onUpdate: handleProgress,
    });
  };

  const attachScroll = () => {
    mountScrollTrigger();
    if (!resizeAttached) {
      window.addEventListener('resize', onResize, { passive: true });
      resizeAttached = true;
    }
  };

  const detachScroll = () => {
    destroyPinScrollTrigger(pinScrollTrigger);
    pinScrollTrigger = null;
    if (resizeAttached) {
      window.removeEventListener('resize', onResize);
      resizeAttached = false;
    }
  };

  cards.forEach((card) => {
    card.querySelector('img')?.addEventListener('load', refreshScroll, { once: true });
  });

  const detachAll = () => {
    detachScroll();
    cards.forEach(clearCardStyles);
    deck.style.removeProperty('min-height');
    pin.style.removeProperty('height');
    section?.style.removeProperty('min-height');
  };

  const applyMode = () => {
    if (reducedMotion.matches) {
      detachAll();
      applyPastPinFrame();
    } else {
      attachScroll();
    }
  };

  reducedMotion.addEventListener('change', applyMode);
  desktopMq.addEventListener('change', () => {
    if (!reducedMotion.matches) {
      mountScrollTrigger();
      refreshScroll();
    }
  });
  applyMode();
}
