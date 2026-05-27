const LOG_PREFIX = '[tv-showcase · видео]';
const MEDIA_ERROR_LABELS = {
  1: 'загрузка прервана (MEDIA_ERR_ABORTED)',
  2: 'ошибка сети (MEDIA_ERR_NETWORK)',
  3: 'ошибка декодирования (MEDIA_ERR_DECODE)',
  4: 'формат или адрес файла не поддерживается (MEDIA_ERR_SRC_NOT_SUPPORTED)',
};

/**
 * @param {unknown} err
 */
function formatErrorDetail(err) {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  if (err == null) {
    return 'неизвестная ошибка';
  }
  return String(err);
}

/**
 * Индикатор ошибки воспроизведения + понятные логи в консоль (для отладки на проде).
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
    marker.setAttribute('aria-label', 'Ошибка воспроизведения видео в блоке tv-showcase');
    marker.title = 'Ошибка воспроизведения видео (см. консоль разработчика)';
    document.body.appendChild(marker);
    return marker;
  };

  /**
   * @param {string} title
   * @param {unknown} [detail]
   * @param {Record<string, unknown>} [extra]
   */
  const report = (title, detail, extra) => {
    const detailText = formatErrorDetail(detail);
    const logKey = `${title}|${detailText}|${JSON.stringify(extra ?? {})}`;

    if (logKey !== lastLogKey) {
      lastLogKey = logKey;
      console.error(`${LOG_PREFIX} ${title}`);
      console.error(`${LOG_PREFIX} Причина: ${detailText}`);
      if (extra && Object.keys(extra).length > 0) {
        console.error(`${LOG_PREFIX} Данные:`, extra);
      }
      console.info(
        `${LOG_PREFIX} Как открыть консоль: Safari → «Настройки» → «Дополнения» → включить «Меню “Разработка”», затем «Разработка» → «Показать веб-инспектор» → вкладка «Консоль». В Chrome: правый клик → «Просмотреть код» → «Console».`,
      );
    }

    ensureMarker().classList.add('is-visible');
  };

  const clear = () => {
    lastLogKey = '';
    marker?.classList.remove('is-visible');
  };

  /**
   * @param {HTMLVideoElement} video
   */
  const bindVideoElement = (video) => {
    video.addEventListener('error', () => {
      const code = video.error?.code ?? 0;
      report('Видеофайл не загрузился или не воспроизводится', MEDIA_ERROR_LABELS[code] ?? 'неизвестный код', {
        src: video.currentSrc || video.src,
        code,
        readyState: video.readyState,
        networkState: video.networkState,
      });
    });
  };

  /**
   * @param {unknown} err
   */
  const reportPlayError = (err) => {
    report(
      'Не удалось запустить воспроизведение (команда video.play)',
      err,
      {
        hint: 'В Safari часто нужен жест пользователя (клик по странице) или дождитесь загрузки файла.',
      },
    );
  };

  return {
    report,
    reportPlayError,
    clear,
    bindVideoElement,
  };
}
