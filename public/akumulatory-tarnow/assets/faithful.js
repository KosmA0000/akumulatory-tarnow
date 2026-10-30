import { setupStoryMotion } from './story-motion.js?v=6015d811d2';
import { scenePixelRatio } from './scene-budget.js?v=2e0c4058b0';
import { compactLayout } from './layout-mode.js?v=20f5ae3bca';

let THREE, sceneModules;
function loadSceneModules() {
  return sceneModules ||= import('./vendor/three.module.min.js').then(maths => { THREE = maths; });
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const mix = (a, b, t) => a + (b - a) * t;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motion.matches;
const activeScenes = new Set();

const heroVideo = $('.hero-video');
if (heroVideo) {
  let inView = false;
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  const syncVideo = () => {
    if (document.hidden || motion.matches || !inView) heroVideo.pause();
    else heroVideo.play().catch(() => {});
  };
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncVideo();
  }).observe($('.hero'));
  document.addEventListener('visibilitychange', syncVideo);
  motion.addEventListener('change', syncVideo);
  syncVideo();
}

const menu = $('.menu');
const menuToggle = $('.menu-toggle');
let menuReturnFocus;
function closeMenu() {
  menu.close();
  menuToggle.setAttribute('aria-expanded', 'false');
  document.documentElement.style.overflow = '';
}
menuToggle.addEventListener('click', () => {
  menuReturnFocus = document.activeElement;
  menu.showModal();
  menuToggle.setAttribute('aria-expanded', 'true');
  document.documentElement.style.overflow = 'hidden';
});
$('[data-menu-close]').addEventListener('click', closeMenu);
$$('a[href^="#"]', menu).forEach(link => link.addEventListener('click', closeMenu));
menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
menu.addEventListener('click', event => {
  if (event.target !== menu) return;
  const box = menu.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeMenu();
});
menu.addEventListener('close', () => menuReturnFocus?.focus({ preventScroll: true }));

const motionState = setupStoryMotion({ preference: motion, onFrame: () => {
  activeScenes.forEach(scene => scene.wake());
  startScenes();
} });
const reviewData = JSON.parse($('#review-source-data').textContent);
const reviewDialog = $('.review-dialog');
let selectedReview = 2;
function selectReview(index, animate = true) {
  const next = (index + reviewData.length) % reviewData.length;
  const preview = $('[data-review-preview]');
  const changed = preview.textContent !== reviewData[next].text;
  selectedReview = next;
  preview.textContent = reviewData[next].text;
  if (animate && changed && !reduced) {
    preview.getAnimations().forEach(animation => animation.cancel());
    preview.animate([
      { opacity: 0, transform: 'translateY(22px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}
selectReview(selectedReview, false);
let dialogClosing = 0;
function openReview(index) {
  clearTimeout(dialogClosing);
  $('[data-review-full-text]').textContent = reviewData[index].text;
  $('[data-review-full-text]').classList.remove('is-changing');
  if (!reviewDialog.open) reviewDialog.showModal();
  document.documentElement.classList.add('review-open');
  requestAnimationFrame(() => reviewDialog.classList.add('is-open'));
}
function closeReview() {
  reviewDialog.classList.remove('is-open');
  clearTimeout(dialogClosing);
  dialogClosing = setTimeout(() => {
    reviewDialog.close();
    document.documentElement.classList.remove('review-open');
    activeScenes.forEach(scene => { scene.lastTime = 0; scene.wake(); });
  }, reduced ? 0 : 320);
}
$('[data-review-close]').addEventListener('click', closeReview);
reviewDialog.addEventListener('cancel', e => { e.preventDefault(); closeReview(); });
reviewDialog.addEventListener('click', e => {
  if (e.target !== reviewDialog) return;
  const b = reviewDialog.getBoundingClientRect();
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeReview();
});
$$('[data-open-review]').forEach(card => {
  card.addEventListener('click', () => openReview(Number(card.dataset.openReview)));
  card.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); openReview(Number(card.dataset.openReview));
  });
});
$('[data-review-preview]').addEventListener('click', () => openReview(selectedReview));
$('[data-review-preview]').addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openReview(selectedReview);
});

