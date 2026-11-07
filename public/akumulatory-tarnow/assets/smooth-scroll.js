import Lenis from './vendor/lenis-1.3.27.mjs';

const preference = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
let lenis;

function syncLock() {
  if (!lenis) return;
  const locked = Boolean(document.querySelector('dialog[open]')) ||
    root.style.overflow === 'hidden' || root.classList.contains('review-open');
  if (locked && !lenis.isStopped) lenis.stop();
  else if (!locked && lenis.isStopped) lenis.start();
}

function configure() {
  lenis?.destroy();
  lenis = preference.matches ? null : new Lenis({
    autoRaf: true,
    lerp: .085,
    smoothWheel: true,
    syncTouch: false,
    anchors: false,
    prevent: node => node.tagName === 'DIALOG',
  });
  syncLock();
}

export function scrollToPosition(top, { immediate = false } = {}) {
  syncLock();
  if (lenis) {
    lenis.resize();
    lenis.scrollTo(top, { immediate });
  } else {
    window.scrollTo({ top, behavior: immediate || preference.matches ? 'instant' : 'smooth' });
  }
}

addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || link.hasAttribute('download') || link.classList.contains('skip-link') ||
      (link.target && link.target !== '_self')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname ||
      url.search !== location.search || !url.hash) return;
  let id;
  try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  history.pushState(null, '', url.hash);
  const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  scrollToPosition(target.getBoundingClientRect().top + scrollY - padding);
});

const lockObserver = new MutationObserver(syncLock);
lockObserver.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
lockObserver.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['open'] });
preference.addEventListener('change', configure);
addEventListener('pageshow', () => { lenis?.resize(); syncLock(); });
configure();
