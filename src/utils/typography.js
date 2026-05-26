const HANGING_WORDS = [
  'из-за',
  'из-под',
  'в',
  'во',
  'без',
  'до',
  'из',
  'к',
  'ко',
  'на',
  'над',
  'о',
  'об',
  'обо',
  'от',
  'по',
  'под',
  'при',
  'про',
  'с',
  'со',
  'у',
  'за',
  'для',
  'и',
  'а',
  'но',
  'да',
  'или',
  'либо',
  'что',
  'как',
  'не',
  'ни',
  'ли',
  'бы',
  'же',
].sort((a, b) => b.length - a.length);

// \b не работает с кириллицей в JS — граница через не-буквенный символ
const HANGING_WORDS_RE = new RegExp(
  `(^|[^\\p{L}\\p{N}])(${HANGING_WORDS.join('|')})\\s+(?=\\p{L})`,
  'giu',
);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'NOSCRIPT']);

export function fixHangingPrepositions(text) {
  if (!text) return text;
  return text.replace(HANGING_WORDS_RE, '$1$2\u00A0');
}

export function fixHangingPrepositionsInElement(root) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;

      let parent = node.parentElement;
      while (parent) {
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        parent = parent.parentElement;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    const fixed = fixHangingPrepositions(node.textContent);
    if (fixed !== node.textContent) {
      node.textContent = fixed;
    }
    node = walker.nextNode();
  }
}