// Rendering is suspended outside the section and while the document is hidden.
class LocalScene {
  constructor(stage, camera) {
    this.stage = stage;
    this.camera = camera;
    this.scene = new THREE.Scene();
    // A single-sample, bounded buffer preserves the original curved geometry
    // without the additional multisample surfaces of the previous renderer.
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, stencil: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.stage.append(this.canvas);
    this.frame = 0;
    this.visible = false;
    this.lastTime = 0;
    this.abort = new AbortController();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(8, 8);
    this.resizeObserver = new ResizeObserver(() => { this.resize(); this.wake(); });
    this.resizeObserver.observe(stage);
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      if (this.visible) { this.lastTime = 0; this.wake(); }
    }, { rootMargin: '100px' });
    this.observer.observe(stage);
    stage.classList.add('has-scene');
    this.listen(stage, 'pointermove', event => this.updatePointer(event));
    this.listen(stage, 'pointerleave', () => { this.pointer.set(8, 8); this.wake(); });
    this.listen(this.canvas, 'webglcontextlost', event => {
      event.preventDefault();
      sceneFactories.find(factory => factory.stage === this.stage).failed = true;
      this.destroy();
    });
    activeScenes.add(this);
  }
  listen(target, name, handler, options = {}) { target.addEventListener(name, handler, { ...options, signal: this.abort.signal }); }
  updatePointer(event) {
    const b = this.stage.getBoundingClientRect();
    this.pointer.set((event.clientX - b.left) / b.width * 2 - 1, -(event.clientY - b.top) / b.height * 2 + 1);
    this.wake();
  }
  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setDrawingBufferSize(w, h, scenePixelRatio(w, h, devicePixelRatio));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize?.(w, h);
  }
  wake() {
    if (this.frame || !this.visible || this.stage.dataset.sceneActive === '0' || reduced || document.hidden || this.destroyed) return;
    this.frame = requestAnimationFrame(time => this.render(time));
  }
  render(time) {
    this.frame = 0;
    if (!this.visible || this.stage.dataset.sceneActive === '0' || reduced || document.hidden || this.destroyed) return;
    const dt = this.lastTime ? Math.min(50, time - this.lastTime) : 16.67;
    this.lastTime = time;
    this.update(time, dt);
    this.scene.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
    if (this.shouldContinue?.(time) !== false) this.wake();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.observer.disconnect();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene.traverse(obj => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => materials.add(m));
    });
    materials.forEach(m => {
      if (m.map) textures.add(m.map);
      if (m.uniforms?.uTexture) textures.add(m.uniforms.uTexture.value);
      m.dispose();
    });
    geometries.forEach(g => g.dispose());
    textures.forEach(t => t.dispose());
    this.renderer.dispose();
    this.canvas.remove();
    this.stage.classList.remove('has-scene');
    activeScenes.delete(this);
  }
}

const pacomeVertex = `
  varying vec2 vUv;
  uniform float uScrollSpeed;
  uniform float uBendStrength;
  void main(){
    vUv=uv;
    vec3 worldPosition=(modelMatrix*vec4(position,1.)).xyz;
    vec3 newPosition=position;
    newPosition.z=sin(uv.x*3.14159265)*.2;
    vec4 viewPosition=viewMatrix*modelMatrix*vec4(newPosition,1.);
    viewPosition.x+=pow(worldPosition.y,2.)*uBendStrength;
    viewPosition.x+=sin(uv.y*3.14159265)*uScrollSpeed*2.;
    gl_Position=projectionMatrix*viewPosition;
  }`;
