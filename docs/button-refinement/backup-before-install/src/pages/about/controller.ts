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
  track.append(copy,copy.cloneNode(true));reel.append(track);home.append(reel);
  let active=false,hover=false,suppress=false,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function visual(){const on=active||(hover&&!suppress);button!.classList.toggle('is-visual',on);view?.show(on&&!home.hidden);}
  function syncPause(){track.classList.toggle('is-paused',document.hidden||home.hidden);}
  function toggle(){active=!active;suppress=!active;button!.setAttribute('aria-pressed',String(active));reel.hidden=!active;home.classList.toggle('about-open',active);visual();syncPause();if(active)fillReel();}
  button.addEventListener('pointerenter',()=>{hover=true;visual();});button.addEventListener('pointerleave',()=>{hover=false;suppress=false;visual();});
  button.addEventListener('focus',()=>{hover=true;visual();});button.addEventListener('blur',()=>{hover=false;suppress=false;visual();});
  button.addEventListener('click',()=>{toggle();if(active)view?.press();});
  home.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){toggle();button.focus();suppress=true;visual();}});
  document.addEventListener('visibilitychange',syncPause);reduced.addEventListener('change',syncPause);
  new MutationObserver(()=>{syncPause();visual();}).observe(home,{attributes:true,attributeFilter:['hidden']});
  // Each identical half is at least as tall as the viewport, even on narrow screens.
  let repeats=0;
  function fillReel(){
    if(reel.hidden)return;
    const count=Math.max(1,Math.ceil(reel.clientHeight/copy.getBoundingClientRect().height));
    if(!Number.isFinite(count)||count===repeats)return;
    repeats=count;const half=document.createElement('div');half.append(copy);
    for(let i=1;i<count;i++)half.append(copy.cloneNode(true));
    track.replaceChildren(half,half.cloneNode(true));track.style.setProperty('--about-duration',`${cfg.secondsPerLoop*count}s`);
  }
  new ResizeObserver(fillReel).observe(reel);
  // Plain coloured letters remain readable if WebGL or an asset fails.
  void paintInflatedLetters(copy).then(()=>{repeats=0;fillReel();}).catch(e=>console.warn('About letters unavailable',e));
  void createSquishyNavigation(model,label).then(v=>{view=v;button.classList.add('model-ready');visual();}).catch(e=>console.warn('About button unavailable',e));
}
