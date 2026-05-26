/**
 * @param {() => void | Promise<void>} callback
 * @param {number} timeout
 */
export function runWhenIdle(callback, timeout = 2500) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      void callback();
    }, { timeout });
    return;
  }

  window.setTimeout(() => {
    void callback();
  }, 1);
}

/**
 * @param {string} url
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

/**
 * @param {{ count: number }} spec
 * @param {(index: number) => string} urlForIndex
 * @param {{ concurrency?: number, start?: number, end?: number }} options
 */
export async function loadSequenceBatched(spec, urlForIndex, options = {}) {
  const { concurrency = 6, start = 1, end = spec.count } = options;
  const length = end - start + 1;
  const results = new Array(length);
  let nextIndex = start;

  const workers = Array.from({ length: concurrency }, async () => {
    while (nextIndex <= end) {
      const index = nextIndex;
      nextIndex += 1;
      results[index - start] = await loadImage(urlForIndex(index));
    }
  });

  await Promise.all(workers);
  return results;
}
