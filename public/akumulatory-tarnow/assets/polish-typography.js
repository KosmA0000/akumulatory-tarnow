const joinedWords = [
  'a', 'i', 'o', 'u', 'w', 'z',
  'bo', 'by', 'czy', 'że', 'aż', 'aby', 'ale', 'ani', 'lub', 'oraz', 'lecz',
  'albo', 'bądź', 'gdy', 'więc', 'zaś', 'żeby', 'choć', 'jeśli', 'jeżeli',
  'jak', 'niż', 'gdyż', 'skoro', 'zanim', 'kiedy', 'dopóki', 'chociaż',
  'ponieważ', 'bowiem', 'czyli', 'jednak', 'zatem', 'toteż', 'ażeby', 'byle',
];
const ordinaryWhitespace = /[ \t\r\n]+/;
const wordEnding = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${joinedWords.join('|')})([,:;]?)[ \\t\\r\\n]+`,
  'giu',
);
const excluded = 'script, style, noscript, template, pre, code, svg, math, canvas, textarea, select, [contenteditable]';

export function bindPolishWords(text) {
  return text.replace(wordEnding, '$1$2\u00a0');
}

export function polishWords(text) {
  return bindPolishWords(text).trim().split(ordinaryWhitespace).filter(Boolean);
}

export function setupPolishTypography() {
  function bindNode(node) {
    if (node.parentElement?.closest(excluded)) return;
    const original = node.nodeValue;
    const updated = bindPolishWords(original);
    if (updated !== original) node.nodeValue = updated;
  }

  function bindTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      bindNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excluded)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) bindNode(node);
  }

  bindTree(document.body);
  new MutationObserver(records => {
    const changed = new Set();
    records.forEach(record => {
      if (record.type === 'characterData') changed.add(record.target);
      else record.addedNodes.forEach(node => changed.add(node));
    });
    changed.forEach(node => {
      if (node.isConnected) bindTree(node);
    });
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
}
