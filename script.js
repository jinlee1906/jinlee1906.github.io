// Smooth scroll for internal links and fade-in on scroll
document.addEventListener('DOMContentLoaded',()=>{
  // smooth link behavior
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const id=a.getAttribute('href').slice(1);
      const el=document.getElementById(id);
      const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(el) el.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
    })
  })

  // fade-in observer
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){en.target.classList.add('in-view');io.unobserve(en.target)}
    })
  },{threshold:0.12})
  document.querySelectorAll('.panel, .project-card').forEach(el=>{el.classList.add('will-reveal');io.observe(el)})

  // scroll spy for sidebar nav
  const sections=document.querySelectorAll('main .panel[id]');
  const navLinks=document.querySelectorAll('aside nav a');
  const spyObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const id=entry.target.id;
      const activeLink=document.querySelector(`aside nav a[href="#${id}"]`);
      if(entry.isIntersecting){
        navLinks.forEach(link=>link.classList.remove('active'));
        if(activeLink) activeLink.classList.add('active');
      }
    });
  },{threshold:0.5});
  sections.forEach(section=>spyObserver.observe(section));

  // light/dark toggle; the saved theme is applied earlier by an inline <head> script to avoid a flash
  const root=document.documentElement;
  const toggle=document.querySelector('.theme-toggle');
  toggle.addEventListener('click',()=>{
    const goLight=root.dataset.theme!=='light';
    if(goLight) root.dataset.theme='light'; else delete root.dataset.theme;
    try{localStorage.setItem('theme',goLight?'light':'dark')}catch(e){}
  })

  // randomize each floating bond-line shape's speed, drift, and spin direction
  document.querySelectorAll('.hex-background .hex').forEach(el=>{
    const dur=(18+Math.random()*24).toFixed(1);              // 18s - 42s per shape
    const tx=(Math.random()*70-35).toFixed(0);                // -35px - 35px horizontal drift
    const ty=(Math.random()*70-35).toFixed(0);                // -35px - 35px vertical drift
    const rot=(Math.random()<0.5?-1:1)*(Math.random()<0.5?360:720); // random spin direction/turns
    el.style.setProperty('--dur',dur+'s')
    el.style.setProperty('--tx',tx+'px')
    el.style.setProperty('--ty',ty+'px')
    el.style.setProperty('--rot',rot+'deg')
    el.style.animationDelay=(-Math.random()*dur).toFixed(1)+'s' // random start phase
  })
})
