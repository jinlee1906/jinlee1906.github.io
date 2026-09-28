// Story-view extras (inactive in sidebar view):
//  1. A fixed backdrop behind the chapters. It stays transparent on the first page so the
//     floating molecules show, then fades in and crossfades to each chapter's color.
//  2. Eased wheel scrolling so moving between chapters glides and slows down.
//     Scrollbar, keyboard, and touch scrolling are left native.
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

  // ---- 2. eased wheel scrolling ----
  if (reduceMotion) return;
  const EASE = 0.085;                                    // lower = longer glide
  let target = window.scrollY, current = window.scrollY, running = false;
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const frame = () => {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.5) { current = target; running = false; }
    window.scrollTo(0, current);
    if (running) requestAnimationFrame(frame);
  };

  window.addEventListener('wheel', e => {
    if (!storyView() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (!running) current = target = window.scrollY;
    target = Math.max(0, Math.min(maxScroll(), target + px));
    if (!running) { running = true; requestAnimationFrame(frame); }
  }, { passive: false });

  // scrollbar drags, keys, and anchor jumps move the page directly; follow them
  window.addEventListener('scroll', () => { if (!running) current = target = window.scrollY; }, { passive: true });
})();
