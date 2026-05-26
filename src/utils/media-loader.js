const DEFAULT_MAX_CONCURRENT = 3;

let maxConcurrent = DEFAULT_MAX_CONCURRENT;
let inFlight = 0;
/** @type {Array<() => void>} */
const waitQueue = [];

/**
 * @param {number} limit
 */
export function setMediaLoadConcurrency(limit) {
  maxConcurrent = Math.max(1, limit);
}

function acquireSlot() {
  if (inFlight < maxConcurrent) {
    inFlight += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    waitQueue.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function releaseSlot() {
  inFlight = Math.max(0, inFlight - 1);
  const next = waitQueue.shift();
  if (next) {
    next();
  }
}

/**
 * @param {() => void | Promise<void>} callback
 * @param {number} timeout
 */
export function runWhenIdle(callback, timeout = 2500) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      () => {
        void callback();
      },
      { timeout },
    );
    return;
  }

  window.setTimeout(() => {
    void callback();
  }, 1);
}

/**
 * Критичный ресурс (poster hero): без очереди, высокий приоритет.
 * @param {string} url
 */
export function loadImageCritical(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) {
      img.fetchPriority = 'high';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

/**
 * @param {string} url
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    void (async () => {
      await acquireSlot();
      const img = new Image();
      img.decoding = 'async';

      const done = () => {
        releaseSlot();
      };

      img.onload = () => {
        done();
        resolve(img);
      };
      img.onerror = () => {
        done();
        reject(new Error(`image failed: ${url}`));
      };
      img.src = url;
    })();
  });
}

/**
 * @param {{ count: number }} spec
 * @param {(index: number) => string} urlForIndex
 * @param {{ concurrency?: number; start?: number; end?: number }} options
 */
export async function loadSequenceBatched(spec, urlForIndex, options = {}) {
  const { concurrency = 2, start = 1, end = spec.count } = options;
  const length = end - start + 1;
  const results = new Array(length);
  let nextIndex = start;
  const workerCount = Math.min(concurrency, length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex <= end) {
      const index = nextIndex;
      nextIndex += 1;
      results[index - start] = await loadImage(urlForIndex(index));
    }
  });

  await Promise.all(workers);
  return results;
}
