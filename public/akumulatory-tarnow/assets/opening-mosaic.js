import { mosaicTiming } from './mosaic-pattern.js?v=bb2ccc90b8';
import { scenePixelRatio } from './scene-budget.js?v=2e0c4058b0';

// One raster surface, hard square switches, no DOM tile layers or scroll lock.
export function playOpeningMosaic(hero, image, preference) {
  if (preference.matches || scrollY > 30 || (location.hash && location.hash !== '#start')) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'opening-mosaic';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const bounds = hero.getBoundingClientRect();
  const w = Math.round(bounds.width), h = Math.round(bounds.height);
  // Share the same 1.25M-pixel budget as the other scenes, including 4K displays.
  const ratio = scenePixelRatio(w, h, 1);
  canvas.width = Math.floor(w * ratio); canvas.height = Math.floor(h * ratio);
  context.scale(ratio, ratio);
  const cols = w < 600 ? 10 : 20;
  const size = w / cols, rows = Math.ceil(h / size), top = h - rows * size;
  const cells = Array.from({ length: rows * cols }, (_, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const sourceRow = Math.min(12, Math.floor((row + .5) / rows * 13));
    const sourceCol = Math.min(19, Math.floor((col + .5) / cols * 20));
    const [start, end] = mosaicTiming[sourceRow * 20 + sourceCol];
    return { x:col * size, y:top + row * size, start, end };
  });
  let frame = 0, timer = 0, started = 0, finished = false, previousStep = -1;
  const events = new AbortController();
  const stop = () => {
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    canvas.remove();
    hero.classList.remove('is-opening');
    events.abort();
  };
  for (const name of ['wheel','touchstart','pointerdown','keydown','resize']) addEventListener(name, stop, { once:true, passive:true, signal:events.signal });
  preference.addEventListener('change', stop, { once:true, signal:events.signal });
  document.addEventListener('visibilitychange', stop, { once:true, signal:events.signal });
  function paint(time) {
    if (finished) return;
    started ||= time;
    const realTime = time - started;
    // The same square sequence opens more slowly, then holds a complete mosaic
    // for half a second before uncovering the hero.
    const elapsed = realTime < 1260 ? realTime / 1.8 : realTime < 1760 ? 700 : (realTime - 500) / 1.8;
    if (elapsed >= 1650) { stop(); return; }
    // The complete image must paint even when the previous partial frame was
    // in the same 16ms bucket as the start of the hold.
    const step = elapsed === 700 ? -2 : Math.floor(elapsed / 16);
    if (step === previousStep) { frame = requestAnimationFrame(paint); return; }
    previousStep = step;
    context.clearRect(0, 0, w, h);
    if (elapsed < 700) { context.fillStyle = '#fafbf8'; context.fillRect(0, 0, w, h); }
    // A slightly closer, darker crop distinguishes the masked transition from
    // the original hero it uncovers. Both use the same supplied photograph.
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * 1.14;
    const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
    context.save();
    context.beginPath();
    if (elapsed === 700) context.rect(0, 0, w, h);
    else for (const cell of cells) if (elapsed >= cell.start && elapsed < cell.end) context.rect(Math.floor(cell.x), Math.floor(cell.y), Math.ceil(size) + 1, Math.ceil(size) + 1);
    context.clip();
    context.drawImage(image, (w - iw) * .52, (h - ih) * .5, iw, ih);
    context.fillStyle = '#11151080'; context.fillRect(0, 0, w, h);
    context.restore();
    frame = requestAnimationFrame(paint);
  }
  image.decode().then(() => {
    if (finished || preference.matches || scrollY > 30) return;
    timer = setTimeout(() => {
      if (finished) return;
      hero.classList.add('is-opening');
      hero.append(canvas);
      frame = requestAnimationFrame(paint);
    }, 450);
  }).catch(stop);
}
