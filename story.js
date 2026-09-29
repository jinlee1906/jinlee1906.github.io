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
    const midline = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = chapters.indexOf(e.target);
        if (i < 0) {
          backdrop.classList.remove('is-on');           // back on the first page: molecules visible
        } else {
          backdrop.dataset.chapter = String((i % 4) + 1);
          backdrop.classList.add('is-on');
        }
      }
    }, { rootMargin: '-50% 0px -50% 0px' });            // whichever page crosses the middle of the screen
    [hero, ...chapters].forEach(el => midline.observe(el));
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

  window.addEventListener('keydown', e => {
    if (!storyView() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest('input, textarea, select, button, [contenteditable]')) return;
    const dir = { PageDown: 1, ArrowDown: 1, ' ': e.shiftKey ? -1 : 1, PageUp: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    stepPage(dir);
  });
})();