const pacomeFragment = `
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uRatio;
  uniform vec3 uBackground;
  uniform float uColorStrength,uZoom,uRevealProgress,uViewportHeight;
  void main(){
    vec2 uv=vUv*uRatio+(1.-uRatio)*.5;
    vec2 zoomed=(uv-.5)/uZoom+.5;
    vec3 color=texture2D(uTexture,zoomed).rgb;
    if(!gl_FrontFacing)color=texture2D(uTexture,vec2(1.-uv.x,uv.y)).rgb;
    else color=mix(color,vec3(0.),uColorStrength);
    float reveal=clamp(uRevealProgress,0.,1.);
    float radius=.05*reveal;
    vec2 d=abs(vUv-.5)-vec2(reveal)*.5+radius;
    float sdf=length(max(d,0.))-radius;
    float alpha=(1.-smoothstep(0.,.002,sdf))*smoothstep(.1,1.,reveal);
    float screenY=gl_FragCoord.y/uViewportHeight;
    float fade=clamp(max(1.-screenY/.2,(screenY-.8)/.2),0.,1.);
    color=mix(color,uBackground,fade);
    gl_FragColor=vec4(color,alpha);
    #include <colorspace_fragment>
  }`;

class BrandHelix extends LocalScene {
  constructor(stage) {
    super(stage, new THREE.PerspectiveCamera(35, 1, .1, 100));
    this.camera.position.set(0, 0, 8.1);
    this.data = JSON.parse($('#brand-scene-data').textContent);
    this.geometry = new THREE.PlaneGeometry(1, 1, 8, 8);
    this.planes = [];
    this.velocity = 0;
    this.targetVelocity = 0;
    this.direction = 1;
    this.offset = 0;
    this.started = 0;
    this.hovered = null;
    this.touch = null;
    this.skipClick = 0;
    this.loader = new THREE.TextureLoader();
    this.data.forEach((brand, index) => {
      const placeholder = this.textTexture(brand.label);
      const uniforms = {
        uTexture: { value: placeholder }, uRatio: { value: new THREE.Vector2(1, 1) },
        uScrollSpeed: { value: 0 }, uColorStrength: { value: 0 },
        uBendStrength: { value: compactLayout.matches ? .02 : .1 },
        uBackground: { value: new THREE.Color('#111510') },
        uZoom: { value: 1 }, uRevealProgress: { value: 0 }, uViewportHeight: { value: stage.clientHeight * this.renderer.getPixelRatio() }
      };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader: pacomeVertex, fragmentShader: pacomeFragment, side: THREE.DoubleSide, transparent: true });
      for (let repeat = 0; repeat < 2; repeat++) {
        const planeMaterial = material.clone();
        // Uniform cloning also clones textures. Share the original placeholder so
        // replacing it can release its GPU allocation for both visual copies.
        planeMaterial.uniforms.uTexture.value = placeholder;
        const mesh = new THREE.Mesh(this.geometry, planeMaterial);
        mesh.userData = { index: index + repeat * this.data.length, brand, hidden: 1, hover: 0 };
        mesh.scale.set(2.05, 1.205, 1);
        this.scene.add(mesh);
        this.planes.push(mesh);
      }
      if (!brand.image.includes('default')) this.loader.load(brand.image, texture => {
        if (this.destroyed) { texture.dispose(); return; }
        // Original wide logos remain complete inside the reference's 1.7:1 plane.
        const fitted = this.brandTexture(texture.image);
        texture.dispose();
        this.planes.filter(p => p.userData.brand === brand).forEach(p => {
          p.material.uniforms.uTexture.value = fitted;
          p.material.uniforms.uRatio.value.set(1, 1);
        });
        placeholder.dispose();
        this.wake();
      });
      material.dispose();
    });
    this.planes.sort((a, b) => a.userData.index - b.userData.index);
    this.onResize = (w, h) => {
      this.camera.fov = w < 992 ? 40 : 35;
      // Larger planes, with a separate fitted camera on narrow screens.
      this.camera.position.z = w < 992 ? Math.max(8.5, 3.55 / (Math.tan(THREE.MathUtils.degToRad(20)) * (w / h))) : 8.1;
      this.camera.updateProjectionMatrix();
      this.planes.forEach(p => {
        p.material.uniforms.uViewportHeight.value = h * this.renderer.getPixelRatio();
        p.material.uniforms.uBendStrength.value = compactLayout.matches ? .02 : .1;
      });
    };
    this.resize();
    this.listen(stage, 'wheel', e => {
      this.targetVelocity = clamp(this.targetVelocity + e.deltaY * .00015, -2, 2);
      this.direction = e.deltaY > 0 ? 1 : -1;
    }, { passive: true });
    this.listen(stage, 'pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      this.touch = { start: e.clientX, last: e.clientX, dx: 0, dragged: false, id: e.pointerId };
    });
    this.listen(stage, 'pointermove', e => {
      const t = this.touch;
      if (!t || t.id !== e.pointerId) return;
      t.dx = e.clientX - t.last;
      t.last = e.clientX;
      if (Math.abs(e.clientX - t.start) > 8) t.dragged = true;
      if (t.dragged) {
        if (!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
        this.targetVelocity = clamp(this.targetVelocity + t.dx * .0015, -2, 2);
        this.direction = t.dx > 0 ? 1 : -1;
      }
    });
    const release = e => {
      if (!this.touch || this.touch.id !== e.pointerId) return;
      if (this.touch.dragged) {
        this.targetVelocity = clamp(this.targetVelocity + this.touch.dx * .001, -2, 2);
        this.skipClick = performance.now() + 400;
      }
      this.touch = null;
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    };
    this.listen(window, 'pointerup', release);
    this.listen(window, 'pointercancel', release);
    this.listen(stage, 'lostpointercapture', release);
    this.listen(window, 'blur', () => { if (this.touch) release({ pointerId: this.touch.id }); });
    this.listen(stage, 'click', e => {
      if (performance.now() < this.skipClick) return;
      this.updatePointer(e);
      const hit = this.pick();
      if (hit) location.href = hit.userData.brand.href;
    });
    this.listen(stage, 'keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'Enter' && this.hovered) location.href = this.hovered.userData.brand.href;
      else this.targetVelocity += e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -.15 : .15;
    });
  }
  textTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 510; canvas.height = 300;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(.6, .6);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 850, 500);
    ctx.fillStyle = '#171717'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '500 60px Arial'; ctx.fillText(text, 425, 250, 760);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  brandTexture(image) {
    const canvas = document.createElement('canvas');
    canvas.width = 510; canvas.height = 300;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(.6, .6);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 850, 500);
    const fit = Math.min(760 / image.width, 410 / image.height);
    const width = image.width * fit, height = image.height * fit;
    ctx.drawImage(image, (850 - width) / 2, (500 - height) / 2, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(2, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  pick() {
    if (Math.abs(this.pointer.x) > 1 || Math.abs(this.pointer.y) > 1) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.planes)[0];
    if (!hit || hit.object.userData.hidden >= .01) return null;
    const front = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).dot(this.raycaster.ray.direction) < 0;
    return front ? hit.object : null;
  }
  update(time, dt) {
    if (!this.started) this.started = time;
    const frames = dt / (1000 / 60);
    this.velocity += (this.targetVelocity - this.velocity) * (1 - Math.pow(.9, frames));
    this.offset += this.velocity * frames;
    const idleSpeed = this.stage.clientWidth < 992 ? .009 : .007;
    if (Math.abs(this.targetVelocity) < idleSpeed) this.targetVelocity = this.direction * idleSpeed;
    this.targetVelocity *= Math.pow(.9, frames);
    const total = this.planes.length;
    const hovered = this.touch ? null : this.pick();
    this.hovered = hovered;
    this.canvas.style.cursor = hovered ? 'pointer' : '';
    const label = $('.pacome-hover-label');
    label.textContent = hovered?.userData.brand.label || '';
    label.classList.toggle('is-visible', Boolean(hovered));
    this.planes.forEach((mesh, index) => {
      const data = mesh.userData;
      const age = time - this.started - 200 - (index % 4) * 50;
      if (age > 0) data.hidden = mix(data.hidden, 0, 1 - Math.pow(.95, dt * .15));
      data.hover = mix(data.hover, mesh === hovered ? 1 : 0, 1 - Math.pow(1 - (mesh === hovered ? .09 : .07), dt * .2));
      const n = ((index - this.offset) % total + total) % total;
      const b = n - Math.floor(total / 2);
      const angle = b * .85;
      const radius = 2.35 * (1 - data.hidden / 2);
      mesh.position.set(Math.cos(angle) * radius, b * .68 - .8 + data.hidden * 1.5, Math.sin(angle) * radius);
      mesh.rotation.y = -angle + Math.PI / 2;
      const u = mesh.material.uniforms;
      u.uScrollSpeed.value = this.velocity;
      u.uColorStrength.value = .2 * data.hover;
      u.uZoom.value = 1 + .05 * data.hover;
      u.uRevealProgress.value = (1 - .05 * data.hover) * (1 - data.hidden);
    });
  }
}

