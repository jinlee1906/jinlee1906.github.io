// Smooth scroll for internal links and fade-in on scroll
document.addEventListener('DOMContentLoaded',()=>{
  // smooth link behavior
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const id=a.getAttribute('href').slice(1);
      const el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
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
})
