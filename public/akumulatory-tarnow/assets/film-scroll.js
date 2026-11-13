import { compactLayout } from './layout-mode.js?v=2';

export function frameAtProgress(progress, count) {
  const value = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return Math.round(value * (count - 1));
}

export function createFrameSeeker(video) {
  let wanted = 0, requested = -1, settled = -1, failed = false, disposed = false, progress = 0;
  const frameCount = () => Math.max(1, Number(video.dataset.frameCount) || 1);
  const fps = () => Number(video.dataset.frameRate) || 30;
  // Variable frame timing: starts[i] is when frame i begins, the last entry is the film end.
  const starts = () => {
    const list = window.__heroFilm?.frameTimes;
    return list && list.length === frameCount() + 1 ? list : null;
  };
  function frameFor(value) {
    const list = starts();
    if (!list) return frameAtProgress(value, frameCount());
    const time = (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0) * list[list.length - 1];
    let low = 0, high = list.length - 2;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (list[middle] <= time) low = middle;
      else high = middle - 1;
    }
    return low;
  }
  function timeFor(index) {
    const list = starts();
    return list ? (list[index] + list[index + 1]) / 2 : (index + .5) / fps();
  }
  function flush() {
    if (disposed || failed || video.dataset.warming || video.readyState < 2 || video.seeking || requested >= 0 || wanted === settled) return;
    const duration = Number.isFinite(video.duration) ? video.duration : frameCount() / fps();
    requested = wanted;
    try {
      video.currentTime = Math.min(timeFor(wanted), Math.max(0, duration - .001));
    } catch {
      requested = -1;
    }
  }
  function onSeeked() {
    if (video.dataset.warming) return;
    if (requested >= 0) settled = requested;
    requested = -1;
    flush();
  }
  function onSource() {
    requested = settled = -1;
    failed = false;
    wanted = frameFor(progress);
  }
  function onError() { failed = true; requested = -1; }
  video.addEventListener('loadstart', onSource);
  video.addEventListener('hero-warmed', () => { settled = requested = -1; flush(); });
  video.addEventListener('loadeddata', flush);
  video.addEventListener('canplay', flush);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', onError);
  return {
    setProgress(value) {
      if (disposed) return;
      progress = value;
      wanted = frameFor(value);
      if (!video.paused) video.pause();
      flush();
    },
    destroy() {
      disposed = true;
      video.removeEventListener('loadstart', onSource);
      video.removeEventListener('loadeddata', flush);
      video.removeEventListener('canplay', flush);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    }
  };
}

export function setupFilmScroll(track, preference) {
  if (!track) return;
  const hero = track.querySelector('.film-hero');
  const playRange = track.querySelector('.film-play-range');
  const video = track.querySelector('video');
  video.muted = video.defaultMuted = true;
  video.autoplay = video.loop = false;
  video.pause();
  const seeker = createFrameSeeker(video);
  let frame = 0, needsMeasure = true, top = 0, distance = 1, animated = false;
  function update() {
    frame = 0;
    if (compactLayout.matches) return;
    if (needsMeasure) {
      top = track.getBoundingClientRect().top + scrollY;
      distance = Math.max(1, playRange ? playRange.offsetHeight : track.offsetHeight - hero.offsetHeight);
      needsMeasure = false;
    }
    const progress = animated ? (scrollY - top) / distance : 0;
    if (!document.hidden) seeker.setProgress(progress);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function measure() { needsMeasure = true; schedule(); }
  function changeMode() {
    animated = !preference.matches && !compactLayout.matches;
    track.classList.toggle('is-scrubbing', animated);
    measure();
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', schedule);
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
    document.removeEventListener('visibilitychange', schedule);
    preference.removeEventListener('change', changeMode);
    compactLayout.removeEventListener('change', changeMode);
    observer.disconnect();
    seeker.destroy();
    track.classList.remove('is-scrubbing');
  };
}
