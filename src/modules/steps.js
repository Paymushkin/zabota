import { renderStepsPanelsHtml, renderStepsTablistHtml } from '../render/steps.js';

function setStepsTabActive(index) {
  const tablist = document.getElementById('steps-tablist');
  const panels = document.getElementById('steps-panels');
  if (!tablist || !panels) return;

  const tabs = tablist.querySelectorAll('[role="tab"]');
  const panelEls = panels.querySelectorAll('[role="tabpanel"]');

  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
    tab.closest('.steps__item')?.classList.toggle('steps__item_active', selected);
  });

  panelEls.forEach((panel, i) => {
    panel.toggleAttribute('hidden', i !== index);
  });
}

function renderSteps() {
  const tablist = document.getElementById('steps-tablist');
  const panels = document.getElementById('steps-panels');
  if (!tablist || !panels) return;

  tablist.innerHTML = renderStepsTablistHtml();
  panels.innerHTML = renderStepsPanelsHtml();
}

function bindStepsEvents() {
  const tablist = document.getElementById('steps-tablist');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setStepsTabActive(index));

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

      if (nextIndex === null) return;

      event.preventDefault();
      setStepsTabActive(nextIndex);
      tabs[nextIndex].focus();
    });
  });
}

export function initSteps() {
  const tablist = document.getElementById('steps-tablist');
  const panels = document.getElementById('steps-panels');
  if (!tablist || !panels) return;

  if (!tablist.children.length) {
    renderSteps();
  }

  bindStepsEvents();
}
