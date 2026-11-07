import { drawings } from './offer-drawings-art.js?v=2';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => value * value * (3 - 2 * value);
const shapeSelector = 'path, rect, circle, ellipse, line, polyline, polygon';

function prepare(holder) {
  const groups = [...holder.querySelectorAll('g[data-s]')].map(group => {
    const shapes = [...group.querySelectorAll(shapeSelector)];
    shapes.forEach(shape => {
      shape.setAttribute('pathLength', '1');
      shape.style.strokeDasharray = '1 1';
      shape.style.strokeDashoffset = '1';
      shape.style.visibility = 'hidden';
    });
    return {
      shapes,
      start: +group.dataset.s,
      end: +group.dataset.e,
      duration: Math.min(1, Math.max(.22, 4 / shapes.length)),
      last: -1,
    };
  });
  const fades = [...holder.querySelectorAll('[data-f]')].map(element => {
    const [start, end] = element.dataset.f.split(' ').map(Number);
    return { element, start, end };
  });
  const moves = [...holder.querySelectorAll('[data-m]')].map(element => {
    const [x, y, start, end] = element.dataset.m.split(' ').map(Number);
    return { element, x, y, start, end };
  });
  return { groups, fades, moves };
}

function paint(item, progress) {
  if (item.painted === progress) return;
  item.painted = progress;
  item.groups.forEach(group => {
    const groupProgress = clamp((progress - group.start) / (group.end - group.start));
    if (group.last === groupProgress) return;
    group.last = groupProgress;
    const count = group.shapes.length;
    group.shapes.forEach((shape, index) => {
      const delay = count > 1 ? index / (count - 1) * (1 - group.duration) : 0;
      const amount = clamp((groupProgress - delay) / group.duration);
      shape.style.strokeDashoffset = (1 - amount).toFixed(4);
      shape.style.visibility = amount > 0 ? 'visible' : 'hidden';
    });
  });
  item.fades.forEach(({ element, start, end }) => {
    element.style.opacity = clamp((progress - start) / (end - start)).toFixed(3);
  });
  item.moves.forEach(({ element, x, y, start, end }) => {
    const left = 1 - ease(clamp((progress - start) / (end - start)));
    element.setAttribute('transform', `translate(${(x * left).toFixed(2)} ${(y * left).toFixed(2)})`);
  });
}

export function setupOfferDrawings(preference) {
  const items = [...document.querySelectorAll('[data-offer-illustration]')].map(row => {
    const holder = document.createElement('div');
    holder.className = 'offer-drawing';
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = `
      <svg class="offer-line-art" viewBox="0 0 420 240" fill="none"
        stroke="currentColor" stroke-linecap="round"
        stroke-linejoin="round" focusable="false">
        ${drawings[row.dataset.offerIllustration]}
      </svg>`;
    row.prepend(holder);
    return { holder, ...prepare(holder), current: -1, painted: -1 };
  });
  let frame = 0;
  let lastTime = 0;

  function target(item) {
    if (preference.matches) return 1;
    const bounds = item.holder.getBoundingClientRect();
    return clamp((innerHeight * .94 - bounds.top) / (innerHeight * .54 + bounds.height * .2));
  }

  function render(time = 0) {
    frame = 0;
    let moving = false;
    const step = 1 - Math.exp(-Math.min(time - lastTime, 200) / 90);
    lastTime = time;
    const states = items.map(item => ({ item, goal: target(item) }));
    states.forEach(({ item, goal }) => {
      if (item.current < 0 || preference.matches) item.current = goal;
      item.current += (goal - item.current) * step;
      if (Math.abs(goal - item.current) < .0008) item.current = goal;
      else moving = true;
      paint(item, item.current);
    });
    if (moving) schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  render();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  preference.addEventListener('change', schedule);
  document.fonts.ready.then(schedule);
}
