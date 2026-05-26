import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderFaqListHtml } from '../src/render/faq.js';

const OUT_DIR = join(import.meta.dirname, '..', 'src', 'sections', 'generated');

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(join(OUT_DIR, 'faq-list.html'), renderFaqListHtml().trim());

console.log('Sections prerendered to src/sections/generated/');
