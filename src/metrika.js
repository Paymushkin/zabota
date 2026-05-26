const METRIKA_OPTIONS = {
  params: {},
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: false,
  ssr: true,
};

const COUNTERS = [99737989, 44830285];

function loadMetrika() {
  if (!document.querySelector('link[data-metrika-preconnect]')) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://mc.yandex.ru';
    preconnect.crossOrigin = 'anonymous';
    preconnect.dataset.metrikaPreconnect = '';
    document.head.appendChild(preconnect);
  }

  COUNTERS.forEach((id) => {
    window.ym =
      window.ym ||
      function ym(...args) {
        (window.ym.a = window.ym.a || []).push(args);
      };
    window.ym.l = window.ym.l || Date.now();
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTERS[0]}`;
  script.onerror = () => {
    script.remove();
  };
  document.head.appendChild(script);

  script.onload = () => {
    COUNTERS.forEach((id) => window.ym(id, 'init', METRIKA_OPTIONS));
  };
}

export function initMetrika() {
  let loaded = false;

  const run = () => {
    if (loaded) return;
    loaded = true;
    loadMetrika();
  };

  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
    window.addEventListener(event, run, { once: true, passive: true });
  });

  window.addEventListener(
    'load',
    () => {
      setTimeout(run, 12000);
    },
    { once: true },
  );
}
