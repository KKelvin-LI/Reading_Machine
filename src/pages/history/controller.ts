import {historySettings as cfg} from '../../config/history';
import {createSquishyNavigation} from '../../three/squishy-navigation';
import {historyArt,pressCross} from '../../three/history-art';
import {listHistory,getHistory,removeHistory,type HistorySummary} from './store';
import '../../styles/pages/history.css';

export function mountHistory(home:HTMLElement,open:(file:File,id:string,page:number)=>Promise<void>){
  const button=[...home.querySelectorAll<HTMLButtonElement>('.home-navigation button')].find(b=>b.textContent?.trim()==='READING HISTORY')!;
  button.setAttribute('aria-label','Reading history');button.removeAttribute('aria-disabled');button.classList.add('history-toggle');button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','history-panel');
  const label=document.createElement('span');label.className='about-button-label';label.textContent='READING HISTORY';
  const model=document.createElement('span');model.className='about-button-model';model.setAttribute('aria-hidden','true');button.replaceChildren(label,model);
  const panel=document.createElement('section');panel.id='history-panel';panel.className='history-panel';panel.hidden=true;panel.setAttribute('aria-label','Reading history');
  panel.innerHTML='<div class="history-content"><label class="history-search"><span class="about-sr-only">Search reading history</span><input type="search" placeholder="Type to search" aria-label="Search reading history"><span class="history-rule" aria-hidden="true"></span></label><p class="history-status" role="status"></p><div class="history-rows"></div></div>';
  const close=document.createElement('button');close.type='button';close.className='history-close';close.dataset.nativeControl='';close.setAttribute('aria-label','Close reading history');
  const closeArt=document.createElement('img');closeArt.alt='';close.append(closeArt);panel.querySelector('.history-search')!.append(close);
  void historyArt('cross','#151410').then(f=>closeArt.src=f[0]);
  close.addEventListener('click',async()=>{if(!active||busy||close.disabled)return;close.disabled=true;try{await pressCross(closeArt,'#151410',cfg.deleteSeconds);if(active&&!busy)await toggle(false);}finally{close.disabled=false;}});
  home.append(panel);
  const input=panel.querySelector('input')!,rows=panel.querySelector<HTMLElement>('.history-rows')!,status=panel.querySelector<HTMLElement>('.history-status')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,busy=false,hover=false,suppress=false,pressing=false,entries:HistorySummary[]=[],version=0,navigationVersion=0,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined;
  const ready=createSquishyNavigation(model,label,{text:'READING HISTORY',colour:cfg.buttonColour,letterColour:cfg.buttonLetterColour}).then(v=>{view=v;button.classList.add('model-ready');visual();return v;}).catch(e=>{console.warn(e);return undefined;});
  function visual(){const on=pressing||hover;button.classList.toggle('is-visual',on);view?.show(on&&!home.hidden);}
  async function slide(show:boolean,holdAtBottom=false){
    if(show){panel.hidden=false;home.classList.add('history-open');}
    await new Promise<void>((resolve,reject)=>document.dispatchEvent(new CustomEvent('eaty:window',{detail:{panel,reverse:!show,holdAtBottom,resolve,reject}})));
    panel.style.visibility='';
    if(!show){panel.hidden=true;home.classList.remove('history-open');}
  }
  async function toggle(pressButton=true){
    if(busy)return;const navigation=++navigationVersion;busy=true;pressing=pressButton;suppress=!pressButton;if(!pressButton)hover=false;visual();const opening=!active;
    try{
      if(pressButton)await (await ready)?.press();
      if(navigation!==navigationVersion)return;
      pressing=false;suppress=true;visual();
      if(opening){home.dispatchEvent(new Event('home:history-open'));await refresh();}
      if(navigation!==navigationVersion)return;
      await slide(opening);if(navigation!==navigationVersion)return;active=opening;button.setAttribute('aria-pressed',String(active));
      if(!opening)suppress=true;
    }catch(e){status.textContent='History could not be opened. Please try again.';console.error(e);}
    finally{if(navigation===navigationVersion){pressing=false;suppress=true;busy=false;visual();}}
  }
  button.addEventListener('pointerenter',()=>{hover=true;suppress=false;visual();});button.addEventListener('pointerleave',()=>{hover=false;visual();});
  button.addEventListener('focus',()=>{hover=true;suppress=false;visual();});button.addEventListener('blur',()=>{hover=false;visual();});button.addEventListener('click',()=>void toggle());
  home.addEventListener('home:reset',()=>{
    navigationVersion++;for(const animation of panel.getAnimations())animation.cancel();
    active=false;busy=false;pressing=false;hover=false;suppress=true;
    panel.hidden=true;home.classList.remove('history-open');button.setAttribute('aria-pressed','false');
    input.value='';render();visual();
  });
  home.addEventListener('home:about-open',()=>{if(active&&!busy){active=false;button.setAttribute('aria-pressed','false');suppress=true;void slide(false).then(visual);}});
  home.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!busy)void toggle();});
  new MutationObserver(visual).observe(home,{attributes:true,attributeFilter:['hidden']});
  async function refresh(){const n=++version;try{const result=await listHistory();if(n!==version)return;entries=result;render();}catch(e){status.textContent='Your browser could not access saved PDFs.';console.error(e);}}
  function render(){
    rows.replaceChildren();const query=input.value.trim().toLocaleLowerCase();
    const matches=entries.filter(e=>e.name.toLocaleLowerCase().includes(query));
    status.textContent=!entries.length?'Your imported PDFs will appear here.':!matches.length?'No matching PDFs.':'';
    for(const entry of matches){
      const colour=cfg.colours[entries.indexOf(entry)%cfg.colours.length];
      const row=document.createElement('article');row.className='history-row';row.style.setProperty('--row-colour',colour);
      const link=document.createElement('button');link.type='button';link.className='history-document';link.setAttribute('data-native-control','');
      const title=document.createElement('span');title.className='history-title';title.textContent=entry.name.replace(/\.pdf$/i,'');
      const meta=document.createElement('span');meta.className='history-meta';const date=new Intl.DateTimeFormat('en-AU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(entry.openedAt);meta.textContent=`Read on ${date}  ${Math.round(entry.progress)}%`;
      link.append(title,meta);link.addEventListener('click',async()=>{if(busy)return;busy=true;link.disabled=true;try{const saved=await getHistory(entry.id);if(!saved)throw new Error('PDF is missing');await slide(false,true);active=false;button.setAttribute('aria-pressed','false');await open(saved.file,entry.id,saved.page);}catch(e){status.textContent='Could not reopen this PDF. Please import it again.';}finally{busy=false;link.disabled=false;document.dispatchEvent(new Event('eaty:release-hold'));}});
      const remove=document.createElement('button');remove.type='button';remove.className='history-delete';remove.setAttribute('data-native-control','');remove.setAttribute('aria-label',`Delete ${entry.name} from history`);
      const cross=document.createElement('img');cross.alt='';remove.append(cross);void historyArt('cross',colour).then(f=>cross.src=f[0]).catch(()=>{remove.textContent='×';});
      remove.addEventListener('click',async()=>{if(remove.disabled)return;remove.disabled=true;try{await pressCross(cross,colour,cfg.deleteSeconds);await removeHistory(entry.id);}catch(e){status.textContent='Could not delete this entry. Please try again.';remove.disabled=false;}});
      const rule=document.createElement('span');rule.className='history-rule';rule.setAttribute('aria-hidden','true');rule.style.setProperty('--row-colour',colour);
      row.append(link,remove,rule);rows.append(row);
    }
  }
  const metricCanvas=document.createElement('canvas').getContext('2d')!;
  function measureSpacing(){
    const style=getComputedStyle(home),size=parseFloat(style.fontSize);
    metricCanvas.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const m=metricCanvas.measureText('READING HISTORY');
    const top=(size-m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2+m.fontBoundingBoxAscent-m.actualBoundingBoxAscent;
    const bottom=size-top-m.actualBoundingBoxAscent-m.actualBoundingBoxDescent;
    panel.style.setProperty('--history-ink-top',`${Math.max(0,top)}px`);
    panel.style.setProperty('--history-ink-bottom',`${Math.max(0,bottom)}px`);
    const about=home.querySelector<HTMLElement>('.about-button-label')!;
    const as=getComputedStyle(about),line=parseFloat(as.lineHeight);
    const am=metricCanvas.measureText('ABOUT');
    const blank=(line-am.fontBoundingBoxAscent-am.fontBoundingBoxDescent)/2+am.fontBoundingBoxDescent+am.actualBoundingBoxDescent;
    button.style.setProperty('--above-history-blank',`${Math.max(0,blank)}px`);
  }
  new ResizeObserver(measureSpacing).observe(home);void document.fonts.ready.then(measureSpacing);
  input.addEventListener('input',render);window.addEventListener('history:changed',()=>void refresh());void refresh();
}
