import { fixHangingPrepositionsInElement } from '../utils/typography.js';

export function initTypography() {
  fixHangingPrepositionsInElement(document.querySelector('.page'));
  fixHangingPrepositionsInElement(document.querySelector('.footer'));
}