// The supplied recording shows CLOU's Projects ring: radial, flat image planes.
// Use its radius, plane ratio, camera, tilt, entrance and two browsing positions.
// Visual slots repeat the five sourced reviews; they are not additional reviews.
class ReviewRing extends LocalScene {
  constructor(stage) {
    super(stage, new THREE.PerspectiveCamera(50, 1, .1, 70));
    this.camera.position.z = 31;
    this.scene.fog = new THREE.Fog(0xfafbf8, 31, 38);
    this.ring = new THREE.Group();
    this.scene.add(this.ring);
    this.container = stage.closest('.reviews-camera');
    this.container.classList.add('has-review-ring');
    this.amount = reviewData.length * 12;
    this.radius = 5.5;
    this.interval = 2 * Math.PI / this.amount;
    this.geometry = new THREE.PlaneGeometry(.9, .5);
    this.panels = [];
    this.hoverSurfaces = [];
    this.hoverMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const textures = reviewData.map(q => this.quoteTexture(q.text));
    for (let i = 0; i < this.amount; i++) {
      const material = new THREE.MeshBasicMaterial({ map: textures[i % reviewData.length], side: THREE.FrontSide, transparent: true });
      const holder = new THREE.Group();
      const angle = i * this.interval;
      holder.position.set(Math.cos(angle) * this.radius, 0, Math.sin(angle) * this.radius);
      holder.rotation.y = -angle;
      const panel = new THREE.Mesh(this.geometry, material);
      panel.userData = { review: i % reviewData.length, index: i, angle, holder };
      // Two outward faces keep text readable from either side of the ring.
      const back = new THREE.Mesh(this.geometry, material.clone());
      back.rotation.y = Math.PI;
      back.position.z = -.0001;
      back.userData.panel = panel;
      panel.userData.back = back;
      panel.add(back);
      panel.visible = false;
      holder.add(panel);
      this.panels.push(panel);
      this.ring.add(holder);
      // Hover uses the resting footprint, so the visual pop-out cannot move
      // its own hit area onto a neighbour and repeatedly restart the preview.
      // These surfaces are never added to the rendered scene.
      const hoverSurface = new THREE.Mesh(this.geometry, this.hoverMaterial);
      hoverSurface.matrixAutoUpdate = false;
      hoverSurface.userData.panel = panel;
      this.hoverSurfaces.push(hoverSurface);
    }
    this.current = 0;
    this.target = 0;
    this.started = 0;
    this.focused = false;
    this.zoom = 0;
    this.skipClick = 0;
    this.drag = null;
    this.onResize = (w, h) => {
      const aspect = w / h;
      this.camera.setFocalLength(aspect < 1 ? 57 * aspect : Math.min(57, 57 * 1.981424 / aspect));
    };
    this.resize();
    stage.tabIndex = 0;
    stage.setAttribute('aria-description', 'Przeciągnij karty. Kliknij kartę, aby przybliżyć. Strzałki zmieniają opinię, Enter otwiera, Escape oddala.');
    stage.dataset.reviewView = 'overview';
    this.listen(stage, 'pointermove', e => {
      this.keyboardMode = false;
      const drag = this.drag;
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.lastX;
      drag.lastX = e.clientX;
      if (Math.abs(e.clientX - drag.startX) > 6) drag.moved = true;
      if (!drag.moved) return;
      if (!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
      this.target += dx * (this.focused ? .0035 : .002) * (this.focused ? 1 : drag.sign);
    });
    this.listen(stage, 'pointerdown', e => {
      if (e.button !== 0) return;
      this.wake();
      stage.focus({ preventScroll: true });
      this.updatePointer(e);
      this.drag = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, sign: this.pointer.y >= 0 ? 1 : -1, moved: false, held: false };
      clearTimeout(this.holdTimer);
      this.holdTimer = setTimeout(() => {
        if (this.drag) { this.drag.held = true; this.wake(); }
      }, 150);
    });
    const release = e => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      if (this.drag.moved) this.skipClick = performance.now() + 400;
      clearTimeout(this.holdTimer);
      this.drag = null;
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      this.wake();
    };
    this.listen(window, 'pointerup', release);
    this.listen(window, 'pointercancel', release);
    this.listen(stage, 'lostpointercapture', release);
    this.listen(window, 'blur', () => { if (this.drag) release({ pointerId: this.drag.id }); });
    // Wheel input belongs to the page. Only this ring has time-based autoplay.
    this.listen(stage, 'click', e => {
      if (performance.now() < this.skipClick || this.transition) return;
      this.updatePointer(e);
      const panel = this.pick();
      if (panel) {
        selectReview(panel.userData.review);
        if (this.focused) openReview(panel.userData.review);
        else this.setFocused(true, panel);
      } else if (this.focused) this.setFocused(false);
    });
    this.listen(stage, 'keydown', e => {
      this.wake();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.keyboardMode = true;
        this.target += (e.key === 'ArrowRight' ? 1 : -1) * this.interval;
        selectReview(selectedReview + (e.key === 'ArrowRight' ? 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.focused) openReview(selectedReview);
        else this.setFocused(true, this.panels.find(p => p.userData.review === selectedReview));
      } else if (e.key === 'Escape' && this.focused) {
        e.preventDefault();
        this.setFocused(false);
      }
    });
  }
  setFocused(focused, panel) {
    this.focused = focused;
    this.transition = { start: performance.now(), from: this.zoom, to: focused ? 1 : 0 };
    this.container.classList.toggle('is-review-focused', focused);
    this.stage.dataset.reviewView = focused ? 'focused' : 'overview';
    if (focused && panel) {
      // Place the chosen plane on the near left edge of the enlarged ring.
      const desired = panel.userData.angle - Math.PI;
      this.target += Math.atan2(Math.sin(desired - this.target), Math.cos(desired - this.target));
    }
    this.wake();
  }
  quoteTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 285;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(1 / 3, 1 / 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1536, 854);
    ctx.strokeStyle = '#daddd4'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 1532, 850);
    ctx.fillStyle = '#1d211a';
    ctx.font = '500 50px Arial'; ctx.fillText('Google', 72, 100);
    ctx.font = '44px Arial'; ctx.fillText('★★★★★', 1180, 100);
    ctx.font = '400 88px Arial';
    const words = text.split(/\s+/);
    const lines = []; let line = '';
    words.forEach(word => {
      if (ctx.measureText(line + ' ' + word).width > 1380 && line) { lines.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    });
    if (line) lines.push(line);
    const maxLines = 5;
    lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(i === maxLines - 1 && lines.length > maxLines ? l.replace(/\s\S*$/, '') + '…' : l, 72, 245 + i * 104));
    ctx.font = '400 28px Arial'; ctx.fillStyle = '#74796f'; ctx.fillText('Opinia z Google', 72, 798);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(2, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  pick(stableHover = false) {
    if (Math.abs(this.pointer.x) > 1 || Math.abs(this.pointer.y) > 1) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (stableHover) this.hoverSurfaces.forEach(surface => {
      const panel = surface.userData.panel;
      surface.matrixWorld.copy(panel.userData.holder.matrixWorld).scale(panel.scale);
    });
    const hit = this.raycaster.intersectObjects(stableHover ? this.hoverSurfaces : this.panels, !stableHover).find(hit => {
      const panel = hit.object.userData.panel || hit.object;
      return panel.visible && panel.material.opacity > .6 && hit.distance < this.scene.fog.far;
    });
    return hit ? hit.object.userData.panel || hit.object : null;
  }
  update(time, dt) {
    // Start when the section is painted, rather than while the sticky scene is hidden.
    if (!this.started && Number(getComputedStyle(this.stage).opacity) > .15) this.started = time;
    if (!this.started) return;
    const frames = dt / (1000 / 60);
    const age = Math.max(0, time - this.started - 200);
    const entrance = clamp(age / 1100);
    const entranceMove = 1 - (1 - entrance) ** 2;
    const yawProgress = clamp(age / 1870);
    const yaw = Math.PI / 2 * (1 - Math.sqrt(1 - (yawProgress - 1) ** 2));
    if (this.transition) {
      const t = clamp((time - this.transition.start) / 1320);
      const ease = t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      this.zoom = mix(this.transition.from, this.transition.to, ease);
      if (t === 1) this.transition = null;
    }
    // Pause on the resting card footprint before moving the ring. This keeps a
    // stationary pointer from cycling neighbouring reviews during autoplay.
    const restingHit = entrance === 1 && !this.drag?.moved && !this.transition && !reviewDialog.open ? this.pick(true) : null;
    const autoplay = age >= 2200 && !restingHit && !this.drag && !this.transition && !this.focused && !this.keyboardMode && !reviewDialog.open;
    if (autoplay) {
      const turn = dt / 1000 * .16;
      this.current += turn;
      this.target += turn;
    }
    // Follow a held drag promptly; retain only a short ease after release.
    const dragRetention = this.drag?.moved ? .25 : this.focused ? .82 : .84;
    this.current = mix(this.current, this.target, 1 - Math.pow(dragRetention, frames));
    this.ring.position.set(6.6 * this.zoom, mix(.55 * entranceMove, .25, this.zoom), mix(-10 * (1 - entranceMove), 22, this.zoom));
    this.ring.rotation.set(THREE.MathUtils.degToRad(mix(30, 12, this.zoom)), this.current + yaw, 0);
    this.scene.fog.near = mix(31, 6, this.zoom);
    this.scene.fog.far = mix(38, 16, this.zoom);
    // The camera stays fixed. Pointer movement only identifies a hovered card;
    // the ring rotates on its own or through deliberate drag and keyboard input.
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    const hit = !this.drag?.moved && !this.transition && !reviewDialog.open && entrance === 1 ? this.pick(true) : null;
    this.canvas.style.cursor = this.drag?.moved || this.drag?.held ? 'grabbing' : hit ? 'pointer' : 'grab';
    this.container.classList.toggle('is-review-dragging', Boolean(this.drag?.held));
    if (hit && !this.keyboardMode && hit.userData.review !== selectedReview) selectReview(hit.userData.review);
    this.panels.forEach((panel, index) => {
      // Same directional reveal around the ring; front and rear cards stay separate planes.
      const revealAt = Math.pow(index / this.amount, 2.3) * 1100;
      panel.visible = age >= revealAt;
      panel.material.opacity = clamp((age - revealAt) / 180);
      panel.userData.back.material.opacity = panel.material.opacity;
      panel.scale.setScalar(mix(1.8, 1, this.zoom));
      panel.position.x = mix(panel.position.x, panel === hit ? .3 : 0, 1 - Math.pow(.78, frames));
    });
    this.motionPending = autoplay || age < 2200 || Boolean(this.transition) || Boolean(this.drag)
      || Math.abs(this.current - this.target) > .0001
      || this.panels.some(panel => Math.abs(panel.position.x - (panel === hit ? .3 : 0)) > .001);
  }
  shouldContinue() {
    return Boolean(this.motionPending);
  }
  destroy() {
    clearTimeout(this.holdTimer);
    this.hoverMaterial.dispose();
    this.hoverSurfaces.length = 0;
    this.container.classList.remove('has-review-ring', 'is-review-focused', 'is-review-dragging');
    this.stage.removeAttribute('aria-description');
    this.stage.removeAttribute('data-review-view');
    super.destroy();
  }
}

