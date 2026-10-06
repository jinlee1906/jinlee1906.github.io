// Story-view extras (inactive in sidebar view):
//  1. A fixed backdrop behind the chapters. It stays transparent on the first page so the
//     floating molecules show, then fades in and crossfades to each chapter's color.
//  2. Page-by-page scrolling on the homepage: each wheel gesture (or Page/arrow/space key)
//     glides one whole page with a long ease-in-out, like royleejr.com. A page taller than
//     the screen (e.g. on a short window) gets extra stops so nothing is skipped.
//     Scrollbar and touch scrolling stay native (touch uses CSS scroll-snap instead).
(() => {
  const root = document.documentElement;
  const storyView = () => root.dataset.layout !== 'sidebar';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. chapter backdrop (homepage only: it's the page with a first-page hero) ----
  const hero = document.querySelector('main .hero-section');
  const layout = document.querySelector('.layout');
  if (hero && layout) {
    const backdrop = document.createElement('div');
    backdrop.className = 'story-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    // after the molecule layers, before the sidebar/main, so it paints between them
    layout.insertBefore(backdrop, layout.querySelector('aside, main'));

    const chapters = [...document.querySelectorAll('main .panel')];
    // every other chapter (About, Brandstorm, Bananas, ...) flips to the opposite theme; the
    // footer matches the last chapter so it stays readable
    chapters.forEach((c, i) => c.classList.toggle('tone-flip', i % 2 === 0));
    const footer = document.querySelector('.site-footer');
    if (footer) footer.classList.toggle('tone-flip', (chapters.length - 1) % 2 === 0);

    // the backdrop takes the current chapter's own page color, so it crossfades black <-> white
    let current = null;
    const paint = () => {
      if (!current) { backdrop.classList.remove('is-on'); delete root.dataset.tone; return; }
      backdrop.style.backgroundColor = getComputedStyle(current).getPropertyValue('--page-bg');
      backdrop.classList.add('is-on');
      if (current.classList.contains('tone-flip') && storyView()) root.dataset.tone = 'flip';
      else delete root.dataset.tone;
    };
    const midline = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        current = chapters.includes(e.target) ? e.target : null;   // null: back on the first page, molecules visible
        paint();
      }
    }, { rootMargin: '-50% 0px -50% 0px' });            // whichever page crosses the middle of the screen
    // re-read the colors when the theme or view changes
    new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-layout'] });
    [hero, ...chapters].forEach(el => midline.observe(el));
  }

  // ---- parallax: inside each chapter the big chapter number, the media and the text drift at
  // different speeds while it scrolls (--p = chapter top / screen height; 0 once it has
  // landed, so a settled page looks exactly as laid out) ----
  if (hero && !reduceMotion) {
    const panels = [...document.querySelectorAll('main .panel')];
    panels.forEach((c, i) => { c.dataset.mark = String(i + 1).padStart(2, '0'); });
    let queued = false;
    const update = () => {
      queued = false;
      const h = window.innerHeight;
      for (const c of panels) {
        const p = c.getBoundingClientRect().top / h;
        if (p > -1.5 && p < 1.5) c.style.setProperty('--p', p.toFixed(4));
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  // ---- 2. page-by-page scrolling ----
  if (reduceMotion || !hero) return;
  const DURATION = 1400;                                  // ms per page glide
  const ease = t => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);   // ease-in-out quart
  const pages = [hero, ...document.querySelectorAll('main .panel')];
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  let glide = null;                                       // { from, to, start } while moving
  const tick = now => {
    const t = Math.min(1, (now - glide.start) / DURATION);
    window.scrollTo(0, glide.from + (glide.to - glide.from) * ease(t));
    if (t < 1) requestAnimationFrame(tick); else glide = null;
  };
  const glideTo = y => {
    const start = !glide;
    glide = { from: window.scrollY, to: y, start: performance.now() };
    // announce where the page is headed, so a playing video can mute before it slides away
    window.dispatchEvent(new CustomEvent('story:glide', { detail: { to: y } }));
    if (start) requestAnimationFrame(tick);
  };

  // every scroll position a step can land on: each page's top, extra stops inside a page
  // taller than the screen, and the very bottom (footer)
  const stops = () => {
    const h = window.innerHeight, out = [0, maxScroll()];
    for (const el of pages) {
      const top = el === hero ? 0 : el.getBoundingClientRect().top + window.scrollY;
      const extra = el.offsetHeight - h;
      for (let y = top; y < top + extra; y += h * 0.85) out.push(y);
      out.push(top + Math.max(0, extra));
    }
    return [...new Set(out.map(v => Math.round(Math.min(v, maxScroll()))))].sort((a, b) => a - b);
  };

  // One step per gesture: trackpad momentum keeps firing wheel events for a while, so
  // further steps wait until the glide is done and the events pause.
  let lockUntil = 0;
  const stepPage = dir => {
    if (root.classList.contains('is-loading')) return;   // the loading screen is still up
    if (document.querySelector('dialog[open]')) return;   // a full-size slide is open
    const now = performance.now();
    if (now < lockUntil) { lockUntil = Math.max(lockUntil, now + 240); return; }
    const y = glide ? glide.to : window.scrollY;
    const s = stops();
    const next = dir > 0 ? s.find(v => v > y + 2) : [...s].reverse().find(v => v < y - 2);
    if (next === undefined) return;
    lockUntil = now + DURATION;
    glideTo(next);
  };

  window.addEventListener('wheel', e => {
    if (!storyView() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.deltaY === 0) return;
    e.preventDefault();
    stepPage(Math.sign(e.deltaY));
  }, { passive: false });

  // links to another chapter on this page glide there too, instead of jumping
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !storyView() || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const target = a.hash.length > 1 && document.getElementById(a.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    history.replaceState(null, '', a.hash);
    lockUntil = performance.now() + DURATION;
    glideTo(Math.min(maxScroll(), Math.round(target.getBoundingClientRect().top + window.scrollY)));
  });

  window.addEventListener('keydown', e => {
    if (!storyView() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest('input, textarea, select, button, [contenteditable]')) return;
    const dir = { PageDown: 1, ArrowDown: 1, ' ': e.shiftKey ? -1 : 1, PageUp: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    stepPage(dir);
  });
})();
