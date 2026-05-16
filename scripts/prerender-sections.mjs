import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderFaqListHtml } from '../src/render/faq.js';
import { renderStepsPanelsHtml, renderStepsTablistHtml } from '../src/render/steps.js';

const OUT_DIR = join(import.meta.dirname, '..', 'src', 'sections', 'generated');

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(join(OUT_DIR, 'faq-list.html'), renderFaqListHtml().trim());
writeFileSync(join(OUT_DIR, 'steps-tablist.html'), renderStepsTablistHtml().trim());
writeFileSync(join(OUT_DIR, 'steps-panels.html'), renderStepsPanelsHtml().trim());

console.log('Sections prerendered to src/sections/generated/');
