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

  // fade-in observer. In story view a chapter resets once it is fully off screen, so its
  // entrance plays again every time you scroll back to it (like royleejr.com)
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{if(en.isIntersecting) en.target.classList.add('in-view')})
  },{threshold:0.12})
  const replay=!window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const resetIo=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(!en.isIntersecting&&replay&&document.documentElement.dataset.layout!=='sidebar') en.target.classList.remove('in-view')
    })
  },{threshold:0})
  document.querySelectorAll('.panel, .project-card').forEach(el=>{el.classList.add('will-reveal');io.observe(el)})
  document.querySelectorAll('main .panel').forEach(el=>resetIo.observe(el))

  // scroll spy for sidebar nav
  const sections=document.querySelectorAll('main .panel[id]');
  const navLinks=document.querySelectorAll('aside nav a');
  const spyObserver=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const id=entry.target.dataset.nav||entry.target.id;   // project chapters all light up "Projects"
      const activeLink=document.querySelector(`aside nav a[href="#${id}"]`);
      if(entry.isIntersecting){
        navLinks.forEach(link=>link.classList.remove('active'));
        if(activeLink) activeLink.classList.add('active');
      }
    });
  },{threshold:0.5});
  sections.forEach(section=>spyObserver.observe(section));

  // hide a project image whose hosted file is gone instead of showing a broken-image box
  document.querySelectorAll('.project-image img').forEach(img=>{
    const hide=()=>{img.closest('.project-image').hidden=true}
    if(img.complete&&img.naturalWidth===0) hide(); else img.addEventListener('error',hide)
  })

  // skills entrance order (--i) and line-drawing hooks for the lab illustrations (style.css)
  let skillOrder=0
  document.querySelectorAll('#skills .skill-group-title, #skills .skills-logos > *, #skills .skill-coursework').forEach(el=>{
    el.style.setProperty('--i',skillOrder++)
  })
  document.querySelectorAll('#skills .lab-icon *:not(.dash):not(.fl)').forEach(el=>el.setAttribute('pathLength','1'))

  // multi-image project frames: crossfade every few seconds (paused on hover), dots to pick one
  document.querySelectorAll('.project-media.is-gallery').forEach(frame=>{
    const imgs=[...frame.querySelectorAll('img')]
    const dots=document.createElement('div')
    dots.className='gallery-dots'
    let i=0,timer=null
    const show=n=>{
      i=(n+imgs.length)%imgs.length
      imgs.forEach((img,k)=>img.classList.toggle('is-shown',k===i))
      ;[...dots.children].forEach((d,k)=>d.setAttribute('aria-current',String(k===i)))
    }
    imgs.forEach((img,k)=>{
      const b=document.createElement('button')
      b.type='button'
      b.setAttribute('aria-label','Show image '+(k+1)+' of '+imgs.length)
      b.addEventListener('click',()=>show(k))
      dots.appendChild(b)
    })
    frame.appendChild(dots)
    show(0)
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start=()=>{if(!timer) timer=setInterval(()=>show(i+1),4500)}
    const stop=()=>{clearInterval(timer);timer=null}
    frame.addEventListener('mouseenter',stop)
    frame.addEventListener('mouseleave',start)
    start()
  })

  // project videos: load only when their page comes near, play while on screen, pause when not;
  // with reduced motion they don't autoplay and get controls instead
  const stillVideo=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const videoIo=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      const v=en.target
      if(en.isIntersecting){
        if(!v.src){v.src=v.dataset.src;if(stillVideo){v.controls=true;v.preload='metadata'}}
        if(!stillVideo) v.play().catch(()=>{})
      }else if(!v.paused) v.pause()
    })
  },{rootMargin:'50% 0px'})
  document.querySelectorAll('video[data-src]').forEach(v=>videoIo.observe(v))

  // light/dark toggle; the saved theme is applied earlier by an inline <head> script to avoid a flash
  const root=document.documentElement;
  const toggle=document.querySelector('.theme-toggle');
  toggle.addEventListener('click',()=>{
    const goLight=root.dataset.theme!=='light';
    if(goLight) root.dataset.theme='light'; else delete root.dataset.theme;
    try{localStorage.setItem('theme',goLight?'light':'dark')}catch(e){}
  })

  // story view (full-screen chapters, no sidebar) vs sidebar view; saved choice is applied in <head>
  document.querySelector('.layout-toggle').addEventListener('click',()=>{
    const next=root.dataset.layout==='sidebar'?'story':'sidebar';
    root.dataset.layout=next;
    try{localStorage.setItem('layout',next)}catch(e){}
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
