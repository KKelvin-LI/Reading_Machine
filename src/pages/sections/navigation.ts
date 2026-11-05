import {playSound} from '../../ui/sounds';
import {expandableMotion} from '../../ui/expand-motion';
import {sectionSettings as cfg} from '../../config/sections';
import {createSquishyNavigation} from '../../three/squishy-navigation';
import type {ReadingSection} from './detection';
import '../../styles/pages/sections.css';
export function mountSectionNavigation(root:HTMLElement,go:(index:number,replace?:number,selection?:number[])=>Promise<void>){
 const host=document.createElement('nav');host.className='section-tabs';host.setAttribute('aria-label','Reading sections');root.querySelector('.reading-window')!.append(host);
 host.style.gridTemplateColumns=cfg.columns.map(n=>`${n}fr`).join(' ');
 let disposers:(()=>void)[]=[],footerDisposers:(()=>void)[]=[],serial=0,sections:ReadingSection[]=[],active=0,chosen=[0],slotIndices=[-2,-1,0];
 let unlocked=0;
 const openMenus=new Map<HTMLElement,(immediate?:boolean)=>Promise<void>>();
 const closeAll=(immediate=false)=>Promise.all([...openMenus.values()].map(close=>close(immediate)));
 document.addEventListener('click',event=>{const target=event.target as Element;if(!root.hidden&&!target.closest('button,input,textarea,select,a,label,.section-picker-menu,.reading-tools'))void closeAll();});
 function button(parent:HTMLElement,index:number,kind:string,always=false,action=go){
  const section=sections[index],el=document.createElement('button');el.type='button';el.className='section-button';el.dataset.nativeControl='';el.dataset.traceSection=String(index);parent.append(el);
  if(!section){el.disabled=true;el.classList.add('section-locked');el.setAttribute('aria-label','Previous section unavailable');el.innerHTML='<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M8 17V11a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" stroke-width="3.5"/><rect x="3" y="16" width="26" height="23" rx="5" fill="currentColor"/><circle cx="16" cy="25" r="3" fill="white"/><path d="M16 26v6" stroke="white" stroke-width="3"/></svg>';return;}

  if(kind==='choice'&&index>unlocked){el.disabled=true;el.classList.add('section-locked');el.setAttribute('aria-label',`Section ${section.index} locked`);el.innerHTML='<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M8 17V11a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" stroke-width="3.5"/><rect x="3" y="16" width="26" height="23" rx="5" fill="currentColor"/><circle cx="16" cy="25" r="3" fill="white"/><path d="M16 26v6" stroke="white" stroke-width="3"/></svg>';return;}
  const colourIndex=kind==='next'?index-1:index;
  const colour=cfg.colours[colourIndex%cfg.colours.length],letterColour=cfg.textColours[colourIndex%cfg.textColours.length];
  el.style.setProperty('--section-colour',colour);el.style.setProperty('--section-text-colour',letterColour);
  const full=kind==='next'?'Next Section':`Section ${section.index}: ${section.title.replace(/^(?:(?:section|chapter)\s+)?\d+(?:[.:)]\s*|\s+)/i,'')}`;
  el.title=full;el.setAttribute('aria-label',kind==='next'?`Next section: ${section.title}`:full);if(kind!=='next')el.setAttribute('aria-pressed',String(kind==='choice'?always:chosen.includes(index)));
  const label=document.createElement('span');label.className='section-button-label';label.textContent=full;
  const model=document.createElement('span');model.className='section-button-model';model.setAttribute('aria-hidden','true');el.append(label,model);
  let view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined,preparing:Promise<void>|undefined,hover=false,pressing=false,dead=false;
  const currentSerial=serial;
  function visual(){const visible=always||hover||pressing;el.classList.toggle('is-squishy',visible);view?.show(visible&&!root.hidden);}
  async function prepare(){if(preparing)return preparing;preparing=(async()=>{
    const next=await createSquishyNavigation(model,label,{text:full,colour,letterColour,sectionLabel:true});if(dead){next.dispose();return;}view=next;el.classList.add('model-ready');visual();
  })().catch(error=>console.warn('Section button model',error));return preparing;}
  el.addEventListener('pointerenter',()=>{hover=true;visual();void prepare();});el.addEventListener('pointerleave',()=>{hover=false;visual();});el.addEventListener('focus',()=>{hover=true;visual();void prepare();});el.addEventListener('blur',()=>{hover=false;visual();});
  el.addEventListener('click',async()=>{if(pressing||(kind==='choice'&&always))return;pressing=true;visual();try{await prepare();await view?.press();if(!dead&&(kind==='next'||currentSerial===serial))await action(index);}finally{pressing=false;visual();}});
  (kind==='next'?footerDisposers:disposers).push(()=>{dead=true;view?.dispose();});visual();
  if(always&&kind!=='next')requestAnimationFrame(()=>{if(!dead)void prepare();});
 }
 function render(){const reopen=Array.from(host.children).map((el,i)=>el.classList.contains('picker-open')?i:-1).filter(i=>i>=0);void closeAll(true);serial++;disposers.forEach(fn=>fn());disposers=[];host.replaceChildren();
  host.style.gridTemplateColumns=slotIndices.map((i,j)=>`${chosen.length===3?1:chosen.length===2?(chosen.includes(i)?3:2):cfg.columns[j]}fr`).join(' ');
  slotIndices.forEach((index,slot)=>{
   const wrap=document.createElement('div');wrap.className='section-selector';host.append(wrap);
   button(wrap,index,'section',chosen.includes(index));
   if(index<0)return;
   const arrow=document.createElement('button');arrow.type='button';arrow.className='section-picker-arrow';arrow.dataset.nativeControl='';
   arrow.setAttribute('aria-label',`Choose section for ${['left','middle','right'][slot]} panel`);arrow.setAttribute('aria-expanded','false');
   arrow.style.setProperty('--arrow-colour',cfg.textColours[Math.max(0,index)%cfg.textColours.length]);
   arrow.innerHTML='<svg viewBox="0 0 24 18" aria-hidden="true"><path d="M4 5 L12 13 L20 5"/></svg>';wrap.append(arrow);
   arrow.onclick=async event=>{
    if(event.isTrusted)playSound('close');
    const existing=openMenus.get(wrap);if(existing){await existing();return;}if(!wrap.isConnected)return;
    arrow.setAttribute('aria-expanded','true');wrap.classList.add('picker-open');
    const menu=document.createElement('div');menu.className='section-picker-menu';menu.setAttribute('role','group');menu.setAttribute('aria-label','Choose a section');wrap.append(menu);
    const disposeFrom=disposers.length;let owned:(()=>void)[]=[];
    const motion=expandableMotion(menu);let closing:Promise<void>|undefined,cleaned=false;
    const cleanup=()=>{if(cleaned)return;cleaned=true;motion.cancel();menu.remove();arrow.setAttribute('aria-expanded','false');wrap.classList.remove('picker-open');owned.forEach(fn=>fn());disposers=disposers.filter(fn=>!owned.includes(fn));openMenus.delete(wrap);};
    const close=(immediate=false):Promise<void>=>{if(immediate){cleanup();return Promise.resolve();}return closing??=(async()=>{await motion.play(false);cleanup();})();};
    openMenus.set(wrap,close);
    sections.forEach((_,choice)=>button(menu,choice,'choice',choice===index&&chosen.includes(index),async target=>{
     if(target===index&&chosen.includes(index))return;
     const selection=slotIndices.flatMap((value,i)=>i===slot?[target]:chosen.includes(value)?[value]:[]);
     slotIndices[slot]=target;
     await go(target,index,selection);
    }));
    owned=disposers.slice(disposeFrom);
    void motion.play(true);
   };
  });
  for(const slot of reopen)host.children[slot]?.querySelector<HTMLButtonElement>('.section-picker-arrow')?.click();
  root.style.setProperty('--active-section-colour',cfg.colours[active%cfg.colours.length]);
 }
 // Individual views already resize themselves. Rebuilding the whole navigation
 // here also invalidated still-visible Next Section buttons and churned GL contexts.
 function clearFooters(){footerDisposers.forEach(fn=>fn());footerDisposers=[];}

 return {clearFooters,footer(parent:HTMLElement,index:number,action:(index:number)=>Promise<void>){const wrap=document.createElement('div');wrap.className='section-next-footer';parent.append(wrap);button(wrap,index,'next',false,action);},set(value:ReadingSection[],index:number,selection=[index],limit=index){unlocked=limit;const old=Array.from(host.children).map(e=>e.getBoundingClientRect());if(sections!==value||active!==index)slotIndices=[index-2,index-1,index];sections=value;active=index;chosen=selection;render();if(!matchMedia("(prefers-reduced-motion: reduce)").matches)Array.from(host.children).forEach((e,i)=>{const b=e.getBoundingClientRect(),a=old[i];if(a&&b.width)e.animate([{transform:`translateX(${a.left-b.left}px) scaleX(${a.width/b.width})`},{transform:"none"}],{duration:cfg.transitionMs,easing:"cubic-bezier(.22,.7,.2,1)"});});},reset(){void closeAll(true);slotIndices=[-2,-1,0];clearFooters();serial++;disposers.forEach(fn=>fn());disposers=[];host.replaceChildren();sections=[];}};
}
