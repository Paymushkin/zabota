const SPRITE_URL = '/redis.webp';
const SPRITE_GRID = 10;
const SPRITE_FRAMES = 100;
const SPRITE_MAX_PX = 160;
const PAST_PIN_EPS = 2;
/** Подъём стартовой и финальной точки дуги (нижние углы) от нижнего края hero, px. */
const SPRITE_ARC_ENDPOINT_LIFT_PX = 48;
/** Подъём вершины дуги (центральная часть выше), px от верхнего padding. */
const SPRITE_ARC_MID_EXTRA_LIFT_PX = 420;
/** Базовый размер как сейчас; на краях pin +50%, в середине +100% (плавно). */
const SPRITE_SIZE_MULT_EDGE = 1.5;
const SPRITE_SIZE_MULT_PEAK = 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parsePanelCount(pin) {
  const raw = pin.dataset.scrollHeroPanels;
  const n = raw ? Number.parseInt(raw, 10) : 3;
  return Number.isFinite(n) && n >= 2 ? n : 3;
}

/**
 * @param {HTMLElement | null} spriteEl
 * @param {(sheet: null | { frameW: number; frameH: number; scale: number; bgW: number; bgH: number }) => void} onReady
 */
function loadSpriteSheet(spriteEl, onReady) {
  if (!spriteEl) {
    onReady(null);
    return;
  }

  const img = new Image();
  img.onload = () => {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) {
      onReady(null);
      return;
    }

    const frameW = nw / SPRITE_GRID;
    const frameH = nh / SPRITE_GRID;
    const scale = Math.min(1, SPRITE_MAX_PX / Math.max(frameW, frameH));
    const dispW = frameW * scale;
    const dispH = frameH * scale;

    spriteEl.style.backgroundImage = `url("${SPRITE_URL}")`;
    spriteEl.style.backgroundRepeat = 'no-repeat';
    spriteEl.style.width = `${dispW * SPRITE_SIZE_MULT_EDGE}px`;
    spriteEl.style.height = `${dispH * SPRITE_SIZE_MULT_EDGE}px`;

    onReady({
      frameW,
      frameH,
      scale,
      bgW: nw * scale,
      bgH: nh * scale,
      baseDisplayW: dispW,
      baseDisplayH: dispH,
    });
  };

  img.onerror = () => onReady(null);
  img.src = SPRITE_URL;
}

/**
 * Плавный множитель размера: t=0 и t=1 → +50%, t=0.5 → +100%.
 * @param {number} t progress 0…1
 */
function spriteSizeMult(t) {
  return SPRITE_SIZE_MULT_EDGE + (SPRITE_SIZE_MULT_PEAK - SPRITE_SIZE_MULT_EDGE) * Math.sin(Math.PI * t);
}

function applySpriteFrame(spriteEl, sheet, frameIndex, sizeMult = 1) {
  if (!sheet) {
    return;
  }

  const idx = clamp(Math.floor(frameIndex), 0, SPRITE_FRAMES - 1);
  const col = idx % SPRITE_GRID;
  const row = Math.floor(idx / SPRITE_GRID);
  const { frameW, frameH, scale, bgW, bgH } = sheet;
  const m = sizeMult;

  spriteEl.style.width = `${sheet.baseDisplayW * m}px`;
  spriteEl.style.height = `${sheet.baseDisplayH * m}px`;
  spriteEl.style.backgroundSize = `${bgW * m}px ${bgH * m}px`;
  spriteEl.style.backgroundPosition = `${-col * frameW * scale * m}px ${-row * frameH * scale * m}px`;
}

function clearSpriteExitStyles(spriteEl) {
  spriteEl.style.position = '';
  spriteEl.style.left = '';
  spriteEl.style.top = '';
  spriteEl.style.right = '';
  spriteEl.style.bottom = '';
  spriteEl.style.transform = '';
  spriteEl.style.opacity = '';
  spriteEl.style.visibility = '';
  spriteEl.style.zIndex = '';
}

function readHeroPaddingPx(hero) {
  const raw = getComputedStyle(hero).getPropertyValue('--section-padding').trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 100;
}

/**
 * Квадратичная кривая Безье: P0 → P1 → P2, t ∈ [0, 1].
 * @param {number} t
 * @param {number} p0
 * @param {number} p1
 * @param {number} p2
 */
function bezierQuad(t, p0, p1, p2) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * Вертикальный скролл двигает горизонтальный трек внутри sticky-блока.
 * Процент translate относится к ширине трека (width = n × ширина контейнера).
 */
