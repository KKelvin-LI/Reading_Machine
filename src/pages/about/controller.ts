import { aboutSettings as cfg } from '../../config/about';
import { paintInflatedLetters } from '../../three/about-assets';
import { createSquishyNavigation } from '../../three/squishy-navigation';
import '../../styles/pages/about.css';

export function mountAbout(home:HTMLElement) {
  if(home.classList.contains('about-enabled'))return;
  const button=[...home.querySelectorAll<HTMLButtonElement>('.home-navigation button')].find(b=>b.textContent?.trim()==='ABOUT');
  if(!button)throw new Error('ABOUT navigation button not found');
  home.classList.add('about-enabled');button.classList.add('about-toggle');button.removeAttribute('aria-disabled');
  button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','about-reel');button.setAttribute('aria-label','About');
  const label=document.createElement('span');label.className='about-button-label';label.textContent='ABOUT';
  const model=document.createElement('span');model.className='about-button-model';model.setAttribute('aria-hidden','true');button.replaceChildren(label,model);
  const mask=document.createElement('div');mask.className='about-top-mask';mask.setAttribute('aria-hidden','true');home.append(mask);
  const reel=document.createElement('section');reel.id='about-reel';reel.className='about-reel';reel.hidden=true;reel.setAttribute('aria-label','About The Reading Machine');
  const accessible=document.createElement('p');accessible.className='about-sr-only';accessible.textContent=cfg.lines.map(l=>l.replace(/\[([^:]+):[^\]]+\]/g,'$1')).join(' ');reel.append(accessible);
  const track=document.createElement('div');track.className='about-track';track.setAttribute('aria-hidden','true');track.style.setProperty('--about-duration',`${cfg.secondsPerLoop}s`);
  const copy=document.createElement('div');copy.className='about-copy';
  for(const text of cfg.lines){
    const row=document.createElement('div');row.className='about-line';let end=0;
    for(const match of text.matchAll(/\[([^:]+):([^\]]+)\]/g)){
      row.append(text.slice(end,match.index));const span=document.createElement('span');span.className='about-letter';span.textContent=match[1];
      const colour=cfg.palette[match[2] as keyof typeof cfg.palette];if(!colour)throw new Error('Unknown About colour '+match[2]);
      span.dataset.glyph=match[1];span.dataset.colour=colour;span.style.color=colour;row.append(span);end=match.index!+match[0].length;
    }
    row.append(text.slice(end));copy.append(row);
  }
  reel.append(track);home.append(reel);
  let active=false,hover=false,suppress=false,pressing=false,busy=false,actionVersion=0;
  let view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function visual(){
    const on=pressing||hover;
    button!.classList.toggle('is-visual',on);view?.show(on&&!home.hidden);
  }
  function syncPause(){lastScroll=performance.now();}
  function setOpen(value:boolean){
    active=value;button!.setAttribute('aria-pressed',String(value));reel.hidden=!value;
    home.classList.toggle('about-open',value);syncPause();
  }
  const ready=createSquishyNavigation(model,label).then(v=>{
    view=v;button!.classList.add('model-ready');visual();return v;
  }).catch(error=>{console.warn('About button unavailable',error);return undefined;});
  async function clickAbout(){
    if(busy)return;
    const action=++actionVersion;
    const closing=active;busy=true;pressing=true;suppress=false;
    visual();
    const drained=closing?finishScrolling():Promise.resolve();
    try{
      const modelView=await ready;
      // Resolves on the animation completion, not a timeout.
      await modelView?.press();
      if(action!==actionVersion)return;
      if(closing)scrollMultiplier=cfg.closingSpeedMultiplier;
      pressing=false;suppress=true;visual();
      await drained;
    }finally{
      if(action!==actionVersion)return;
      if(!closing)home.dispatchEvent(new Event('home:about-open'));
      setOpen(!closing);
      if(!closing)startScrolling();
      if(closing)suppress=true;
      pressing=false;suppress=true;busy=false;visual();
    }
  }
  button.addEventListener('pointerenter',()=>{hover=true;suppress=false;visual();});
  button.addEventListener('pointerleave',()=>{hover=false;visual();});
  button.addEventListener('focus',()=>{hover=true;suppress=false;visual();});
  button.addEventListener('blur',()=>{hover=false;visual();});
  button.addEventListener('click',()=>{void clickAbout();});
  home.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!busy)void clickAbout();});
  document.addEventListener('visibilitychange',syncPause);reduced.addEventListener('change',syncPause);
  new MutationObserver(()=>{syncPause();visual();}).observe(home,{attributes:true,attributeFilter:['hidden']});
  // Each paragraph has its own position, so closing can discard only future copies.
  let paragraphs:{el:HTMLElement;y:number}[]=[];
  let repeating=false,scrollFrame=0,lastScroll=0,scrollMultiplier=1;
  let resolveDrain:(()=>void)|undefined;
  function addParagraph(y:number){
    const el=copy.cloneNode(true) as HTMLElement;
    el.style.position='absolute';el.style.width='100%';el.style.top='0';
    track.append(el);paragraphs.push({el,y});positionParagraphs();
  }
  function positionParagraphs(){for(const item of paragraphs)item.el.style.transform=`translateY(${item.y}px)`;}
  function completeDrain(){const done=resolveDrain;resolveDrain=undefined;done?.();}
  function scrollTick(now:number){
    scrollFrame=0;
    const dt=Math.min(.1,Math.max(0,(now-lastScroll)/1000));lastScroll=now;
    if(!document.hidden&&!home.hidden&&!reduced.matches&&!document.body.classList.contains('catch-open')){
      const h=paragraphs[0]?.el.getBoundingClientRect().height||1;
      const speed=h/Math.max(1,cfg.secondsPerLoop)*scrollMultiplier;
      for(const item of paragraphs)item.y-=dt*speed;
      paragraphs=paragraphs.filter(item=>{
        if(item.y+item.el.getBoundingClientRect().height<=0){item.el.remove();return false;}return true;
      });
      if(repeating){
        if(!paragraphs.length)addParagraph(reel.clientHeight);
        let last=paragraphs[paragraphs.length-1];
        while(last.y+last.el.getBoundingClientRect().height<reel.clientHeight){
          addParagraph(last.y+Math.max(1,last.el.getBoundingClientRect().height));last=paragraphs[paragraphs.length-1];
        }
      }
      positionParagraphs();
    }
    if(!repeating&&!paragraphs.length){completeDrain();return;}
    scrollFrame=requestAnimationFrame(scrollTick);
  }
  function startScrolling(){
    cancelAnimationFrame(scrollFrame);track.replaceChildren();paragraphs=[];repeating=true;scrollMultiplier=1;
    addParagraph(reduced.matches?0:reel.clientHeight);
    lastScroll=performance.now();scrollFrame=requestAnimationFrame(scrollTick);
  }
  function finishScrolling():Promise<void>{
    repeating=false;
    // Remove queued paragraphs before they enter; keep every already-visible paragraph.
    paragraphs=paragraphs.filter(item=>{
      if(reduced.matches||item.y>=reel.clientHeight){item.el.remove();return false;}return true;
    });
    if(!paragraphs.length)return Promise.resolve();
    return new Promise(resolve=>{resolveDrain=resolve;});
  }
  reduced.addEventListener('change',()=>{
    if(reduced.matches){
      if(!repeating){for(const item of paragraphs)item.el.remove();paragraphs=[];completeDrain();}
      else if(paragraphs.length){paragraphs[0].y=0;positionParagraphs();}
    }
  });
  function resetAbout(){
    actionVersion++;repeating=false;cancelAnimationFrame(scrollFrame);
    for(const item of paragraphs)item.el.remove();paragraphs=[];completeDrain();
    setOpen(false);busy=false;pressing=false;hover=false;suppress=true;visual();
  }
  home.addEventListener('home:history-open',resetAbout);
  home.addEventListener('home:reset',resetAbout);
  // New paragraphs use the prepared inflated sprites once they finish loading.
  void paintInflatedLetters(copy).catch(e=>console.warn('About letters unavailable',e));
}
