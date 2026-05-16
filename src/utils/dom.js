export function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent.replace(/\s+/g, ' ').trim();
}

/** Без DOM — для prerender и aria-label */
export function stripHtmlPlain(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
