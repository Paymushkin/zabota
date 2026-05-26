/**
 * @param {string} selector
 * @param {() => void | Promise<void>} initFn
 * @param {string} rootMargin
 */
export function initWhenNear(selector, initFn, rootMargin = '120% 0px') {
  const target = document.querySelector(selector);
  if (!target) {
    return;
  }

  let started = false;
  const run = () => {
    if (started) {
      return;
    }
    started = true;
    void initFn();
  };

  if (!('IntersectionObserver' in window)) {
    run();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        run();
      }
    },
    { rootMargin },
  );

  observer.observe(target);
}
