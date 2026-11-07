import { compactLayout } from './layout-mode.js?v=2';

const clamp = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const easeOut = t => 1 - (1 - t) ** 3;
const range = (element, key) => element.dataset[key].split(' ').map(Number);

export function createLineDrawing(svg) {
  const groups = [...svg.querySelectorAll('g[data-s]')].map(group => {
    const shapes = [...group.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon')];
    shapes.forEach(shape => {
      shape.setAttribute('pathLength', '1');
      shape.style.strokeDasharray = '1 1';
      shape.style.strokeDashoffset = '1';
      shape.style.visibility = 'hidden';
    });
    return { shapes, s: Number(group.dataset.s), e: Number(group.dataset.e), dur: Math.min(1, Math.max(.22, 4 / shapes.length)), last: -1 };
  });
  const fades = [...svg.querySelectorAll('[data-f]')].map(element => { const [s, e] = range(element, 'f'); return { element, s, e }; });
  const outs = [...svg.querySelectorAll('[data-out]')].map(element => { const [s, e] = range(element, 'out'); return { element, s, e }; });
  const moves = [...svg.querySelectorAll('[data-m]')].map(element => { const [dx, dy, s, e] = range(element, 'm'); return { element, dx, dy, s, e }; });
  let current = -1;
  return progress => {
    const p = clamp(progress);
    if (p === current) return;
    current = p;
    for (const group of groups) {
      const local = clamp((p - group.s) / (group.e - group.s));
      if (local === group.last) continue;
      group.last = local;
      const count = group.shapes.length;
      group.shapes.forEach((shape, index) => {
        const start = count > 1 ? index / (count - 1) * (1 - group.dur) : 0;
        const drawn = clamp((local - start) / group.dur);
        shape.style.strokeDashoffset = (1 - drawn).toFixed(4);
        shape.style.visibility = drawn > 0 ? 'visible' : 'hidden';
      });
    }
    for (const { element, s, e } of fades) element.style.opacity = clamp((p - s) / (e - s)).toFixed(3);
    for (const { element, s, e } of outs) {
      const gone = clamp((p - s) / (e - s));
      element.style.opacity = (1 - gone).toFixed(3);
      element.style.visibility = gone < 1 ? '' : 'hidden';
    }
    for (const { element, dx, dy, s, e } of moves) {
      const rest = 1 - easeOut(clamp((p - s) / (e - s)));
      element.setAttribute('transform', `translate(${(dx * rest).toFixed(1)} ${(dy * rest).toFixed(1)})`);
    }
  };
}

const SCENE = { cx: 640, top: 262, bottom: 571, half: 515 };

export function setupFilmScroll(track, preference) {
  if (!track) return;
  const hero = track.querySelector('.film-hero');
  const playRange = track.querySelector('.film-play-range');
  const svg = track.querySelector('.film-drawing');
  const stage = track.querySelector('.film-stage');
  const title = track.querySelector('.film-headline');
  const lastLine = track.querySelector('.film-hl3');
  const features = [...track.querySelectorAll('.film-feature')];
  const paint = createLineDrawing(svg);
  let frame = 0, needsMeasure = true, needsFit = true, top = 0, distance = 1, animated = false;

  function fitDrawing() {
    if (compactLayout.matches || !stage.offsetParent || !features.every(feature => stage.contains(feature))) return;
    const width = svg.clientWidth, height = svg.clientHeight;
    if (!width || !height) return;
    const base = stage.getBoundingClientRect().top - hero.getBoundingClientRect().top;
    const bandTop = base + title.offsetTop + lastLine.offsetTop + lastLine.offsetHeight + 18;
    const bandBottom = base + Math.min(...features.map(feature => feature.offsetTop)) - 22;
    const sceneHeight = SCENE.bottom - SCENE.top;
    const scale = Math.max(.35, Math.min((bandBottom - bandTop) / sceneHeight, (width / 2 - 40) / SCENE.half));
    const y = bandTop + Math.max(0, (bandBottom - bandTop - sceneHeight * scale) / 2);
    svg.setAttribute('viewBox', [SCENE.cx - width / 2 / scale, SCENE.top - y / scale, width / scale, height / scale]
      .map(value => value.toFixed(1)).join(' '));
    needsFit = false;
  }

  function update() {
    frame = 0;
    if (needsMeasure) {
      top = track.getBoundingClientRect().top + scrollY;
      distance = Math.max(1, playRange ? playRange.offsetHeight : track.offsetHeight - hero.offsetHeight);
      needsMeasure = false;
    }
    if (needsFit && (!animated || scrollY - top <= distance)) fitDrawing();
    paint(animated ? (scrollY - top) / distance : 1);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function measure() { needsMeasure = needsFit = true; schedule(); }
  function changeMode() {
    animated = !preference.matches && !compactLayout.matches;
    document.documentElement.classList.toggle('lh-on', animated);
    track.classList.toggle('is-scrubbing', animated);
    measure();
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  preference.addEventListener('change', changeMode);
  compactLayout.addEventListener('change', changeMode);
  const observer = new ResizeObserver(measure);
  observer.observe(track);
  document.fonts.ready.then(measure);
  changeMode();
  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('scroll', schedule);
    removeEventListener('resize', measure);
    removeEventListener('pageshow', measure);
    preference.removeEventListener('change', changeMode);
    compactLayout.removeEventListener('change', changeMode);
    observer.disconnect();
    track.classList.remove('is-scrubbing');
  };
}
