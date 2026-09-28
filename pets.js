// Tiny pixel-art blobs, ported from the DockPet app's BlobRenderer. Each section
// gets one that treats it like a little platformer: it hops along the card's top
// edge, jumps onto boxes (cards, images, logos) and onto lines of text, drops down,
// and climbs the card's outer wall when a ledge is too high to jump to.
// Gold in dark mode, pink in light mode.
(() => {
  const W = 24, H = 26;          // pixel grid
  const SCALE = 3;               // CSS px per grid pixel (integer keeps it crisp)
  const BASE = 1;                // grid row the body's flat bottom sits on
  const HALF_W = 7.5, BODY_H = 11; // body size in grid pixels
  const HOP_DIST = 50, HOP_H = 15;  // walking hops along one surface, CSS px

  // movement tuning, CSS px
  const CANVAS_W = W * SCALE, FEET = (H - BASE) * SCALE;  // canvas point that sits on a surface
  const BODY_HALF = HALF_W * SCALE;
  const JUMP_UP = 70;         // highest ledge reachable in one jump; above this the blob climbs
  const MAX_REACH_X = 320;    // ignore ledges farther than this sideways (unless climbing)
  const CLIMB_SPEED = 75;     // px per second up a wall
  const MIN_SPAN = 30;        // narrowest surface worth standing on
  const BOX_SELECTOR = '.project-card, .resume-preview, .resume-actions a, .skills-logos img, .lab-skill, .extracurricular-image, .project-image img, .about-photo img';
  const SKIP_TEXT = '.card-arrow, .sr-only, svg';

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

  const main = document.querySelector('main.content');
  const sections = main ? [...main.querySelectorAll('.panel')] : [];
  if (!sections.length) return;

  const layer = document.createElement('div');
  layer.className = 'pet-layer';
  main.appendChild(layer);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const linger = kind => (kind === 'line' ? rand(2500, 5000) : rand(4000, 9000));  // don't sit on text for long

  // Surfaces are stored relative to an anchor element, so a blob standing on
  // one follows it through scroll-reveal transforms, card hover lifts, etc.
  function surface(anchor, kind, x1, x2, y) {
    const a = anchor.getBoundingClientRect();
    return { anchor, kind, ox1: x1 - a.left, ox2: x2 - a.left, oy: y - a.top };
  }
  function geom(s) {
    const a = s.anchor.getBoundingClientRect(), L = layer.getBoundingClientRect();
    return { x1: a.left + s.ox1 - L.left, x2: a.left + s.ox2 - L.left, y: a.top + s.oy - L.top };
  }
  const toLayer = r => { const L = layer.getBoundingClientRect(); return { left: r.left - L.left, right: r.right - L.left, top: r.top - L.top }; };

  const storyView = () => root.dataset.layout !== 'sidebar';

  // Home ledge: the card's top edge in sidebar view; in story view cards are
  // invisible, so it's the rule under the chapter heading instead.
  function edgeSurface(section) {
    const heading = storyView() && section.querySelector(':scope > h1');
    if (heading) {
      const h = heading.getBoundingClientRect();
      return surface(heading, 'edge', h.left + BODY_HALF, h.right - BODY_HALF, h.bottom);
    }
    const r = section.getBoundingClientRect();
    return surface(section, 'edge', r.left + BODY_HALF + 12, r.right - BODY_HALF - 12, r.top);
  }

  function findSurfaces(section) {
    const list = [edgeSurface(section)];
    const prev = section.previousElementSibling;
    if (prev && prev.classList.contains('section-divider')) {
      const d = prev.getBoundingClientRect();
      if (d.width > MIN_SPAN) list.push(surface(prev, 'divider', d.left + 6, d.right - 6, d.top));
    }
    section.querySelectorAll(BOX_SELECTOR).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width >= MIN_SPAN && r.height > 8) list.push(surface(el, 'box', r.left + 6, r.right - 6, r.top));
    });
    // text lines: one rect per rendered line fragment, merged across inline tags
    const lines = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.textContent.trim() && !n.parentElement.closest(SKIP_TEXT)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    for (let n; (n = walker.nextNode());) {
      const parent = n.parentElement;
      const fs = parseFloat(getComputedStyle(parent).fontSize) || 16;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 4 || r.height < 4) continue;
        const top = r.top + Math.max(0, (r.height - fs) / 2) + fs * 0.12;   // roughly the tops of the letters
        const same = lines.find(l => Math.abs(l.top - top) < 4 && r.left <= l.right + 12 && r.right >= l.left - 12);
        if (same) { same.left = Math.min(same.left, r.left); same.right = Math.max(same.right, r.right); }
        else lines.push({ top, left: r.left, right: r.right, anchor: parent });
      }
    }
    for (const l of lines) if (l.right - l.left >= MIN_SPAN) list.push(surface(l.anchor, 'line', l.left + 4, l.right - 4, l.top));
    return list;
  }

  class Blob {
    constructor(section) {
      this.section = section;
      this.wrap = document.createElement('div');
      this.wrap.className = 'section-pet';
      this.wrap.setAttribute('aria-hidden', 'true');
      this.canvas = document.createElement('canvas');
      this.canvas.width = W; this.canvas.height = H;
      const hit = document.createElement('div');
      hit.className = 'section-pet-hit';
      this.wrap.append(this.canvas, hit);
      layer.appendChild(this.wrap);
      this.ctx = this.canvas.getContext('2d');
      this.img = this.ctx.createImageData(W, H);

      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.lookX = 0;
      this.blinkAt = performance.now() + rand(1500, 4000);
      this.treat = null;          // {glyph, until}: brief happy reaction
      this.visible = false;
      this.lastKey = '';
      this.resetToEdge(performance.now());
      hit.addEventListener('mouseenter', () => this.cheer());
    }

    // start on (or snap back to) the card's top edge, standing still
    resetToEdge(now) {
      const s = edgeSurface(this.section), g = geom(s);
      this.surface = s;
      this.px = (g.x2 - g.x1) * rand(0.15, 0.85);
      this.x = g.x1 + this.px; this.y = g.y;
      this.plan = []; this.action = null;
      this.idleUntil = now + linger('edge');
    }

    cheer() {
      this.treat = { glyph: 'heart', until: performance.now() + 1100 };
      if (!this.action && !reduceMotion) this.queue([['crouch'], ['arc', { x: this.x, y: this.y, h: HOP_H, surface: this.surface }], ['land']], performance.now());
    }

    queue(steps, now) {
      this.plan = steps.map(([type, opts]) => ({ type, ...(opts || {}) }));
      this.startNext(now);
    }

    startNext(now) {
      this.action = this.plan.shift() || null;
      if (!this.action) return;
      const a = this.action;
      a.start = now;
      a.x0 = this.x; a.y0 = this.y;
      if (a.type === 'crouch') a.dur = 100;
      else if (a.type === 'land') a.dur = 120;
      else if (a.type === 'arc') {
        const dx = a.x - a.x0, dy = a.y - a.y0;
        if (dx) this.dir = Math.sign(dx);
        a.dur = clamp(380 + Math.abs(dx) * 1.1 + Math.abs(dy) * 1.4, 380, 1100);
      } else if (a.type === 'climb') {
        a.dur = Math.max(300, Math.abs(a.y0 - a.y) / CLIMB_SPEED * 1000);
        a.cycles = Math.max(1, Math.round(Math.abs(a.y0 - a.y) / 22));
      }
    }

    // pick somewhere new in this section and plan how to get there
    decide(now) {
      const here = { x: this.x, y: this.y };
      const options = findSurfaces(this.section).map(s => ({ s, g: geom(s) })).filter(o => o.g.x2 >= o.g.x1);
      const weighted = options.map(o => {
        const nx = clamp(here.x, o.g.x1, o.g.x2);
        const rise = here.y - o.g.y;
        if (Math.abs(nx - here.x) > MAX_REACH_X && rise <= JUMP_UP) return { ...o, w: 0 };
        if (rise > JUMP_UP && storyView()) return { ...o, w: 0 };   // no card walls to climb in story view
        const dist = Math.hypot(nx - here.x, o.g.y - here.y);
        const kindBoost = { edge: 1.3, divider: 1.1, box: 1.6, line: 1 }[o.s.kind];
        return { ...o, w: kindBoost / (1 + dist / 140) };
      });
      const total = weighted.reduce((t, o) => t + o.w, 0);
      let r = Math.random() * total, pick = weighted[0];
      for (const o of weighted) { if ((r -= o.w) <= 0) { pick = o; break; } }
      const { s, g } = pick;

      // target spot on the chosen surface, preferring somewhere near where we are
      let tx = clamp(here.x + rand(-160, 160), g.x1, g.x2);

      if (s.anchor === this.surface.anchor && Math.abs(g.y - here.y) < 3) {
        // same surface: a few walking hops
        const hops = clamp(Math.ceil(Math.abs(tx - here.x) / HOP_DIST), 1, 5);
        const steps = [];
        for (let i = 1; i <= hops; i++) steps.push(['crouch'], ['arc', { x: lerp(here.x, tx, i / hops), y: g.y, h: HOP_H, surface: i === hops ? s : null }], ['land']);
        return this.queue(steps, now);
      }

      const rise = here.y - g.y;
      if (rise > JUMP_UP) {
        // too high to jump: leap onto the card's outer wall, climb, then hop onto the ledge
        const sec = toLayer(this.section.getBoundingClientRect());
        const leftWall = here.x < (sec.left + sec.right) / 2;
        const wallX = leftWall ? sec.left - BODY_HALF - 2 : sec.right + BODY_HALF + 2;
        tx = clamp(leftWall ? g.x1 + rand(0, 140) : g.x2 - rand(0, 140), g.x1, g.x2);
        return this.queue([
          ['crouch'], ['arc', { x: wallX, y: here.y, h: 16 }],
          ['climb', { x: wallX, y: g.y, wall: leftWall ? 1 : -1 }],
          ['crouch'], ['arc', { x: tx, y: g.y, h: 22, surface: s }], ['land'],
        ], now);
      }
      this.queue([['crouch'], ['arc', { x: tx, y: g.y, h: rise > 0 ? rise + 22 : 20, surface: s }], ['land']], now);
    }

    update(now) {
      const pose = { squashX: 1, squashY: 1, lean: 0, lookX: this.lookX, lookY: 0, eyeOpenness: 1, eyes: 'open', mouth: 'none', blush: false, glyph: null };

      if (!reduceMotion && this.action) {
        const a = this.action, p = clamp((now - a.start) / a.dur, 0, 1);
        pose.lookX = this.dir;
        if (a.type === 'crouch') {
          pose.squashX = 1.18; pose.squashY = 0.82;
        } else if (a.type === 'land') {
          pose.squashX = 1 + 0.2 * (1 - p); pose.squashY = 1 - 0.2 * (1 - p);
        } else if (a.type === 'arc') {
          this.x = lerp(a.x0, a.x, p);
          this.y = lerp(a.y0, a.y, p) - a.h * 4 * p * (1 - p);
          const stretch = 1.12 - 0.12 * Math.sin(Math.PI * p);
          pose.squashY = stretch; pose.squashX = 1 / stretch;
          pose.lean = this.dir * 0.35; pose.lookX = 0;
          pose.lookY = a.y < a.y0 - 4 ? 1 : 0;
        } else if (a.type === 'climb') {
          // inch-worm: move up in spurts, stretching on each pull
          const k = a.cycles, wave = Math.sin(2 * Math.PI * k * p);
          this.x = a.x;
          this.y = lerp(a.y0, a.y, p - wave / (2 * Math.PI * k));
          pose.squashY = 1 + 0.12 * Math.cos(2 * Math.PI * k * p); pose.squashX = 1 / pose.squashY;
          pose.lean = a.wall * 0.5; pose.lookX = a.wall; pose.lookY = 1;
        }
        if (p >= 1) {
          if (a.type === 'arc' && a.surface) {   // touched down on the target surface
            const g = geom(a.surface);
            this.surface = a.surface;
            this.px = clamp(a.x, g.x1, g.x2) - g.x1;
          }
          this.startNext(now);
          if (!this.action) {
            this.idleUntil = now + linger(this.surface.kind);
            if (!this.treat && Math.random() < 0.15) this.treat = { glyph: 'sparkle', until: now + 900 };
          }
        }
      }

      if (!this.action) {
        // grounded: follow the surface (it may have moved), breathe, blink, glance
        const g = geom(this.surface);
        this.x = g.x1 + clamp(this.px, 0, g.x2 - g.x1); this.y = g.y;
        if (!reduceMotion) {
          const breath = Math.sin(now / 520 + this.px) * 0.035;
          pose.squashY = 1 + breath; pose.squashX = 1 - breath * 0.7;
          if (now > this.blinkAt) {
            pose.eyeOpenness = 0;
            if (now > this.blinkAt + 130) this.blinkAt = now + rand(2200, 5200);
          }
          if (Math.random() < 0.004) this.lookX = [-1, 0, 1][Math.floor(Math.random() * 3)];
          pose.lookX = this.lookX;
          if (now > this.idleUntil) this.decide(now);
        }
      }

      if (this.treat) {
        if (now < this.treat.until) { pose.eyes = 'happy'; pose.mouth = 'smile'; pose.blush = true; pose.glyph = this.treat.glyph; }
        else this.treat = null;
      }

      const theme = themeName();
      const key = JSON.stringify(pose) + theme;
      if (key !== this.lastKey) {
        draw(this.img, pose, RGB[theme]);
        this.ctx.putImageData(this.img, 0, 0);
        this.lastKey = key;
      }
      this.wrap.style.transform = `translate(${(this.x - CANVAS_W / 2).toFixed(1)}px, ${(this.y - FEET).toFixed(1)}px)`;
    }
  }

  const blobs = sections.map(s => new Blob(s));

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const blob = blobs.find(b => b.section === e.target);
      if (blob) blob.visible = e.isIntersecting;
    }
  }, { rootMargin: '120px' });
  sections.forEach(s => io.observe(s));

  // text rewraps on resize, so line surfaces go stale: send everyone back to their card's top edge
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { const now = performance.now(); blobs.forEach(b => b.resetToEdge(now)); }, 150);
  });

  // switching story/sidebar view moves everything: send blobs back to their home ledge once it settles
  new MutationObserver(() => {
    setTimeout(() => { const now = performance.now(); blobs.forEach(b => b.resetToEdge(now)); }, 60);
  }).observe(root, { attributes: true, attributeFilter: ['data-layout'] });

  const tick = now => {
    for (const b of blobs) if (b.visible) b.update(now);
    requestAnimationFrame(tick);
  };
  blobs.forEach(b => b.update(performance.now()));
  requestAnimationFrame(tick);
})();
