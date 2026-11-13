(() => {
  const root = document.documentElement;
  const media = 'assets/media/';
  const FILMS = {
    '120': {
      frames: 1199, fps: 120, width: 1280, height: 720,
      // Frame lengths in 1/192 s: the source keeps 96 fps frames and adds in-between frames, so timing is uneven.
      steps: '22221122112222112211222211221122221122112222112211222211221122221122112222112211221122221122112222112211222211221122221122112222112211222211221122221122112222112211221122221122112222112211222211221122221122112222112211222211221122221122112211222211221122221122112222112211222211221122221122112222112211222211221122221122112211222211221122221122112222112211222211221122221122112222112211222211221122112222112211222211221122221122112222112211222211221122221122112222112211222211221122112222112211222211221122221122112222112211222211221122221122112222112211222211221122112222112211222211221122221122112222112211222211221122221122112222112211221122221122112222112211222211221122221122112222112211222211221122221122112222112211221122221122112222112211222211221122221122112222112211222211221122221122112211222211221122221122112222112211222211221122221122112222112211222211221122221122112211222211221122221122112222112211222211221122221122112222112211222211221122221122112211222211221122221122112222112211222211221122221122112222112211222211221122112222112211222211221122221122112222112211222211221122221122112222112211222211221122112222112211222211221122221122112222112211222211221122221122112222112211222',
      sources: [
        { codec: 'av1', src: media + 'hero-auto-720p120-av1.mp4', type: 'video/mp4; codecs="av01.0.05M.10"', bytes: 16800198 },
        // 8-bit on purpose: 10-bit H.265 stalls every ~200 ms when scrubbing on common Intel graphics (measured on HD 620).
        { codec: 'hevc', src: media + 'hero-auto-720p120-hevc8.mp4', type: 'video/mp4; codecs="hvc1.1.6.L93.90"', bytes: 19802138 },
        { codec: 'h264', src: media + 'hero-auto-720p120-h264.mp4', type: 'video/mp4; codecs="avc1.64001f"', bytes: 26795250 },
      ],
    },
    // Earlier versions, opened with ?film=30 (4K), ?film=48 or ?film=96.
    '30': {
      frames: 300, fps: 30, width: 3840, height: 2160,
      sources: [
        { codec: 'av1', src: media + 'hero-auto-4k30-av1.mp4', type: 'video/mp4; codecs="av01.0.12M.10"', bytes: 11197559 },
        { codec: 'h264', src: media + 'hero-auto-4k30-h264.mp4', type: 'video/mp4; codecs="avc1.640033"', bytes: 29831024 },
      ],
    },
    '96': {
      frames: 957, fps: 96, width: 1280, height: 720,
      sources: [
        { codec: 'h264', src: media + 'hero-auto-720p96-h264.mp4', type: 'video/mp4; codecs="avc1.64002a"', bytes: 21495092 },
      ],
    },
    '48': {
      frames: 479, fps: 48, width: 1280, height: 720,
      sources: [
        { codec: 'h264', src: media + 'hero-auto-720p48-h264.mp4', type: 'video/mp4; codecs="avc1.640020"', bytes: 13472990 },
      ],
    },
  };
  const params = new URLSearchParams(location.search);
  const key = FILMS[params.get('film')] ? params.get('film') : '120';
  const film = FILMS[key];
  const MAX_WAIT = 90000;
  const POSTER = media + 'hero-auto-poster.webp';
  const frameTimes = film.steps ? [...film.steps].reduce((list, cells) => (list.push(list[list.length - 1] + cells / 192), list), [0]) : null;
  const state = { key, film, frameTimes, source: null, url: null, revealed: false };
  window.__heroFilm = state;

  const domReady = new Promise(resolve => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
  const loader = () => document.querySelector('.page-loader');
  const heroVideo = () => document.querySelector('.film-story video');

  let shown = 0, phase = 'Pobieranie filmu';
  function setProgress(value, name = phase) {
    if (name !== phase) { phase = name; shown = 0; }
    shown = Math.max(shown, Math.min(1, value));
    const element = loader();
    if (!element) return;
    element.style.setProperty('--load', shown.toFixed(3));
    const label = element.querySelector('.page-loader-value');
    if (label) label.textContent = `${Math.round(shown * 100)}%`;
    const title = element.querySelector('.page-loader-phase');
    if (title) title.textContent = phase;
  }

  async function pickSource() {
    const forced = film.sources.find(source => source.codec === params.get('codec'));
    if (forced) return forced;
    const probe = document.createElement('video');
    const playable = film.sources.filter(source => probe.canPlayType(source.type) !== '');
    // H.264 plays in every browser and decodes fast even without hardware help.
    const universal = list => list.find(source => source.codec === 'h264') || list[list.length - 1];
    if (!playable.length) return universal(film.sources);
    const capabilities = navigator.mediaCapabilities;
    if (!capabilities?.decodingInfo) return universal(playable);
    const rated = await Promise.all(playable.map(source => capabilities.decodingInfo({
      type: 'file',
      video: {
        contentType: source.type,
        width: film.width,
        height: film.height,
        bitrate: Math.max(1, Math.round(source.bytes * 8 * film.fps / film.frames)),
        framerate: film.fps,
      },
    }).then(info => ({ source, info }), () => ({ source, info: null }))));
    const usable = rated.filter(({ info }) => !info || info.supported);
    // Smallest file the device decodes in hardware; otherwise H.264, because software AV1/H.265 stutters when scrubbing.
    const hardware = usable.find(({ info }) => info?.smooth && info?.powerEfficient);
    return hardware ? hardware.source : universal(usable.length ? usable.map(({ source }) => source) : playable);
  }

  async function download(source) {
    const response = await fetch(source.src, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total = Number(response.headers.get('content-length')) || source.bytes;
    if (!response.body?.getReader || !total) return response.blob();
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      setProgress(received / total);
    }
    return new Blob(chunks, { type: 'video/mp4' });
  }

  function waitFor(target, types, timeout) {
    const list = types.split(' ');
    return new Promise(resolve => {
      const done = event => {
        clearTimeout(timer);
        list.forEach(type => target.removeEventListener(type, done));
        resolve(event ? event.type : 'timeout');
      };
      const timer = setTimeout(done, timeout);
      list.forEach(type => target.addEventListener(type, done, { once: true }));
    });
  }

  async function attach(src) {
    await domReady;
    const video = heroVideo();
    if (!video) return false;
    video.dataset.frameCount = String(film.frames);
    video.dataset.frameRate = String(film.fps);
    video.dataset.codec = state.source?.codec || '';
    if (video.getAttribute('src') === src) return !video.error;
    const loaded = waitFor(video, 'loadeddata error', 15000);
    video.src = src;
    video.load();
    const result = await loaded;
    delete video.dataset.warming;
    video.dispatchEvent(new Event('hero-warmed'));
    // Judge by the event: the first scrub seek right after this briefly lowers readyState.
    return result === 'loadeddata' && !video.error;
  }

  function reveal() {
    if (state.revealed) return;
    state.revealed = true;
    setProgress(1);
    root.classList.remove('is-loading');
    root.classList.add('is-revealed');
    const element = loader();
    if (!element) return;
    element.setAttribute('aria-hidden', 'true');
    const hide = () => element.remove();
    element.addEventListener('transitionend', hide, { once: true });
    setTimeout(hide, 1200);
    dispatchEvent(new CustomEvent('hero-film-ready', { detail: state }));
  }

  const compact = matchMedia('(max-width:991px), (hover:none) and (pointer:coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wanted = () => !compact.matches && !reduced.matches;
  let filmReady = null;
  async function load(source) {
    state.source = source;
    try {
      const blob = await download(source);
      if (state.url) URL.revokeObjectURL(state.url);
      state.url = URL.createObjectURL(blob);
      return await attach(state.url);
    } catch (error) {
      state.error = String(error);
      return await attach(source.src);
    }
  }

  function loadFilm() {
    return filmReady ||= (async () => {
      const first = await pickSource();
      if (await load(first)) return;
      // The browser claimed it could play this file but it failed: fall back to H.264, which plays everywhere.
      const fallback = film.sources.find(source => source.codec === 'h264' && source !== first);
      if (!fallback) return;
      state.failed = first.codec;
      shown = 0;
      setProgress(0);
      await load(fallback);
    })();
  }

  domReady.then(() => {
    const video = heroVideo();
    const setPoster = () => { if (video && !compact.matches && !video.poster) video.poster = POSTER; };
    setPoster();
    compact.addEventListener('change', setPoster);
  });

  if (root.classList.contains('is-loading')) {
    domReady.then(() => setProgress(shown));
    const fonts = document.fonts?.ready || Promise.resolve();
    const timeout = new Promise(resolve => setTimeout(resolve, MAX_WAIT));
    Promise.race([Promise.all([loadFilm(), fonts, domReady]), timeout]).then(() => {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    });
  } else {
    domReady.then(() => loader()?.remove());
    const later = () => { if (wanted()) loadFilm(); };
    compact.addEventListener('change', later);
    reduced.addEventListener('change', later);
    later();
  }
})();
