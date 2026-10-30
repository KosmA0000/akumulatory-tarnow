export function frameAtProgress(progress, count) {
  const value = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return Math.round(value * (count - 1));
}

// Keep at most one native seek in flight. Wheel/touch updates replace the
// destination instead of building a queue of intermediate video frames.
export function createFrameSeeker(video, { frameCount, fps }) {
  let wanted = 0, requested = -1, settled = -1, failed = false, disposed = false;
  function flush() {
    if (disposed || failed || video.readyState < 2 || video.seeking || requested >= 0 || wanted === settled) return;
    const duration = Number.isFinite(video.duration) ? video.duration : frameCount / fps;
    requested = wanted;
    try {
      // Seek inside the frame, avoiding ambiguous timestamps at its boundary.
      video.currentTime = Math.min((wanted + .5) / fps, Math.max(0, duration - .001));
    } catch {
      requested = -1;
    }
  }
  function onSeeked() {
    if (requested >= 0) settled = requested;
    requested = -1;
    flush();
  }
  function onError() { failed = true; requested = -1; }
  video.addEventListener('loadeddata', flush);
  video.addEventListener('canplay', flush);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', onError);
  return {
    setProgress(progress) {
      if (disposed) return;
      wanted = frameAtProgress(progress, frameCount);
      if (!video.paused) video.pause();
      flush();
    },
    destroy() {
      disposed = true;
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
  const seeker = createFrameSeeker(video, {
    frameCount: Number(video.dataset.frameCount), fps: Number(video.dataset.frameRate)
  });
  let frame = 0, needsMeasure = true, top = 0, distance = 1;
  function update() {
    frame = 0;
    if (needsMeasure) {
      top = track.getBoundingClientRect().top + scrollY;
      distance = Math.max(1, playRange ? playRange.offsetHeight : track.offsetHeight - hero.offsetHeight);
      needsMeasure = false;
    }
    if (!document.hidden) seeker.setProgress(preference.matches ? 0 : (scrollY - top) / distance);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function measure() { needsMeasure = true; schedule(); }
  function changeMode() {
    track.classList.toggle('is-scrubbing', !preference.matches);
    measure();
  }
  // Sticky positioning follows native scrolling. No wheel/touch interception,
  // playback timer, continuous animation loop, or canvas copies are needed.
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  document.addEventListener('visibilitychange', schedule);
  preference.addEventListener('change', changeMode);
  const observer = new ResizeObserver(measure);
  observer.observe(track);
  changeMode();
  return () => {
    cancelAnimationFrame(frame);
    removeEventListener('scroll', schedule);
    removeEventListener('resize', measure);
    removeEventListener('pageshow', measure);
    document.removeEventListener('visibilitychange', schedule);
    preference.removeEventListener('change', changeMode);
    observer.disconnect();
    seeker.destroy();
    track.classList.remove('is-scrubbing');
  };
}
