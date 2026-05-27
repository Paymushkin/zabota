const LOG_PREFIX = '[tv-showcase · gif]';

/**
 * Только ошибка загрузки файла: короткий warn + красная метка.
 */
export function createTvShowcasePlaybackDebug() {
  /** @type {HTMLElement | null} */
  let marker = null;
  let lastLogKey = '';

  const ensureMarker = () => {
    if (marker) {
      return marker;
    }

    marker = document.createElement('div');
    marker.className = 'tv-showcase-playback-error';
    marker.setAttribute('role', 'status');
    marker.setAttribute('aria-label', 'Ошибка загрузки gif tv-showcase');
    marker.title = 'Ошибка загрузки (см. консоль)';
    document.body.appendChild(marker);
    return marker;
  };

  /**
   * @param {HTMLImageElement} img
   */
  const bindMotionImage = (img) => {
    img.addEventListener('error', () => {
      const src = img.currentSrc || img.src || '';
      if (!src || src === `${window.location.origin}/`) {
        return;
      }
      const logKey = src;
      if (logKey === lastLogKey) {
        return;
      }
      lastLogKey = logKey;

      console.warn(`${LOG_PREFIX} не загрузился: ${src}`);
      ensureMarker().classList.add('is-visible');
    });
  };

  const clear = () => {
    lastLogKey = '';
    marker?.classList.remove('is-visible');
  };

  return {
    bindMotionImage,
    clear,
  };
}
