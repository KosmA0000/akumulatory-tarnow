import { playOpeningMosaic } from './opening-mosaic.js?v=929ebad855';
import { compactLayout } from './layout-mode.js?v=20f5ae3bca';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = n => Math.min(1, Math.max(0, n));
const mix = (a, b, p) => a + (b - a) * p;
const phase = (p, a, b) => clamp((p - a) / (b - a));
const smooth = p => p * p * (3 - 2 * p);

class CurrentField {
  constructor(stage, preference) {
    this.stage = stage;
    this.preference = preference;
    this.svg = $('svg', stage);
    this.paths = $$('.flow-path', stage);
    this.traces = $$('.field-trace path', stage);
    this.traceLengths = this.traces.map(path => path.getTotalLength());
    this.wave = $('.wave-path', stage);
    this.orbits = $$('.field-orbits circle', stage);
    this.nodes = $$('.field-nodes circle', stage);
    this.traces.forEach((path, i) => {
      path.style.strokeDasharray = this.traceLengths[i];
    });
    this.lengths = this.paths.map(path => path.getTotalLength());
    this.dots = [];
    this.paths.forEach((path, row) => {
      for (let i = 0; i < 12; i++) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('r', i % 4 === 0 ? '3.2' : '1.65');
        $('.charge-particles', stage).append(dot);
        this.dots.push({ dot, path, row, offset: i / 12 });
      }
    });
    this.frame = 0;
    this.amount = 0;
    this.inView = false;
    this.observer = new IntersectionObserver(entries => {
      this.inView = entries[0].isIntersecting;
      this.wake();
    });
    this.observer.observe(stage);
    document.addEventListener('visibilitychange', () => this.wake());
  }
  setProgress(amount) { this.amount = amount; this.wake(); }
  wake() {
    if (this.frame || !this.inView || this.amount < .01 || this.preference.matches || document.hidden) return;
    this.frame = requestAnimationFrame(t => this.render(t));
  }
  render(time) {
    this.frame = 0;
    if (!this.inView || this.amount < .01 || this.preference.matches || document.hidden) return;
    const t = time / 1000;
    const cycle = (t % 12) / 12;
    const construct = smooth(phase(cycle, 0, .19));
    const release = 1 - smooth(phase(cycle, .88, 1));
    this.traces.forEach((path, i) => {
      path.style.strokeDashoffset = this.traceLengths[i] * (1 - construct * release);
      path.style.opacity = String(.4 + .45 * Math.sin(t * .7 + i) ** 2);
    });
    const wave = this.wave;
    const amplitude = 40 + Math.sin(t * .6) * 19 + this.amount * 18;
    let d = '';
    for (let x = -80; x <= 1680; x += 8) {
      const envelope = Math.min(1, Math.max(0, (x + 80) / 300)) * Math.min(1, Math.max(0, (1680 - x) / 300));
      const y = 450 + Math.sin(x / 100 - t * 1.4) * amplitude * envelope;
      d += `${x === -80 ? 'M' : 'L'}${x} ${y.toFixed(2)}`;
    }
    wave.setAttribute('d', d);
    wave.style.strokeDasharray = '120 38 8 38';
    wave.style.strokeDashoffset = String(-t * 32);
    this.orbits.forEach((circle, i) => {
      const circumference = Number(circle.getAttribute('r')) * 2 * Math.PI;
      circle.style.strokeDasharray = `${circumference * .71} ${circumference * .29}`;
      circle.style.strokeDashoffset = String(t * (i ? -20 : 13));
    });
    this.dots.forEach(({ dot, path, row, offset }) => {
      const p = ((t / (row ? 8.6 : 7.4)) + offset) % 1;
      const point = path.getPointAtLength(this.lengths[row] * p);
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      dot.style.opacity = String(.15 + .85 * Math.sin(p * Math.PI) ** 2);
    });
    this.nodes.forEach((dot, i) => {
      const pulse = .5 + .5 * Math.sin(t * 2.5 - i * 1.2);
      dot.setAttribute('r', String(6 + pulse * 4));
      dot.style.strokeOpacity = String(.35 + pulse * .65);
    });
    this.wake();
  }
}

