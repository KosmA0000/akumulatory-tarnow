import { compactLayout } from './layout-mode.js?v=2';

export function setupMobileSectionMotion(preference) {
  const elements = [...document.querySelectorAll([
    '.mobile-about-title', '.mobile-about-copy', '.mobile-about-link',
    '.mobile-offer-title', '.mobile-offer-intro', '.mobile-category', '.mobile-offer-all',
    '.services-heading', '.services-all', '.service-tile',
    '.mobile-trusted-brands h2', '.mobile-brand-grid a', '.mobile-brands-all',
    '.deck-title', '.deck-media', '.reason-card',
    '.advice-heading', '.advice-grid', '.mobile-carousel-hint',
    '.reviews-heading-row h2', '.reviews-rating', '.review-scene-fallback article', '.reviews-note',
    '.environment-grid', '.contact-heading', '.branch',
    '.footer-top > div', '.footer-bottom',
  ].join(','))];
  const visible = new Set();
  let enabled = false;
  let frame = 0;

  elements.forEach(element => element.classList.add('mobile-scroll-step'));

  function render() {
    frame = 0;
    if (!enabled) return;
    const distance = Math.min(240, innerHeight * .3);
    const states = [...visible].map(element => {
      const top = element.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1, (innerHeight * .94 - top) / distance));
      return { element, amount: progress * progress * (3 - 2 * progress) };
    });
    states.forEach(({ element, amount }) => {
      element.style.setProperty('--mobile-step-progress', String(amount));
    });
  }

  function schedule() {
    if (enabled && !frame) frame = requestAnimationFrame(render);
  }

  function configure() {
    enabled = compactLayout.matches && !preference.matches;
    document.documentElement.classList.toggle('mobile-section-motion', enabled);
    elements.forEach(element => element.style.removeProperty('--mobile-step-progress'));
    schedule();
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) visible.add(target);
      else {
        visible.delete(target);
        const passed = target.getBoundingClientRect().top < 0;
        target.style.setProperty('--mobile-step-progress', passed ? '1' : '0');
      }
    });
    schedule();
  }, { rootMargin: '160px' });
  elements.forEach(element => observer.observe(element));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  compactLayout.addEventListener('change', configure);
  preference.addEventListener('change', configure);
  configure();
}