const sceneFactories = [
  { stage: $('.pacome-stage'), Scene: BrandHelix, allowed: false },
  { stage: $('.clou-stage'), Scene: ReviewRing, allowed: false }
];
const sceneStartObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const factory = sceneFactories.find(factory => factory.stage === entry.target);
    factory.allowed = true;
    sceneStartObserver.unobserve(entry.target);
  }
  startScenes();
}, { rootMargin: '200px' });
async function startScenes() {
  if (reduced) return;
  for (const factory of sceneFactories) {
    const { stage, Scene } = factory;
    if (factory.failed) continue;
    if (Scene === ReviewRing && compactLayout.matches) continue;
    if ([...activeScenes].some(scene => scene.stage === stage)) continue;
    // Reserve the final layout without allocating any images or scene objects.
    // The observer starts each scene shortly before it enters the viewport.
    stage.classList.add('has-scene');
    if (Scene === ReviewRing) stage.closest('.reviews-camera').classList.add('has-review-ring');
    if (!factory.allowed) {
      sceneStartObserver.observe(stage);
      continue;
    }
    if (stage.dataset.sceneActive === '0') continue;
    try {
      await loadSceneModules();
      if (reduced || (Scene === ReviewRing && compactLayout.matches)) continue;
      if (![...activeScenes].some(scene => scene.stage === stage)) new Scene(stage);
    }
    catch (error) {
      factory.failed = true;
      [...activeScenes].find(scene => scene.stage === stage)?.destroy();
      stage.classList.remove('has-scene');
      if (Scene === ReviewRing) stage.closest('.reviews-camera').classList.remove('has-review-ring');
      console.warn('Widok statyczny jest dostępny, ponieważ nie udało się uruchomić animacji.', error);
    }
  }
}
startScenes();
compactLayout.addEventListener('change', event => {
  if (event.matches) {
    [...activeScenes].filter(scene => scene instanceof ReviewRing).forEach(scene => scene.destroy());
    const reviewStage = $('.clou-stage');
    sceneStartObserver.unobserve(reviewStage);
    reviewStage.classList.remove('has-scene');
    reviewStage.closest('.reviews-camera').classList.remove('has-review-ring');
    startScenes();
  }
  else startScenes();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) activeScenes.forEach(scene => { scene.lastTime = 0; scene.wake(); });
});
motion.addEventListener('change', event => {
  reduced = event.matches;
  if (reduced) {
    [...activeScenes].forEach(scene => scene.destroy());
    sceneStartObserver.disconnect();
    sceneFactories.forEach(({ stage, Scene }) => {
      stage.classList.remove('has-scene');
      if (Scene === ReviewRing) stage.closest('.reviews-camera').classList.remove('has-review-ring');
    });
    motionState.refresh();
    $$('.arrival').forEach(el => { el.getAnimations().forEach(a => a.finish()); el.classList.add('is-arrived'); });
  } else startScenes();
  motionState.refresh();
});