export function setupStoryMotion({ preference, onFrame }) {
  const hero = $('.hero');
  const heroCopy = $('.hero-content');
  const heroImage = $('.hero-photo img');
  const heroVideo = $('.hero-photo video');
  const heroShade = $('.hero-shade');
  const headline = $('.hero-running-copy');
  const field = $('.energy-field');
  // A hidden mobile diagram needs no SVG geometry or particle nodes.
  let energy;
  const setEnergy = amount => {
    if (!energy && amount > 0) energy = new CurrentField(field, preference);
    energy?.setProgress(amount);
  };
  const camera = $('.energy-camera');
  const horizontal = $('.horizontal-track');
  const horizontalCamera = $('.horizontal-camera');
  const deckCamera = $('.deck-camera');
  const deckTitle = $('.deck-title');
  const deckMedia = $('.deck-media');
  const deckCards = $('.reason-cards');
  const advice = $('.advice-story');
  const adviceCamera = $('.advice-camera');
  const adviceCards = $$('.arrival-wrap');
  const reviewStage = $('.clou-stage');
  const brandStage = $('.pacome-stage');
  const reviewHeading = $('.reviews-heading-row');
  const reviewPreview = $('.review-preview');
  const reviewCamera = $('.reviews-camera');
  const quote = $('[data-word-reveal]');
  const text = quote.textContent;
  quote.textContent = '';
  quote.setAttribute('aria-label', text);
  const words = text.split(/\s+/).map(word => {
    const span = document.createElement('span');
    span.textContent = word;
    span.className = 'word';
    span.setAttribute('aria-hidden', 'true');
    quote.append(span, document.createTextNode(' '));
    return span;
  });
  let enhanced = false;
  let frame = 0;
  let current = scrollY;
  let target = scrollY;
  let dimensions = {};
  const sections = {
    hero: $('.energy-intro'), horizontal: $('.horizontal-story'),
    deck: $('.deck-story'), advice: $('.advice-story'), reviews: $('.reviews-section')
  };
  const moving = [hero, heroCopy, heroImage, heroVideo, heroShade, headline, field, horizontal,
    horizontalCamera, deckCamera, deckTitle, deckMedia, deckCards, $('.deck-next-title'),
    ...$$('.deck-photo'), ...$$('.reason-card'), ...adviceCards, advice, adviceCamera,
    $('.advice-heading'), reviewStage, reviewHeading, reviewPreview, reviewCamera];

  function measure() {
    const next = !compactLayout.matches && !preference.matches;
    if (enhanced !== next) {
      moving.forEach(el => el?.removeAttribute('style'));
      enhanced = next;
      current = target = scrollY;
    }
    document.documentElement.classList.toggle('enhanced-motion', enhanced);
    dimensions = {};
    for (const [key, el] of Object.entries(sections)) {
      const box = el.getBoundingClientRect();
      dimensions[key] = { top: box.top + scrollY, travel: Math.max(1, box.height - innerHeight) };
    }
    schedule();
  }
  const progress = key => clamp((current - dimensions[key].top) / dimensions[key].travel);
  // Begin a handoff while the preceding scene still occupies the viewport.
  const approach = (key, before, after) => phase(current, dimensions[key].top - innerHeight * before, dimensions[key].top + innerHeight * after);
  function render() {
    frame = 0;
    target = scrollY;
    // CSS sticky follows native scroll immediately. Its animation progress must
    // use that same position, including large wheel/touch deltas.
    current = target;
    const w = document.documentElement.clientWidth;
    const h = innerHeight;
    if (enhanced) {
      const p = progress('hero');
      const shrink = smooth(phase(p, .16, .43));
      const fullW = w - 24, fullH = h - 24;
      const endW = w * (w >= 1440 ? .24 : .31);
      const endH = w * (w >= 1440 ? .159 : .205);
      const heroWidth = mix(fullW, endW, shrink);
      const headlineX = mix(w * 1.04, -headline.scrollWidth - w * .08, phase(p, .4, .92));
      const gap = w * .035;
      // The text and capsule share one trajectory: the text's leading edge
      // pushes the photo's right edge, so they can never pass through each other.
      const push = p < .4 ? 0 : Math.min(0, headlineX - gap - (w + heroWidth) / 2);
      hero.style.setProperty('--hero-full-width', `${fullW}px`);
      hero.style.setProperty('--hero-full-height', `${fullH}px`);
      hero.style.width = `${heroWidth}px`;
      hero.style.height = `${mix(fullH, endH, shrink)}px`;
      hero.style.borderRadius = `${mix(32, w, smooth(phase(p, .05, .43)))}px`;
      hero.style.transform = `translateX(${push}px)`;
      hero.style.opacity = String(1 - phase(p, .9, .96));
      heroImage.style.transform = `translateX(${-shrink * w * .04}px) scale(${mix(1, .4, shrink)})`;
      if (heroVideo) heroVideo.style.transform = heroImage.style.transform;
      heroCopy.style.opacity = String(1 - phase(p, .05, .24));
      heroCopy.style.pointerEvents = p > .2 ? 'none' : '';
      heroCopy.style.transform = `translateY(${shrink * h * .14}px)`;
      heroShade.style.opacity = String(1 - shrink * .75);
      const flowing = phase(p, .19, .43) * (1 - phase(p, .78, .94));
      field.style.opacity = String(flowing * .82);
      setEnergy(flowing);
      headline.style.opacity = String(phase(p, .38, .46) * (1 - phase(p, .86, .96)));
      headline.style.transform = `translateX(${headlineX}px)`;

      const handoff = progress('horizontal');
      const slide = smooth(phase(handoff, .28, .72));
      horizontal.style.transform = `translateX(${-w * slide}px)`;
      // Fade the content independently: an opaque black surface prevents the
      // page below from showing as a pale strip when the hero unpins.
      const aboutEntry = approach('horizontal', .08, .12);
      horizontalCamera.style.opacity = current >= dimensions.horizontal.top - h * .08 ? '1' : '0';
      horizontal.style.opacity = String(aboutEntry);
      words.forEach((word, index) => {
        const amount = phase(handoff, .03 + index / words.length * .2, .075 + index / words.length * .2);
        const value = mix(92, 255, amount);
        word.style.color = `rgb(${value},${value},${value})`;
      });

      const deck = progress('deck');
      const deckEntry = approach('deck', .12, .32);
      // IntersectionObserver cannot see an opaque sticky section covering this
      // stage. Stop its GPU work as soon as the next surface fully covers it.
      brandStage.dataset.sceneActive = slide > 0 && deckEntry < 1 ? '1' : '0';
      const enterDeck = smooth(deckEntry);
      const exitDeck = smooth(phase(deck, .7, .9));
      deckCamera.style.setProperty('--handoff-surface', smooth(phase(deckEntry, .1, .9)));
      deckCamera.style.pointerEvents = deckEntry > .08 && exitDeck < 1 ? 'auto' : 'none';
      deckTitle.style.transform = `translateX(${(-1 + enterDeck - exitDeck) * w * .64}px)`;
      deckMedia.style.transform = `translateX(${(-1 + enterDeck - exitDeck) * w * .64}px)`;
      deckCards.style.transform = `translateX(${(1 - enterDeck + exitDeck) * w * .36}px)`;
      $$('.reason-card').forEach((card, index) => {
        const open = index === 0 ? 1 : smooth(phase(deck, index === 1 ? .26 : .46, index === 1 ? .43 : .63));
        card.style.transform = `translateY(${(1 - open) * h * 1.08}px)`;
        card.style.opacity = String(index === 0 ? 1 : clamp(open * 4));
      });
      $$('.deck-photo').forEach((photo, index) => {
        const open = index === 0 ? 1 : smooth(phase(deck, index === 1 ? .26 : .46, index === 1 ? .43 : .63));
        photo.style.transform = `translateY(${(1 - open) * h * 1.1}px)`;
        photo.style.opacity = String(index === 0 ? 1 : clamp(open * 4));
      });
      const articles = progress('advice');
      $('.deck-next-title').style.opacity = String(phase(deck, .69, .83) * (1 - phase(articles, .08, .24)));
      $('.advice-heading').style.opacity = String(phase(articles, .14, .27) * (1 - phase(articles, .66, .8)));
      adviceCards.forEach((card, index) => {
        const enter = phase(articles, .04, .3);
        const leave = phase(articles, .34, .96);
        const y = mix([120, 150, 90][index], 0, enter) + [ -110, -170, -140 ][index] * leave;
        card.style.transform = `translateY(${y}vh)`;
        card.style.opacity = String(phase(articles, .03, .1));
        card.style.pointerEvents = articles > .12 && articles < .84 ? 'auto' : 'none';
      });
      advice.style.pointerEvents = 'none';

      const reviewEntry = approach('reviews', .25, .2);
      reviewStage.dataset.sceneActive = reviewEntry > .05 ? '1' : '0';
      const incoming = smooth(reviewEntry);
      adviceCamera.style.opacity = String(1 - smooth(phase(reviewEntry, .02, .35)));
      reviewCamera.style.setProperty('--handoff-surface', smooth(phase(reviewEntry, .12, .92)));
      reviewCamera.style.pointerEvents = reviewEntry > .08 ? 'auto' : 'none';
      reviewStage.style.transform = `translateY(${(1 - incoming) * 16}vh)`;
      reviewStage.style.opacity = String(phase(reviewEntry, .05, .65));
      reviewHeading.style.opacity = String(phase(reviewEntry, 0, .5));
      reviewHeading.style.transform = `translateY(${(1 - incoming) * 12}vh)`;
      reviewPreview.style.opacity = String(phase(reviewEntry, .15, .75));
    } else {
      brandStage.dataset.sceneActive = '1';
      reviewStage.dataset.sceneActive = '1';
      setEnergy(0);
      words.forEach(word => { word.style.color = ''; });
    }
    onFrame?.();
    if (current !== target) frame = requestAnimationFrame(render);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  preference.addEventListener('change', measure);
  compactLayout.addEventListener('change', measure);
  document.fonts.ready.then(measure);
  measure();
  const layoutObserver = new ResizeObserver(measure);
  Object.values(sections).forEach(section => layoutObserver.observe(section));

  const anchors = { 'o-nas': ['horizontal', .23], akumulatory: ['horizontal', .84], uslugi: ['deck', .23], porady: ['advice', .49], opinie: ['reviews', .5] };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    const id = link?.getAttribute('href').slice(1);
    if (!enhanced || !anchors[id]) return;
    event.preventDefault();
    const [key, p] = anchors[id];
    history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: dimensions[key].top + dimensions[key].travel * p, behavior: 'smooth' });
  });
  function alignInitialHash() {
    const id = location.hash.slice(1);
    if (!enhanced || !anchors[id]) return;
    measure();
    const [key, p] = anchors[id];
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, dimensions[key].top + dimensions[key].travel * p);
    current = target = scrollY;
    schedule();
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previous; });
  }
  if (document.readyState === 'complete') requestAnimationFrame(alignInitialHash);
  else addEventListener('load', alignInitialHash, { once: true });

  // Touch has no shrinking cover, no pinning, and no circle/pill interlude.
  // Its article cards keep Shopify's side entrance in a short, one-time reveal.
  const arrived = new WeakSet();
  const arrivals = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || enhanced || preference.matches || arrived.has(entry.target)) return;
      const index = Number(entry.target.dataset.adviceIndex);
      const animation = entry.target.animate([
        { transform: `translate(${index % 2 ? 16 : -16}px,36px) scale(.97)`, opacity: 0 },
        { transform: 'translate(0,-2px) scale(1.005)', opacity: 1, offset: .8 },
        { transform: 'translate(0,0) scale(1)', opacity: 1 }
      ], { duration: 650, delay: 50 * (index % 2), easing: 'cubic-bezier(.16,1,.3,1)' });
      $('.advice-picture img', entry.target).animate([
        { transform: 'scale(1.06)' }, { transform: 'scale(1)' }
      ], { duration: 750, delay: 50 * (index % 2), easing: 'cubic-bezier(.16,1,.3,1)' });
      arrived.add(entry.target);
      animation.finished.catch(() => {});
    });
  }, { threshold: .05 });
  adviceCards.forEach(card => arrivals.observe(card));

  playOpeningMosaic(hero, heroImage, preference);
  return { get current() { return current; }, get target() { return target; }, refresh: measure };
}
