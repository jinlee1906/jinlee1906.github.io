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
  document.querySelectorAll('.about-list li').forEach((li,i)=>li.style.setProperty('--i',i))
  let skillOrder=0
  document.querySelectorAll('#skills .skill-group-title, #skills .skills-logos > *, #skills .skill-coursework').forEach(el=>{
    el.style.setProperty('--i',skillOrder++)
  })
  document.querySelectorAll('#skills .lab-icon *:not(.dash):not(.fl)').forEach(el=>el.setAttribute('pathLength','1'))

  // multi-image project frames: crossfade to the next image each time its progress bar fills
  // (4s; the bars hold while hovered), click a bar to pick one; starts over on each visit
  document.querySelectorAll('.project-media.is-gallery').forEach(frame=>{
    const imgs=[...frame.querySelectorAll('img')]
    const bars=document.createElement('div')
    bars.className='photo-bars'
    let i=0
    const show=n=>{
      i=(n+imgs.length)%imgs.length
      imgs.forEach((img,k)=>img.classList.toggle('is-shown',k===i))
      ;[...bars.children].forEach((b,k)=>{
        b.classList.remove('is-current','is-done')
        void b.offsetWidth // restart the fill animation
        if(k<i) b.classList.add('is-done'); else if(k===i) b.classList.add('is-current')
        b.setAttribute('aria-current',String(k===i))
      })
      frame.dispatchEvent(new Event('gallery:show'))
    }
    imgs.forEach((img,k)=>{
      const b=document.createElement('button')
      b.type='button'
      b.setAttribute('aria-label','Show image '+(k+1)+' of '+imgs.length)
      b.addEventListener('click',()=>show(k))
      b.addEventListener('animationend',()=>{if(k===i) show(i+1)})
      bars.appendChild(b)
    })
    frame.appendChild(bars)
    show(0)
    // photos and slides don't always fill their frame: keep the bars on the picture itself
    // (drawings keep them along the bottom of their white panel)
    const fit=()=>{
      const img=imgs[i], W=img.offsetWidth, H=img.offsetHeight
      if(!img.naturalWidth||!W) return
      const r=getComputedStyle(img).objectFit==='contain'?Math.min(W/img.naturalWidth,H/img.naturalHeight):0
      const w=r?img.naturalWidth*r:W, h=r?img.naturalHeight*r:H
      const x=img.offsetLeft+(W-w)/2, y=img.offsetTop+(H-h)/2
      Object.assign(bars.style,{left:x+14+'px',right:'auto',width:w-28+'px',top:y+h-28+'px',bottom:'auto'})
    }
    if(!frame.classList.contains('is-drawing')){
      new ResizeObserver(fit).observe(frame)
      imgs.forEach(img=>img.addEventListener('load',fit))
      frame.addEventListener('gallery:show',fit)
    }
    new IntersectionObserver(([e])=>{
      frame.classList.toggle('is-away',!e.isIntersecting)
      if(e.isIntersecting) show(0)
    },{threshold:0.3}).observe(frame)
  })

  // About photo stack: slides to the next portrait every 4s while About is on screen (a copy
  // of the first photo trails the last so the loop keeps sliding forward); the bars below
  // fill with each photo and can be clicked to jump to one
  document.querySelectorAll('.about-stack').forEach(stack=>{
    const track=stack.querySelector('.about-track'), bars=stack.querySelector('.photo-bars')
    const n=track.children.length, HOLD=4000
    const still=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const copy=track.firstElementChild.cloneNode()
    copy.alt=''; copy.setAttribute('aria-hidden','true'); track.appendChild(copy)
    for(let k=0;k<n;k++){
      const b=document.createElement('button')
      b.type='button'
      b.setAttribute('aria-label','Show photo '+(k+1)+' of '+n)
      b.addEventListener('click',()=>{go(k,false);if(timer) run()})
      bars.appendChild(b)
    }
    let i=0,timer=null
    const go=(k,slide)=>{
      track.classList.toggle('is-moving',slide)
      track.style.transform='translateX('+(-100*k)+'%)'
      i=k%n
      ;[...bars.children].forEach((b,j)=>{
        b.classList.remove('is-current','is-done')
        void b.offsetWidth // restart the fill animation
        if(j<i) b.classList.add('is-done'); else if(j===i) b.classList.add('is-current')
        b.setAttribute('aria-current',String(j===i))
      })
      if(k===n) setTimeout(()=>{track.classList.remove('is-moving');track.style.transform='none'},950)
    }
    const run=()=>{clearTimeout(timer);timer=setTimeout(()=>{go(i+1,true);run()},HOLD)}
    const stop=()=>{clearTimeout(timer);timer=null}
    go(0,false)
    if(still) return
    new IntersectionObserver(([e])=>{
      if(e.isIntersecting){if(!timer){go(0,false);run()}}else stop()
    },{threshold:0.3}).observe(stack)
  })

  // project videos: start loading when their page comes near; play while any of the video is
  // on screen, and pause + mute the moment it leaves (so sound never follows you down the page).
  // With reduced motion they don't autoplay and get controls instead
  const stillVideo=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const loadVideo=v=>{if(!v.src){v.src=v.dataset.src;if(stillVideo){v.controls=true;v.preload='metadata'}}}
  const nearIo=new IntersectionObserver(entries=>{
    entries.forEach(en=>{if(en.isIntersecting) loadVideo(en.target)})
  },{rootMargin:'50% 0px'})
  // mute with a quick fade instead of a hard cut
  const fadeMute=v=>{
    if(v.muted||v._fading) return
    v._fading=true
    const start=performance.now(),from=v.volume
    const step=now=>{
      const t=Math.min(1,(now-start)/250)
      v.volume=from*(1-t)
      if(t<1) requestAnimationFrame(step)
      else{v.muted=true;v.volume=from;v._fading=false}
    }
    requestAnimationFrame(step)
  }
  const videoIo=new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      const v=en.target
      if(en.isIntersecting){loadVideo(v);if(!stillVideo&&v.paused) v.play().catch(()=>{})}
      else if(!v.paused) v.pause()
      if(en.intersectionRatio<0.5) fadeMute(v)   // half gone (any kind of scrolling): sound off
    })
  },{threshold:[0,0.5]})
  // story-view page glides: mute the moment the glide starts if the video won't be on the
  // page it is heading to (no waiting for it to slide off screen)
  window.addEventListener('story:glide',e=>{
    document.querySelectorAll('video[data-src]').forEach(v=>{
      if(v.muted) return
      const r=v.getBoundingClientRect()
      const top=r.top+window.scrollY-e.detail.to
      const visible=Math.min(top+r.height,window.innerHeight)-Math.max(top,0)
      if(visible<r.height*0.5) fadeMute(v)
    })
  })
  document.querySelectorAll('video[data-src]').forEach(v=>{nearIo.observe(v);videoIo.observe(v)})

  // sound toggle on a project video (starts muted so it can autoplay; one tap turns sound on)
  document.querySelectorAll('.video-sound').forEach(btn=>{
    const v=btn.closest('figure').querySelector('video')
    const label=btn.querySelector('span')
    const sync=()=>{
      btn.setAttribute('aria-pressed',String(!v.muted))
      btn.setAttribute('aria-label',v.muted?'Turn sound on':'Turn sound off')
      label.textContent=v.muted?'Sound off':'Sound on'
    }
    btn.addEventListener('click',()=>{
      if(!v.src) v.src=v.dataset.src
      v.muted=!v.muted
      if(!v.muted) v.play().catch(()=>{})
      sync()
    })
    v.addEventListener('volumechange',sync)
  })

  // click a gallery slide to see it full size (Esc, the button, or a click closes it)
  const slides=document.querySelectorAll('.slide-gallery img')
  if(slides.length){
    const box=document.createElement('dialog')
    box.className='lightbox'
    box.innerHTML='<button type="button">Close</button><img alt="">'
    document.body.appendChild(box)
    const big=box.querySelector('img')
    box.addEventListener('click',()=>box.close())
    slides.forEach(img=>img.addEventListener('click',()=>{big.src=img.src;big.alt=img.alt;box.showModal()}))
  }

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
