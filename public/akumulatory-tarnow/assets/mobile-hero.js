import { compactLayout } from './layout-mode.js?v=2';

export function setupMobileHero(track) {
  if (!track) return;
  const heading = track.querySelector('.mobile-film-heading');
  const services = track.querySelector('.mobile-film-services');
  const help = track.querySelector('.mobile-help');
  const eyebrow = track.querySelector('.film-eyebrow');
  const title = track.querySelector('.film-headline');
  const offer = track.querySelector('.film-left');
  const assistance = track.querySelector('.film-right');
  const statement = track.querySelector('.hero-running-copy');
  const batteries = document.querySelector('.mobile-battery-offer');
  const trustedBrands = document.querySelector('.services-overview .mobile-trusted-brands');
  const early = window.__mobileHeroOriginal;
  const originalPositions = [eyebrow, title, offer, assistance, statement, batteries].map(element => early?.get(element) || ({
    element,
    parent: element.parentNode,
    next: element.nextSibling,
  }));
  let inView = false;

  function configure() {
    const compact = compactLayout.matches;
    track.classList.toggle('is-mobile-hero', compact);
    document.documentElement.classList.toggle('mobile-hero-visible', compact && inView);
    if (compact) {
      heading.append(eyebrow, title);
      help.prepend(assistance);
      services.append(offer);
      track.append(statement);
      trustedBrands.before(batteries);
    } else {
      originalPositions.forEach(({ element, parent, next }) => parent.insertBefore(element, next));
    }
  }

  compactLayout.addEventListener('change', configure);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    document.documentElement.classList.toggle('mobile-hero-visible', compactLayout.matches && inView);
  }).observe(track);
  configure();
}
