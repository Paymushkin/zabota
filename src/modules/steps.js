import { renderStepsPanelsHtml, renderStepsTablistHtml } from '../render/steps.js';

/** @type {WeakMap<HTMLElement, (event: TransitionEvent) => void>} */
const panelHideHandlers = new WeakMap();

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {HTMLElement} panel
 */
function clearPanelHideHandler(panel) {
  const handler = panelHideHandlers.get(panel);
  if (!handler) {
    return;
  }
  panel.removeEventListener('transitionend', handler);
  panelHideHandlers.delete(panel);
}

/**
 * @param {HTMLElement} panel
 * @param {boolean} instant
 */
function showStepsPanel(panel, instant = false) {
  clearPanelHideHandler(panel);
  panel.removeAttribute('hidden');

  if (instant || prefersReducedMotion()) {
    panel.classList.add('is-active');
    return;
  }

  requestAnimationFrame(() => {
    panel.classList.add('is-active');
  });
}

/**
 * @param {HTMLElement} panel
 * @param {boolean} instant
 */
function hideStepsPanel(panel, instant = false) {
  clearPanelHideHandler(panel);
  panel.classList.remove('is-active');

  if (instant || prefersReducedMotion()) {
    panel.setAttribute('hidden', '');
    return;
  }

  /** @param {TransitionEvent} event */
  const onTransitionEnd = (event) => {
    if (event.target !== panel || event.propertyName !== 'opacity') {
      return;
    }

    clearPanelHideHandler(panel);
    panel.setAttribute('hidden', '');
  };

  panelHideHandlers.set(panel, onTransitionEnd);
  panel.addEventListener('transitionend', onTransitionEnd);
}

function setStepsTabActive(index) {
  const tablist = document.getElementById('steps-tablist');
  const panels = document.getElementById('steps-panels');
  if (!tablist || !panels) {
    return;
  }

  const tabs = tablist.querySelectorAll('[role="tab"]');
  const panelEls = panels.querySelectorAll('[role="tabpanel"]');
  const instant = prefersReducedMotion();

  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
    tab.closest('.steps__item')?.classList.toggle('steps__item_active', selected);
  });

  panelEls.forEach((panel, i) => {
    const selected = i === index;

    if (selected) {
      showStepsPanel(panel, instant);
      return;
    }

    if (panel.classList.contains('is-active')) {
      hideStepsPanel(panel, instant);
      return;
    }

    panel.classList.remove('is-active');
    panel.setAttribute('hidden', '');
  });
}

function renderSteps() {
  const tablist = document.getElementById('steps-tablist');
  const panels = document.getElementById('steps-panels');
  if (!tablist || !panels) {
    return;
  }

  tablist.innerHTML = renderStepsTablistHtml();
  panels.innerHTML = renderStepsPanelsHtml();
}

function bindStepsEvents() {
  const tablist = document.getElementById('steps-tablist');
  if (!tablist) {
    return;
  }

  tablist.addEventListener('click', (event) => {
    const item = event.target.closest('.steps__item');
    if (!item || item.parentElement !== tablist) {
      return;
    }

    const index = [...tablist.children].indexOf(item);
    if (index !== -1) {
      setStepsTabActive(index);
    }
  });

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tabs.forEach((tab, index) => {
    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      setStepsTabActive(nextIndex);
      tabs[nextIndex].focus();
    });
  });
}

export function initSteps() {
  const tablist = document.getElementById('steps-tablist');
  const panels = document.getElementById('steps-panels');
  if (!tablist || !panels) {
    return;
  }

  if (!tablist.children.length) {
    renderSteps();
  }

  bindStepsEvents();
}
