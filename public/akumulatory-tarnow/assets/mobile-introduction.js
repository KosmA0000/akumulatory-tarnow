import { polishWords } from './polish-typography.js?v=2';
import { compactLayout } from './layout-mode.js?v=2';

export function setupMobileIntroduction(preference) {
  const paragraph = document.querySelector('.mobile-about-copy');
  const section = document.querySelector('.about-panel');
  const text = paragraph.textContent;
  paragraph.textContent = '';
  paragraph.setAttribute('aria-label', text);
  const words = polishWords(text).map(word => {
    const span = document.createElement('span');
    span.className = 'mobile-reveal-word';
    span.textContent = word;
    span.setAttribute('aria-hidden', 'true');
    paragraph.append(span, document.createTextNode(' '));
    return span;
  });
  let frame = 0;
  let visible = false;

  function render() {
    frame = 0;
    const animated = compactLayout.matches && !preference.matches;
    const bounds = paragraph.getBoundingClientRect();
    const progress = (innerHeight * .78 - bounds.top) / (innerHeight * .3 + bounds.height);
    words.forEach((word, index) => {
      const amount = Math.max(0, Math.min(1, progress * words.length - index));
      word.style.opacity = animated ? String(.3 + .7 * amount) : '';
    });
  }

  function schedule() {
    if (!frame && (visible || !compactLayout.matches || preference.matches)) {
      frame = requestAnimationFrame(render);
    }
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }, { rootMargin: '100px' }).observe(section);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  compactLayout.addEventListener('change', render);
  preference.addEventListener('change', render);
  render();
}
