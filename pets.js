// Tiny pixel-art blobs, ported from the DockPet app's BlobRenderer, that hop
// along the top edge of each section card. Gold in dark mode, pink in light mode.
(() => {
  const W = 24, H = 26;          // pixel grid
  const SCALE = 2;               // CSS px per grid pixel (integer keeps it crisp)
  const BASE = 1;                // grid row the body's flat bottom sits on
  const HALF_W = 7.5, BODY_H = 11; // body size in grid pixels
  const HOP_DIST = 34, HOP_H = 10;

  const PALETTES = {
    dark:  { outline: '#7a5a1e', body: '#e6bd6a', shade: '#c9953f', highlight: '#fff3d6', eye: '#2a1f10', glint: '#ffffff', blush: '#f09a78' },
    light: { outline: '#b24a70', body: '#f6abc3', shade: '#ed7a9e', highlight: '#ffecf3', eye: '#3b1c28', glint: '#ffffff', blush: '#e2587f' },
  };
  const GLYPHS = {
    heart:   { rows: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], color: '#ff6f91' },
    sparkle: { rows: ['.#.', '###', '.#.'], color: '#fff3a0' },
  };
  const GLYPH_OUTLINE = '#26303a';

  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const RGB = {};
  for (const [name, pal] of Object.entries(PALETTES)) {
    RGB[name] = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, rgb(v)]));
  }
  for (const g of Object.values(GLYPHS)) g.rgb = rgb(g.color);
  const OUTLINE_RGB = rgb(GLYPH_OUTLINE);

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeName = () => (root.dataset.theme === 'light' ? 'light' : 'dark');
  const rand = (a, b) => a + Math.random() * (b - a);

  function draw(img, pose, pal) {
    const data = img.data;
    data.fill(0);
    const rx = HALF_W * pose.squashX, hy = BODY_H * pose.squashY;
    const cx = W / 2, ry = hy / 2, cy = BASE + ry;
    const shift = py => pose.lean * Math.max(0, Math.min(1, (py - BASE) / hy)) * 3;

    const set = (x, y, c) => {
      if (x < 0 || x >= W || y < 0 || y >= H) return;
      const o = ((H - 1 - y) * W + x) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    };
    const filled = (x, y) => x < 0 || x >= W || y < 0 || y >= H || data[((H - 1 - y) * W + x) * 4 + 3] > 0;

    // body: superellipse, rounder on top and flatter at the bottom
    const mask = new Uint8Array(W * H), nx = new Float32Array(W * H), ny = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const py = y + 0.5, s = shift(py);
      for (let x = 0; x < W; x++) {
        const dx = (x + 0.5 - cx - s) / rx, dy = (py - cy) / ry, n = dy > 0 ? 2.2 : 3.5;
        if (Math.abs(dx) ** n + Math.abs(dy) ** n <= 1) {
          const i = y * W + x;
          mask[i] = 1; nx[i] = dx; ny[i] = dy;
        }
      }
    }
    const inside = (x, y) => x >= 0 && x < W && y >= 0 && y < H && mask[y * W + x];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!mask[i]) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const hx = nx[i] + 0.62, hyy = ny[i] - 0.55;   // highlight on the upper-left shoulder, clear of the eye
        set(x, y, edge ? pal.outline : hx * hx + hyy * hyy < 0.05 ? pal.highlight : ny[i] < -0.55 ? pal.shade : pal.body);
      }
    }

    // face; never within a pixel of the outline, so a lean or glance can't notch the body
    const face = (x, y, c) => { if (inside(x - 2, y) && inside(x + 2, y) && inside(x, y - 1) && inside(x, y + 1)) set(x, y, c); };
    const eyeRow = BASE + hy * 0.52 + pose.lookY;
    const ey = Math.floor(eyeRow);
    const faceShift = shift(eyeRow) + pose.lookX * 1.5;
    const lx = Math.round(cx + faceShift - 4.5);
    for (const ex of [lx, lx + 7]) {
      if (pose.eyes === 'happy') {
        face(ex - 1, ey, pal.eye); face(ex, ey + 1, pal.eye); face(ex + 1, ey + 1, pal.eye); face(ex + 2, ey, pal.eye);
      } else {
        const eh = Math.max(1, Math.round(3 * pose.eyeOpenness));
        const bottom = ey + Math.floor((3 - eh) / 2);
        for (let d = 0; d < eh; d++) { face(ex, bottom + d, pal.eye); face(ex + 1, bottom + d, pal.eye); }
        if (eh === 3) face(ex, bottom + 2, pal.glint);
      }
    }
    const mx = Math.round(cx + faceShift), my = ey - 2;
    if (pose.mouth === 'smile') {
      face(mx - 2, my + 1, pal.eye); face(mx - 1, my, pal.eye); face(mx, my, pal.eye); face(mx + 1, my + 1, pal.eye);
    }
    if (pose.blush) {
      for (const bx of [lx - 2, lx - 1, lx + 9, lx + 10]) if (inside(bx, ey - 1)) set(bx, ey - 1, pal.blush);
    }

    // floating glyph above the head, with a dark edge for contrast
    if (pose.glyph) {
      const g = GLYPHS[pose.glyph], gw = g.rows[0].length, gh = g.rows.length;
      const gx = Math.round(cx - gw / 2 + shift(BASE + hy)), gy = BASE + Math.ceil(hy) + 2;
      const px = [];
      g.rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') px.push([gx + c, gy + gh - 1 - r]); }));
      for (const [x, y] of px) for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (!filled(ax, ay)) set(ax, ay, OUTLINE_RGB);
      for (const [x, y] of px) set(x, y, g.rgb);
    }
  }

  class Blob {
    constructor(panel) {
      this.panel = panel;
      this.wrap = document.createElement('div');
      this.wrap.className = 'section-pet';
      this.wrap.setAttribute('aria-hidden', 'true');
      this.canvas = document.createElement('canvas');
      this.canvas.width = W; this.canvas.height = H;
      const hit = document.createElement('div');
      hit.className = 'section-pet-hit';
      this.wrap.append(this.canvas, hit);
      panel.appendChild(this.wrap);
      this.ctx = this.canvas.getContext('2d');
      this.img = this.ctx.createImageData(W, H);

      this.x = rand(0.1, 0.8) * this.maxX();
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.state = 'idle';
      this.stateUntil = performance.now() + rand(800, 4000);
      this.blinkAt = performance.now() + rand(1500, 4000);
      this.lookX = 0;
      this.treat = null;          // {glyph, until}: brief happy reaction
      this.visible = false;
      this.lastKey = '';
      hit.addEventListener('mouseenter', () => this.cheer('heart'));
    }

    maxX() { return Math.max(0, this.panel.clientWidth - W * SCALE - 24); }

    cheer(glyph) {
      this.treat = { glyph, until: performance.now() + 1100 };
      if (this.state === 'idle' && !reduceMotion) this.startHops(this.x, performance.now());
    }

    startHops(target, now) {
      this.fromX = this.x;
      this.targetX = target;
      const dist = target - this.x;
      if (dist) this.dir = Math.sign(dist);
      this.hopsLeft = Math.max(1, Math.min(4, Math.ceil(Math.abs(dist) / HOP_DIST)));
      this.hopStep = dist / this.hopsLeft;
      this.beginHop(now);
    }

    beginHop(now) {
      this.state = 'hop';
      this.hopStart = now;
      this.hopX0 = this.x;
    }

    update(now) {
      const pose = { squashX: 1, squashY: 1, lean: 0, lookX: this.lookX, lookY: 0, eyeOpenness: 1, eyes: 'open', mouth: 'none', blush: false, glyph: null };
      let lift = 0;

      if (!reduceMotion) {
        if (this.state === 'idle') {
          const breath = Math.sin(now / 520 + this.x) * 0.035;
          pose.squashY = 1 + breath; pose.squashX = 1 - breath * 0.7;
          if (now > this.blinkAt) {
            pose.eyeOpenness = 0;
            if (now > this.blinkAt + 130) this.blinkAt = now + rand(2200, 5200);
          }
          if (Math.random() < 0.004) this.lookX = [-1, 0, 1][Math.floor(Math.random() * 3)];
          if (now > this.stateUntil) this.startHops(rand(0, this.maxX()), now);
        } else {
          // one hop = crouch (90ms) -> airborne (420ms) -> landing squash (110ms)
          const t = now - this.hopStart;
          pose.lookX = this.dir;
          if (t < 90) {
            pose.squashX = 1.18; pose.squashY = 0.82;
          } else if (t < 510) {
            const p = (t - 90) / 420;
            lift = HOP_H * 4 * p * (1 - p);
            this.x = this.hopX0 + this.hopStep * p;
            const stretch = 1.12 - 0.12 * Math.sin(Math.PI * p);
            pose.squashY = stretch; pose.squashX = 1 / stretch;
            pose.lean = this.dir * 0.35;
            pose.lookX = 0;
          } else if (t < 620) {
            this.x = this.hopX0 + this.hopStep;
            const k = 1 - (t - 510) / 110;
            pose.squashX = 1 + 0.2 * k; pose.squashY = 1 - 0.2 * k;
          } else if (--this.hopsLeft > 0) {
            this.beginHop(now);
          } else {
            this.state = 'idle';
            this.stateUntil = now + rand(3000, 8000);
            this.lookX = 0;
            if (!this.treat && Math.random() < 0.2) this.treat = { glyph: 'sparkle', until: now + 900 };
          }
        }
      }

      if (this.treat) {
        if (now < this.treat.until) {
          pose.eyes = 'happy'; pose.mouth = 'smile'; pose.blush = true; pose.glyph = this.treat.glyph;
        } else {
          this.treat = null;
        }
      }

      const theme = themeName();
      const key = JSON.stringify(pose) + theme;
      if (key !== this.lastKey) {
        draw(this.img, pose, RGB[theme]);
        this.ctx.putImageData(this.img, 0, 0);
        this.lastKey = key;
      }
      this.wrap.style.transform = `translate(${this.x.toFixed(1)}px, ${(-lift).toFixed(1)}px)`;
    }
  }

  const panels = document.querySelectorAll('main .panel');
  if (!panels.length) return;
  const blobs = [...panels].map(p => new Blob(p));

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const blob = blobs.find(b => b.panel === e.target);
      if (blob) blob.visible = e.isIntersecting;
    }
  }, { rootMargin: '80px' });
  panels.forEach(p => io.observe(p));

  // keep blobs inside their card when the layout width changes
  window.addEventListener('resize', () => blobs.forEach(b => { b.x = Math.min(b.x, b.maxX()); }));

  const tick = now => {
    for (const b of blobs) if (b.visible) b.update(now);
    requestAnimationFrame(tick);
  };
  blobs.forEach(b => b.update(performance.now()));
  requestAnimationFrame(tick);
})();
