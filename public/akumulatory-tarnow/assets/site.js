(() => {
  'use strict';
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=motionPreference.matches;
  const menu = document.querySelector('.menu');
  const menuToggle = document.querySelector('.menu-toggle');
  const closeMenu = () => { menu.close(); menuToggle.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; };
  menuToggle.addEventListener('click', () => { menu.showModal(); menuToggle.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; });
  menu.querySelector('[data-menu-close]').addEventListener('click', closeMenu);
  menu.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', closeMenu));
  menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  menu.addEventListener('click', event => { if(event.target === menu && event.clientX < menu.getBoundingClientRect().left) closeMenu(); });

  if (!reduced) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveals.unobserve(entry.target); } }), { threshold: .12, rootMargin: '0px 0px -25px' });
    const arrivals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const inner = entry.target.querySelector('.arrival');
      inner.classList.add('is-entering');
      inner.addEventListener('animationend', () => { inner.classList.remove('is-entering'); inner.classList.add('is-arrived'); }, {once:true});
      arrivals.unobserve(entry.target);
    }), {threshold:.03,rootMargin:'0px 0px 15px'});
    document.querySelectorAll('[data-reveal]').forEach(el => reveals.observe(el));
    document.querySelectorAll('.arrival-wrap').forEach(el => arrivals.observe(el));
    document.documentElement.classList.add('motion-ready');
  }

  const reasons = [...document.querySelectorAll('[data-reason]')];
  const serviceImages = [...document.querySelectorAll('[data-service-image]')];
  const selectReason = index => {
    reasons.forEach((reason,i) => { reason.classList.toggle('is-active',i===index); reason.setAttribute('aria-pressed',String(i===index)); });
    serviceImages.forEach((image,i) => image.classList.toggle('is-active',i===index));
    document.querySelector('[data-service-current]').textContent = String(index+1).padStart(2,'0');
  };
  reasons.forEach((reason,index) => { reason.addEventListener('pointerenter',()=>selectReason(index)); reason.addEventListener('focus',()=>selectReason(index)); reason.addEventListener('click',()=>selectReason(index)); });
  const serviceObserver = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting && !reasons.some(el=>el.matches(':hover')||el===document.activeElement)) selectReason(Number(entry.target.dataset.reason)); }), {rootMargin:'-30% 0px -45% 0px',threshold:0});
  reasons.forEach(el=>serviceObserver.observe(el));

  const stage = document.querySelector('.orbit-stage');
  const plane = stage.querySelector('.orbit-plane');
  const cards = [...stage.querySelectorAll('[data-orbit-card]')];
  const count = cards.length;
  let position=2.2, target=2.2, momentum=0, drag=null, discardClickUntil=0, inView=false, frame=0, lastScroll=scrollY, scrollFrame=0;
  let orbitPaused=false, orbitHovered=false, orbitFocused=false, lastOrbitTime=0;
  const wrap = value => ((value + count/2) % count + count) % count - count/2;
  const renderOrbit = (now=performance.now()) => {
    frame=0;
    if(reduced)return;
    const elapsed=lastOrbitTime?Math.min(40,now-lastOrbitTime):16.67;
    lastOrbitTime=now;
    const ambient=inView&&!orbitPaused&&!orbitHovered&&!orbitFocused&&!drag;
    if(ambient)target+=elapsed*.00038;
    const mobile=stage.clientWidth<760;
    const radius=Math.min(mobile?stage.clientWidth*.43:stage.clientWidth*.30,mobile?210:380);
    position+=(target-position)*.085;
    if(!drag && Math.abs(momentum)>.0001){ target+=momentum; momentum*=.94; }
    cards.forEach((card,index)=>{
      const relative=wrap(index-position);
      const angle=relative*.86;
      const depth=Math.cos(angle);
      const x=Math.sin(angle)*radius;
      const y=relative*(mobile?60:74);
      const z=depth*(mobile?150:240)-(mobile?130:190);
      const opacity=Math.max(0,Math.min(1,(5.3-Math.abs(relative))/1.8))*(.55+.45*(depth+1)/2);
      card.style.setProperty('--card-x',`${x.toFixed(2)}px`);
      card.style.setProperty('--card-y',`${y.toFixed(2)}px`);
      card.style.setProperty('--card-z',`${z.toFixed(2)}px`);
      card.style.setProperty('--card-turn',`${(-Math.sin(angle)*36).toFixed(2)}deg`);
      card.style.setProperty('--card-roll',`${(Math.sin(angle*.75)*-4).toFixed(2)}deg`);
      card.style.setProperty('--card-opacity',opacity.toFixed(3));
      card.style.zIndex=String(Math.round(z+500));
      card.style.pointerEvents=opacity>.3?'auto':'none';
      card.tabIndex=Math.abs(relative)<3.5?0:-1;
      card.setAttribute('aria-hidden',String(opacity<.05));
    });
    const active=((Math.round(position)%count)+count)%count;
    document.querySelector('[data-orbit-current]').textContent=String(active+1).padStart(2,'0');
    if(inView && (ambient||Math.abs(target-position)>.001||Math.abs(momentum)>.0001))frame=requestAnimationFrame(renderOrbit);
  };
  const wakeOrbit = () => { if(!reduced&&!frame)frame=requestAnimationFrame(renderOrbit); };
  const orbitObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;lastOrbitTime=0;if(inView)wakeOrbit();},{rootMargin:'120px'});
  orbitObserver.observe(stage);
  document.querySelector('[data-orbit-prev]').addEventListener('click',()=>{target-=1;momentum=0;wakeOrbit();});
  document.querySelector('[data-orbit-next]').addEventListener('click',()=>{target+=1;momentum=0;wakeOrbit();});
  const orbitPauseButton=document.querySelector('[data-orbit-pause]');
  orbitPauseButton.addEventListener('click',()=>{
    orbitPaused=!orbitPaused;orbitFocused=false;orbitPauseButton.setAttribute('aria-pressed',String(orbitPaused));
    orbitPauseButton.setAttribute('aria-label',orbitPaused?'Wznów ruch marek':'Zatrzymaj ruch marek');
    orbitPauseButton.innerHTML=orbitPaused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
    wakeOrbit();
  });
  cards.forEach(card=>{card.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')orbitHovered=true;});card.addEventListener('pointerleave',()=>{orbitHovered=false;wakeOrbit();});});
  stage.addEventListener('focusin',event=>{orbitFocused=event.target.matches(':focus-visible');});
  stage.addEventListener('focusout',event=>{if(!stage.contains(event.relatedTarget)){orbitFocused=false;wakeOrbit();}});
  stage.addEventListener('keydown',event=>{
    if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)&&document.activeElement!==stage)stage.focus({preventScroll:true});
    if(event.key==='ArrowRight'||event.key==='ArrowDown'){event.preventDefault();target+=1;wakeOrbit();}
    if(event.key==='ArrowLeft'||event.key==='ArrowUp'){event.preventDefault();target-=1;wakeOrbit();}
  });
  stage.addEventListener('pointerdown',event=>{
    if(reduced||event.button!==0||event.target.closest('.orbit-controls'))return;
    drag={x:event.clientX,last:event.clientX,distance:0,id:event.pointerId};momentum=0;
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove',event=>{
    if(reduced)return;
    if(drag){const delta=event.clientX-drag.last;drag.last=event.clientX;drag.distance=Math.max(drag.distance,Math.abs(event.clientX-drag.x));if(drag.distance>6&&!stage.hasPointerCapture(drag.id))stage.setPointerCapture(drag.id);target-=delta*.014;momentum=-delta*.005;wakeOrbit();}
    else if(event.pointerType==='mouse'){
      const bounds=stage.getBoundingClientRect();plane.style.setProperty('--orbit-tilt-x',`${((event.clientX-bounds.left)/bounds.width-.5)*5}deg`);plane.style.setProperty('--orbit-tilt-y',`${-((event.clientY-bounds.top)/bounds.height-.5)*3}deg`);
    }
  });
  const release=event=>{if(!drag||event.pointerId!==drag.id)return;if(drag.distance>6)discardClickUntil=performance.now()+400;drag=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);wakeOrbit();};
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
  addEventListener('pointerup',release);addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
  addEventListener('blur',()=>{if(drag)release({pointerId:drag.id});});
  stage.addEventListener('click',event=>{if(performance.now()<discardClickUntil)event.preventDefault();},true);
  stage.addEventListener('pointerleave',()=>{orbitHovered=false;plane.style.setProperty('--orbit-tilt-x','0deg');plane.style.setProperty('--orbit-tilt-y','0deg');wakeOrbit();});
  cards.forEach(card=>card.addEventListener('dragstart',event=>event.preventDefault()));
  addEventListener('resize',wakeOrbit,{passive:true});
  if(!reduced)renderOrbit();
  else cards.forEach(card=>{card.style.pointerEvents='auto';card.tabIndex=0;card.removeAttribute('aria-hidden');});

  const heroImage=document.querySelector('.hero-photo img');
  const washImage=document.querySelector('.carwash-photo img');
  const recycleImage=document.querySelector('.recycling-visual img');
  const scrollVisuals=()=>{
    scrollFrame=0;if(reduced)return;
    const y=scrollY, delta=y-lastScroll;lastScroll=y;
    const heroBounds=document.querySelector('.hero').getBoundingClientRect();
    if(heroBounds.bottom>0)heroImage.style.transform=`translateY(${Math.max(0,-heroBounds.top)*.12}px) scale(1.04)`;
    const washBounds=document.querySelector('.carwash').getBoundingClientRect();
    if(washBounds.top<innerHeight&&washBounds.bottom>0)washImage.style.transform=`translateY(${(innerHeight/2-washBounds.top-washBounds.height/2)*.07}px) scale(1.08)`;
    const recycleBounds=recycleImage.getBoundingClientRect();
    if(recycleBounds.top<innerHeight&&recycleBounds.bottom>0)recycleImage.style.setProperty('--recycle-angle',`${(innerHeight/2-recycleBounds.top)*.03}deg`);
    if(inView&&!drag){target+=Math.max(-100,Math.min(100,delta))*.006;wakeOrbit();}
  };
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollVisuals);},{passive:true});
  scrollVisuals();
  motionPreference.addEventListener('change',event=>{
    reduced=event.matches;
    if(reduced){
      cancelAnimationFrame(frame);frame=0;cancelAnimationFrame(scrollFrame);scrollFrame=0;
      if(drag)release({pointerId:drag.id});
      cards.forEach(card=>{card.style.pointerEvents='auto';card.tabIndex=0;card.removeAttribute('aria-hidden');});
    }else{lastOrbitTime=0;wakeOrbit();scrollVisuals();}
  });
})();
