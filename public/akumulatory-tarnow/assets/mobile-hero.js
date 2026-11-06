import { compactLayout } from './layout-mode.js?v=fcefa19930';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);

export function setupMobileHero(track, preference) {
  const camera = track.querySelector('.energy-camera');
  const heading = track.querySelector('.mobile-film-heading');
  const services = track.querySelector('.mobile-film-services');
  const eyebrow = track.querySelector('.film-eyebrow');
  const title = track.querySelector('.film-headline');
  const statement = track.querySelector('.hero-running-copy');
  const features = [...track.querySelectorAll('.film-feature')];
  const playRange = track.querySelector('.film-play-range');
  const continuation = track.querySelector('.film-continuation-range');
  const shortLandscape = matchMedia('(orientation: landscape) and (max-height: 500px)');
  const originalPositions = [eyebrow, title, ...features, statement].map(element => ({
    element,
    parent: element.parentNode,
    next: element.nextSibling,
  }));
  let animated = false;
  let frame = 0;
  let top = 0;
  let playDistance = 1;
  let turnDistance = 1;
  let inView = false;

  function render() {
    frame = 0;
    const progress = animated ? clamp((scrollY - top - playDistance) / turnDistance) : 0;
    const shrink = smooth(clamp(progress / .4));
    const turn = smooth(clamp((progress - .32) / .48));
    track.style.setProperty('--mobile-frame-width', `${100 - shrink * 12}%`);
    track.style.setProperty('--mobile-frame-height', String(1 - shrink * .24));
    track.style.setProperty('--mobile-frame-radius', `${24 + shrink * 240}px`);
    track.style.setProperty('--mobile-frame-turn', `${turn * 180}deg`);
  }

  function schedule() {
    if (compactLayout.matches && !frame) frame = requestAnimationFrame(render);
  }

  function measure() {
    top = track.getBoundingClientRect().top + scrollY;
    playDistance = Math.max(1, playRange.offsetHeight);
    turnDistance = Math.max(1, continuation.offsetHeight);
    schedule();
  }

  function configure() {
    const compact = compactLayout.matches;
    track.classList.toggle('is-mobile-hero', compact);
    document.documentElement.classList.toggle('mobile-hero-visible', compact && inView);
    if (compact) {
      heading.append(eyebrow, title);
      services.append(...features);
      track.append(statement);
    } else {
      originalPositions.forEach(({ element, parent, next }) => parent.insertBefore(element, next));
    }
    animated = compact && !preference.matches && !shortLandscape.matches;
    track.classList.toggle('mobile-hero-motion', animated);
    measure();
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  compactLayout.addEventListener('change', configure);
  shortLandscape.addEventListener('change', configure);
  preference.addEventListener('change', configure);
  new ResizeObserver(measure).observe(camera);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    document.documentElement.classList.toggle('mobile-hero-visible', compactLayout.matches && inView);
  }).observe(track);
  document.fonts.ready.then(measure);
  configure();
}