export function initScrollHero() {
  const pin = document.querySelector('[data-scroll-hero-pin]');
  const track = document.querySelector('[data-scroll-hero-track]');
  const spriteEl = document.querySelector('[data-scroll-hero-sprite]');

  if (!pin || !track) {
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panels = parsePanelCount(pin);

  /** @type {null | { frameW: number; frameH: number; scale: number; bgW: number; bgH: number; baseDisplayW: number; baseDisplayH: number }} */
  let spriteSheet = null;
  let spriteFrozenFrame = 0;

  let ticking = false;
  let listenersAttached = false;

  const update = () => {
    ticking = false;
    const scrollRange = pin.offsetHeight - window.innerHeight;
    const pinRect = pin.getBoundingClientRect();
    const top = pinRect.top;
    const progress = scrollRange <= 0 ? 0 : clamp(-top / scrollRange, 0, 1);
    const fraction = ((panels - 1) / panels) * 100;
    const xPct = -progress * fraction;
    track.style.transform = `translate3d(${xPct}%, 0, 0)`;

    if (!spriteEl || !spriteSheet || reducedMotion.matches) {
      return;
    }

    const pastPin = pinRect.bottom <= window.innerHeight + PAST_PIN_EPS;

    if (!pastPin) {
      spriteEl.style.position = 'absolute';
      spriteEl.style.right = 'auto';
      spriteEl.style.bottom = 'auto';
      spriteEl.style.transform = '';
      spriteEl.style.opacity = '';
      spriteEl.style.visibility = '';
      spriteEl.style.zIndex = '';

      const sizeMult = spriteSizeMult(progress);

      const hero = spriteEl.closest('.scroll-hero');
      if (hero) {
        const pad = readHeroPaddingPx(hero);
        const W = hero.clientWidth;
        const H = hero.clientHeight;
        const sw = spriteSheet.baseDisplayW * sizeMult;
        const sh = spriteSheet.baseDisplayH * sizeMult;
        const t = progress;
        const yBottom = H - pad - sh - SPRITE_ARC_ENDPOINT_LIFT_PX;
        const x0 = pad;
        const y0 = yBottom;
        const x1 = W / 2 - sw / 2;
        // Вершина дуги: выше = меньше y. Не clamp к 4 — иначе при pad ~100 любой EXTRA > 96 даёт одно и то же y1=4.
        const y1 = pad - SPRITE_ARC_MID_EXTRA_LIFT_PX;
        const x2 = W - pad - sw;
        const y2 = yBottom;
        const x = bezierQuad(t, x0, x1, x2);
        const y = bezierQuad(t, y0, y1, y2);
        spriteEl.style.left = `${x}px`;
        spriteEl.style.top = `${y}px`;
      }

      spriteFrozenFrame = Math.min(SPRITE_FRAMES - 1, Math.floor(progress * SPRITE_FRAMES));
      applySpriteFrame(spriteEl, spriteSheet, progress * SPRITE_FRAMES, sizeMult);
      return;
    }

    spriteFrozenFrame = Math.min(SPRITE_FRAMES - 1, Math.floor(progress * SPRITE_FRAMES));

    spriteEl.style.position = 'absolute';
    spriteEl.style.right = 'auto';
    spriteEl.style.bottom = 'auto';
    spriteEl.style.transform = '';
    spriteEl.style.opacity = '';
    spriteEl.style.visibility = '';
    spriteEl.style.zIndex = '';

    const m = SPRITE_SIZE_MULT_EDGE;
    const hero = spriteEl.closest('.scroll-hero');
    if (hero) {
      const pad = readHeroPaddingPx(hero);
      const W = hero.clientWidth;
      const H = hero.clientHeight;
      const sw = spriteSheet.baseDisplayW * m;
      const sh = spriteSheet.baseDisplayH * m;
      const yBottom = H - pad - sh - SPRITE_ARC_ENDPOINT_LIFT_PX;
      spriteEl.style.left = `${W - pad - sw}px`;
      spriteEl.style.top = `${yBottom}px`;
    }

    applySpriteFrame(spriteEl, spriteSheet, spriteFrozenFrame, m);
  };

  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  loadSpriteSheet(spriteEl, (sheet) => {
    spriteSheet = sheet;
    if (listenersAttached && spriteEl && sheet && !reducedMotion.matches) {
      schedule();
    }
  });

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
    track.style.removeProperty('transform');
    if (spriteEl) {
      clearSpriteExitStyles(spriteEl);
    }
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
