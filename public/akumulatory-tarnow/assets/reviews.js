(() => {
  'use strict';
  const section=document.querySelector('#opinie');
  if(!section)return;
  const quotes=JSON.parse(document.querySelector('#review-source-data').textContent);
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=motionPreference.matches;
  const stage=section.querySelector('.review-cylinder');
  const ring=section.querySelector('.review-cylinder-ring');
  const slots=[...section.querySelectorAll('[data-review-slot]')];
  const total=slots.length, step=Math.PI*2/total;
  const dialog=section.querySelector('.review-dialog');
  const quoteText=section.querySelector('[data-review-full-text]');
  const pauseButton=section.querySelector('[data-reviews-pause]');
  let rotation=-Math.PI/2,target=0,momentum=0,frame=0,lastTime=0,visible=false,started=0;
  let paused=false,hovered=false,focused=false,drag=null,flatten=0,flattenTarget=0,holdTimer=0;
  let active=0,opened=0,closing=false,returnFocus=null,closeTimer=0,changeTimer=0,discardClickUntil=0;
  let pointerX=0,pointerY=0;
  const wrap=(n,count)=>((n+count/2)%count+count)%count-count/2;
  const wake=()=>{if(!reduced&&!frame)frame=requestAnimationFrame(draw);};
  const setPauseIcon=()=>{
    pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.setAttribute('aria-label',paused?'Wznów ruch opinii':'Zatrzymaj ruch opinii');
    pauseButton.innerHTML=paused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  };
  function draw(now){
    frame=0;if(reduced)return;
    const elapsed=lastTime?Math.min(40,now-lastTime):16.67;lastTime=now;
    const mobile=stage.clientWidth<760;
    const ambient=visible&&!paused&&!hovered&&!focused&&!drag&&!dialog.open;
    if(ambient)target+=elapsed*(mobile?.000075:.000105);
    rotation+=(target-rotation)*.09;
    if(!drag&&Math.abs(momentum)>.00001){target+=momentum;momentum*=.94;}
    flatten+=(flattenTarget-flatten)*.12;
    const entrance=Math.min(1,(now-started)/1100);
    const entranceEase=Math.sqrt(1-Math.pow(entrance-1,2));
    const radius=Math.max(640,stage.clientWidth*.60);
    const distance=rotation/step;
    slots.forEach((slot,i)=>{
      let x,y,z,turn,opacity;
      if(mobile){
        const relative=wrap(i-distance,total);
        x=relative*295;y=Math.abs(relative)*12;z=-Math.abs(relative)*80;turn=-relative*9;
        opacity=Math.max(0,1-Math.abs(relative)*.55);
        slot.style.pointerEvents=Math.abs(relative)<1.5?'auto':'none';
      } else {
        const angle=i*step-rotation;
        const front=Math.cos(angle);
        x=Math.sin(angle)*radius;
        y=front*145*(1-flatten*.55);
        z=front*245-105-(1-entranceEase)*450;
        let angleDegrees=angle*180/Math.PI;
        angleDegrees=((angleDegrees+180)%360+360)%360-180;
        turn=front<0?angleDegrees+(angleDegrees>0?-180:180):angleDegrees;
        opacity=(.36+.64*(front+1)/2)*Math.max(0,Math.min(1,entrance*1.6-i*.018));
        slot.style.pointerEvents=Math.abs(Math.sin(angle))<.995?'auto':'none';
      }
      slot.style.setProperty('--review-x',`${x.toFixed(2)}px`);
      slot.style.setProperty('--review-y',`${y.toFixed(2)}px`);
      slot.style.setProperty('--review-z',`${z.toFixed(2)}px`);
      slot.style.setProperty('--review-turn',`${turn.toFixed(2)}deg`);
      slot.style.setProperty('--review-opacity',opacity.toFixed(3));
      slot.style.zIndex=String(Math.round(z+1000));
    });
    active=(((Math.round(distance)%total)+total)%total)%quotes.length;
    section.querySelector('[data-review-current]').textContent=String(active+1).padStart(2,'0');
    if(visible&&(ambient||entrance<1||Math.abs(target-rotation)>.0001||Math.abs(momentum)>.00001||Math.abs(flattenTarget-flatten)>.001))frame=requestAnimationFrame(draw);
  }
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;lastTime=0;
    if(visible){if(!started)started=performance.now();wake();}
  },{rootMargin:'80px'});
  observer.observe(stage);
  section.querySelector('[data-reviews-prev]').addEventListener('click',()=>{target-=step;momentum=0;wake();});
  section.querySelector('[data-reviews-next]').addEventListener('click',()=>{target+=step;momentum=0;wake();});
  pauseButton.addEventListener('click',()=>{paused=!paused;focused=false;setPauseIcon();wake();});
  stage.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();target-=step;wake();}
    if(event.key==='ArrowRight'){event.preventDefault();target+=step;wake();}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();openReview(active,stage);}
  });
  section.addEventListener('focusin',event=>{focused=event.target.matches(':focus-visible');});
  section.addEventListener('focusout',event=>{if(!section.contains(event.relatedTarget)){focused=false;wake();}});
  slots.forEach(slot=>{slot.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')hovered=true;});slot.addEventListener('pointerleave',()=>{hovered=false;wake();});});
  stage.addEventListener('pointerleave',()=>{hovered=false;ring.style.setProperty('--review-tilt-x','0deg');ring.style.setProperty('--review-tilt-y','0deg');wake();});
  stage.addEventListener('pointerdown',event=>{
    if(reduced||event.button!==0)return;
    const bounds=stage.getBoundingClientRect();
    drag={id:event.pointerId,start:event.clientX,last:event.clientX,distance:0,touch:event.pointerType==='touch',upper:event.clientY<bounds.top+bounds.height/2};
    momentum=0;stage.classList.add('is-dragging');
    holdTimer=setTimeout(()=>{if(drag){flattenTarget=1;wake();}},150);
  });
  stage.addEventListener('pointermove',event=>{
    if(reduced)return;
    if(drag){
      const delta=event.clientX-drag.last;drag.last=event.clientX;drag.distance=Math.max(drag.distance,Math.abs(event.clientX-drag.start));
      if(drag.distance>6&&!stage.hasPointerCapture(drag.id))stage.setPointerCapture(drag.id);
      const sign=stage.clientWidth<760?-1:drag.upper?1:-1;
      const gain=drag.touch?.004:.0022;
      target+=delta*gain*sign;momentum=delta*gain*sign*.25;wake();
    }else if(event.pointerType==='mouse'){
      const bounds=stage.getBoundingClientRect();
      pointerX=(event.clientX-bounds.left)/bounds.width-.5;
      pointerY=(event.clientY-bounds.top)/bounds.height-.5;
      ring.style.setProperty('--review-tilt-x',`${pointerX*4}deg`);
      ring.style.setProperty('--review-tilt-y',`${-pointerY*3}deg`);
    }
  });
  const release=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(drag.distance>6)discardClickUntil=performance.now()+450;
    clearTimeout(holdTimer);flattenTarget=0;drag=null;stage.classList.remove('is-dragging');
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);wake();
  };
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
  addEventListener('pointerup',release);addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
  addEventListener('blur',()=>{if(drag)release({pointerId:drag.id});});
  stage.addEventListener('click',event=>{
    if(performance.now()<discardClickUntil)return;
    const tile=event.target.closest('[data-review-index]');if(tile)openReview(Number(tile.dataset.reviewIndex),stage);
  });
  // Wheel and page scrolling both contribute; native vertical navigation is retained.
  stage.addEventListener('wheel',event=>{if(!reduced){target+=(event.deltaX||event.deltaY)*.0005;wake();}},{passive:true});
  let previousScroll=scrollY;
  addEventListener('scroll',()=>{const delta=scrollY-previousScroll;previousScroll=scrollY;if(visible&&!drag&&!dialog.open&&!reduced){target+=Math.max(-100,Math.min(100,delta))*.0004;wake();}},{passive:true});
  addEventListener('resize',wake,{passive:true});

  const showQuote=index=>{
    quoteText.classList.remove('is-changing');
    opened=((index%quotes.length)+quotes.length)%quotes.length;
    quoteText.textContent=quotes[opened].text;
    section.querySelector('[data-review-dialog-counter]').textContent=`${String(opened+1).padStart(2,'0')} / ${String(quotes.length).padStart(2,'0')}`;
  };
  function openReview(index,trigger){
    if(dialog.open)return;
    clearTimeout(closeTimer);closing=false;returnFocus=trigger||document.activeElement;showQuote(index);
    dialog.showModal();document.documentElement.classList.add('review-open');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(dialog.open&&!closing)dialog.classList.add('is-open');}));
  }
  const closeReview=()=>{
    if(!dialog.open||closing)return;
    closing=true;clearTimeout(changeTimer);quoteText.classList.remove('is-changing');dialog.classList.remove('is-open');
    closeTimer=setTimeout(()=>{dialog.close();document.documentElement.classList.remove('review-open');closing=false;returnFocus?.focus({preventScroll:true});wake();},reduced?0:320);
  };
  const moveQuote=direction=>{
    if(closing)return;
    clearTimeout(changeTimer);
    if(reduced){showQuote(opened+direction);return;}
    quoteText.classList.add('is-changing');
    changeTimer=setTimeout(()=>{showQuote(opened+direction);quoteText.classList.remove('is-changing');},160);
  };
  section.querySelector('[data-read-review]').addEventListener('click',event=>openReview(active,event.currentTarget));
  section.querySelector('[data-review-close]').addEventListener('click',closeReview);
  section.querySelector('[data-review-dialog-prev]').addEventListener('click',()=>moveQuote(-1));
  section.querySelector('[data-review-dialog-next]').addEventListener('click',()=>moveQuote(1));
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeReview();});
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();moveQuote(1);}if(event.key==='ArrowLeft'){event.preventDefault();moveQuote(-1);}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeReview();}});
  if(reduced)section.querySelector('.reviews-full-list').open=true;
  motionPreference.addEventListener('change',event=>{
    reduced=event.matches;
    if(reduced){
      cancelAnimationFrame(frame);frame=0;clearTimeout(changeTimer);quoteText.classList.remove('is-changing');
      if(drag)release({pointerId:drag.id});
      section.querySelector('.reviews-full-list').open=true;
    }else{lastTime=0;started=performance.now();wake();}
  });
})();
