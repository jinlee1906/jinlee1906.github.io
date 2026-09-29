// Story-view extras (inactive in sidebar view):
//  1. A fixed backdrop behind the chapters. It stays transparent on the first page so the
//     floating molecules show, then fades in and crossfades to each chapter's color.
//  2. Eased wheel scrolling so moving between chapters glides and slows down.
//  3. Through the project chapters, each wheel gesture (or Page/arrow key) glides exactly
//     one full screen, so every project lands filling the screen.
//     Scrollbar and touch scrolling are left native (touch uses CSS scroll-snap instead).
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

  // ---- 2 + 3. eased wheel scrolling, with page-by-page steps through the project chapters ----
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
  const glideTo = y => {
    if (!running) current = window.scrollY;
    target = Math.max(0, Math.min(maxScroll(), Math.round(y)));
    if (!running) { running = true; requestAnimationFrame(frame); }
  };

  // Scroll positions a step can land on: each project chapter's top (plus extra stops inside a
  // chapter taller than the screen, e.g. on short windows), ending at the section that follows.
  const projects = [...document.querySelectorAll('main .project-chapter')];
  const stops = () => {
    const out = [];
    for (const el of projects) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const extra = el.offsetHeight - window.innerHeight;
      for (let y = top; y < top + extra; y += window.innerHeight * 0.85) out.push(Math.round(y));
      out.push(Math.round(top + Math.max(0, extra)));
    }
    const last = projects[projects.length - 1];
    out.push(Math.round(last.getBoundingClientRect().bottom + window.scrollY));
    return [...new Set(out)].sort((a, b) => a - b);
  };

  // Where one step in direction dir (+1 down, -1 up) should land, or null to scroll freely.
  const step = (dir, freeTarget) => {
    if (!storyView() || !projects.length) return null;
    const s = stops(), first = s[0], last = s[s.length - 1];
    const y = running ? target : window.scrollY;
    const h = window.innerHeight;
    if (dir > 0) {
      if (y < first - 2) return freeTarget > first - h * 0.5 ? first : null;   // entering from above
      return y < last - 2 ? s.find(v => v > y + 2) : null;
    }
    if (y > last + 2) return freeTarget < last - h * 0.5 ? s[s.length - 2] : null; // entering from below
    return y > first + 2 ? [...s].reverse().find(v => v < y - 2) : null;
  };

  // one step per gesture: trackpad momentum keeps firing wheel events, so hold further steps
  // until the events pause
  let lockUntil = 0;
  const stepOrNull = (dir, freeTarget) => {
    const stop = step(dir, freeTarget);
    if (stop === null) return false;
    const now = performance.now();
    if (now < lockUntil) { lockUntil = Math.max(lockUntil, now + 220); return true; }
    lockUntil = now + 750;
    glideTo(stop);
    return true;
  };

  window.addEventListener('wheel', e => {
    if (!storyView() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (!running) current = target = window.scrollY;
    const free = target + px;
    if (px !== 0 && stepOrNull(Math.sign(px), free)) return;
    glideTo(free);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input, textarea, select, button, [contenteditable]')) return;
    const dir = { PageDown: 1, ArrowDown: 1, ' ': e.shiftKey ? -1 : 1, PageUp: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    const y = running ? target : window.scrollY;
    const guess = y + dir * (e.key.startsWith('Arrow') ? 80 : window.innerHeight * 0.9);
    if (stepOrNull(dir, guess)) e.preventDefault();
  });

  // scrollbar drags and anchor jumps move the page directly; follow them
  window.addEventListener('scroll', () => { if (!running) current = target = window.scrollY; }, { passive: true });
})();
