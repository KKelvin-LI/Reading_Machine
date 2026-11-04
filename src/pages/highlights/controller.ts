import {captureMarks,mountSavedMarks} from './marks';
import type {ReadingSection} from '../sections/detection';
import {createSquishyNavigation} from '../../three/squishy-navigation';
import {historyArt,pressCross} from '../../three/history-art';
import {historySettings as cfg} from '../../config/history';
import {listHighlights,saveHighlight,deleteHighlight,type SavedHighlight} from './store';
import '../../styles/pages/highlights.css';

export function mountHighlights(root:HTMLElement,goTo:(page:number,position:number)=>Promise<void>,resolveSection:(page:number,position:number)=>Promise<ReadingSection>){
  const stage=root.querySelector<HTMLElement>('#page-stage')!;
  const button=root.querySelector<HTMLButtonElement>('#highlights-toggle')!;
  const label=button.querySelector<HTMLElement>('.about-button-label')!;
  const model=button.querySelector<HTMLElement>('.about-button-model')!;
  const panel=document.createElement('section');panel.id='highlights-panel';panel.className='history-panel highlights-panel';panel.hidden=true;panel.setAttribute('aria-label','Saved highlights');
  panel.innerHTML=`<div class="history-content"><button class="highlights-close" data-native-control aria-label="Close highlights"><img alt="">×</button><label class="history-search"><span class="reader-sr-only">Search highlights</span><input type="search" placeholder="Type to search" aria-label="Search highlights"><span class="history-rule" aria-hidden="true"></span></label><p class="history-status" role="status"></p><div class="history-rows"></div></div>`;
  panel.querySelector('.history-search')!.append(panel.querySelector('.highlights-close')!);
  root.querySelector('.reading-window')!.append(panel);
  const input=panel.querySelector('input')!,rows=panel.querySelector<HTMLElement>('.history-rows')!,status=panel.querySelector<HTMLElement>('.history-status')!,close=panel.querySelector<HTMLButtonElement>('.highlights-close')!;
  let documentId:string|undefined,pages=1,entries:SavedHighlight[]=[],active=false,busy=false,hover=false,pressing=false,suppress=false,version=0;
  let view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined,ready:Promise<typeof view>|undefined;
  const redrawMarks=mountSavedMarks(stage,()=>entries,'#bae4ee',async id=>{await deleteHighlight(id);entries=entries.filter(e=>e.id!==id);render();});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function visual(){const on=pressing||hover;button.classList.toggle('is-visual',on);view?.show(on&&!root.hidden);}
  function prepare(){return ready??=createSquishyNavigation(model,label,{text:'HIGHLIGHTS',colour:'#69bf64',letterColour:'#f89823'}).then(v=>{view=v;button.classList.add('model-ready');visual();return v;}).catch(e=>{console.warn(e);return undefined;});}
  function enter(){hover=true;suppress=false;visual();void prepare();}
  button.addEventListener('pointerenter',enter);button.addEventListener('focus',enter);
  button.addEventListener('pointerleave',()=>{hover=false;visual();});button.addEventListener('blur',()=>{hover=false;visual();});
  const artReady=Promise.all([
    historyArt('cross','#151410').then(f=>{(close.querySelector('img')!).src=f[0];close.classList.add('has-art');}),
  ]).catch(console.warn);
  async function slide(show:boolean){
    const token=version;
    if(show){panel.hidden=false;root.classList.add('highlights-open');stage.inert=true;root.dispatchEvent(new Event('reader:highlights-open'));}
    const animation=panel.animate([{transform:show?'translateY(110%)':'translateY(0)'},{transform:show?'translateY(0)':'translateY(110%)'}],{duration:reduced.matches?0:cfg.slideSeconds*1000,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'});
    try{await animation.finished;}catch{return;}animation.cancel();if(token!==version)return;
    active=show;button.setAttribute('aria-expanded',String(show));
    if(!show){panel.hidden=true;root.classList.remove('highlights-open');stage.inert=false;button.focus();}
    else input.focus();
  }
  async function toggle(){if(busy)return;busy=true;const token=version;pressing=true;suppress=false;visual();
    try{await (await prepare())?.press();if(token!==version)return;pressing=false;suppress=true;visual();await artReady;await slide(!active);}
    finally{if(token===version){busy=false;pressing=false;visual();}}
  }
  button.addEventListener('click',()=>void toggle());
  close.addEventListener('click',async()=>{if(busy)return;busy=true;const token=version;try{await pressCross(close.querySelector('img')!,'#151410',cfg.deleteSeconds);if(token===version)await slide(false);}finally{if(token===version)busy=false;}});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!busy){e.preventDefault();void slide(false);}});
  function render(){redrawMarks();
    rows.replaceChildren();const query=input.value.trim().toLocaleLowerCase();const matches=entries.filter(e=>e.text.toLocaleLowerCase().includes(query));
    status.textContent=!entries.length?'Highlight text in your PDF to save it here.':!matches.length?'No matching highlights.':'';
    for(const entry of matches){
      const colour=cfg.colours[entries.indexOf(entry)%cfg.colours.length];const row=document.createElement('article');row.className='history-row';row.style.setProperty('--row-colour',colour);
      const link=document.createElement('button');link.type='button';link.className='history-document';link.dataset.nativeControl='';
      const text=document.createElement('span');text.className='history-title';text.textContent=entry.text;
      const meta=document.createElement('span');meta.className='history-meta';const date=new Intl.DateTimeFormat('en-AU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(entry.savedAt);
      meta.textContent=`Saved on ${date}  From ${entry.sectionTitle??`Section ${entry.section}`}  Page ${entry.page}${entry.endPage!==entry.page?'–'+entry.endPage:''}`;
      link.append(text,meta);link.addEventListener('click',async()=>{if(busy)return;busy=true;try{await slide(false);await goTo(entry.page,entry.position);stage.focus();}finally{busy=false;}});
      const remove=document.createElement('button');remove.type='button';remove.className='history-delete';remove.dataset.nativeControl='';remove.setAttribute('aria-label',`Delete highlight: ${entry.text}`);
      const cross=document.createElement('img');cross.alt='';remove.append(cross);void historyArt('cross',colour).then(f=>cross.src=f[0]).catch(()=>remove.textContent='×');
      remove.addEventListener('click',async()=>{if(remove.disabled)return;remove.disabled=true;const token=version;try{await pressCross(cross,colour,cfg.deleteSeconds);await deleteHighlight(entry.id);if(token===version){entries=entries.filter(e=>e.id!==entry.id);render();}}catch{status.textContent='Could not delete this highlight.';remove.disabled=false;}});
      const rule=document.createElement('span');rule.className='history-rule';rule.setAttribute('aria-hidden','true');rule.style.setProperty('--row-colour',colour);row.append(link,remove,rule);rows.append(row);
    }
  }
  input.addEventListener('input',render);
  async function capture(provided?:Range){
    if(root.hidden||active)return;
    if(!documentId)throw new Error('PDF must be saved before highlighting');
    const selection=window.getSelection();if(!provided&&(!selection?.rangeCount||selection.isCollapsed))return;
    const range=provided??selection!.getRangeAt(0);if(!stage.contains(range.startContainer)||!stage.contains(range.endContainer))return;
    const text=range.toString().replace(/\s+/g,' ').trim();if(!text)return;
    const element=(node:Node)=>node instanceof Element?node:node.parentElement;
    const start=element(range.startContainer)?.closest<HTMLElement>('.pdf-slot'),end=element(range.endContainer)?.closest<HTMLElement>('.pdf-slot');if(!start||!end)return;
    const page=Number(start.dataset.page),endPage=Number(end.dataset.page);if(!page||entries.some(e=>e.text===text&&e.page===page&&e.endPage===endPage))return;
    const position=Math.max(0,Math.min(1,(range.getBoundingClientRect().top-start.getBoundingClientRect().top)/start.offsetHeight));
    const rects=captureMarks(stage,range);
    const token=version;const detected=await resolveSection(page,position);if(token!==version)return;
    const section=detected.index;
    const entry:SavedHighlight={id:crypto.randomUUID(),documentId,text,savedAt:Date.now(),page,endPage,section,sectionTitle:detected.title,position,rects};
    entries.unshift(entry);
    try{await saveHighlight(entry);if(token===version)render();}catch{if(token===version){entries=entries.filter(e=>e.id!==entry.id);status.textContent='Could not save this highlight. Browser storage may be full.';}throw new Error('Could not save highlight');}
  }

  function reset(){version++;panel.getAnimations().forEach(a=>a.cancel());active=busy=hover=pressing=false;suppress=true;panel.hidden=true;root.classList.remove('highlights-open');stage.inert=false;button.setAttribute('aria-expanded','false');input.value='';view?.show(false);visual();}
  return {
    save:capture,
    refreshSections(resolve:(page:number,position:number)=>ReadingSection){for(const entry of entries){const section=resolve(entry.page,entry.position);entry.section=section.index;entry.sectionTitle=section.title;}render();},
    async setDocument(id:string|undefined,count:number){reset();documentId=id;pages=count;entries=[];render();const token=version;if(id)try{const saved=await listHighlights(id);if(token===version){entries=saved.sort((a,b)=>b.savedAt-a.savedAt);render();}}catch{status.textContent='Saved highlights are unavailable.';}},
    reset(){reset();documentId=undefined;entries=[];redrawMarks();},
  };
}
