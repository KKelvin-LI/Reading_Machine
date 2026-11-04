import {createSquishyNavigation} from '../../three/squishy-navigation';
export function mountPacedReading(root:HTMLElement){
 const stage=root.querySelector<HTMLElement>('#page-stage')!;
 const notice=document.createElement('p');notice.className='wheel-status paced-notice';notice.setAttribute('role','status');notice.hidden=true;root.append(notice);
 const marker=document.createElement('div');marker.className='paced-marker';marker.hidden=true;marker.setAttribute('aria-hidden','true');const model=document.createElement('span'),label=document.createElement('span');model.className='paced-model';label.className='paced-word';marker.append(model,label);document.body.append(marker);
 let active=false,enabled=false,waiting=false,paused=false,colour='#f7c9de',wpm=200,word:Range|undefined,pane:HTMLElement|undefined,timer:ReturnType<typeof setTimeout>|undefined,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined,preparing:Promise<void>|undefined;
 function setPaused(value:boolean){paused=value;root.dataset.pacedPaused=String(value);document.body.classList.toggle('paced-tool-active',enabled&&active&&!paused);}
 const measure=document.createElement('canvas').getContext('2d')!;
 function wordRect(range:Range){
  const rect=range.getBoundingClientRect(),span=range.startContainer.parentElement;
  if(span?.dataset.layeredText==='true')return rect;
  if(!span?.dataset.renderedFont||range.startContainer!==range.endContainer||span.childNodes.length!==1)return rect;
  const style=getComputedStyle(span);if(style.writingMode!=='horizontal-tb')return rect;
  measure.font=`${style.fontSize} "${span.dataset.renderedFont}"`;
  const text=range.startContainer.textContent??'',total=measure.measureText(text).width;
  if(!total)return rect;
  const bounds=span.getBoundingClientRect(),scale=bounds.width/total;
  const left=bounds.left+measure.measureText(text.slice(0,range.startOffset)).width*scale;
  const right=bounds.left+measure.measureText(text.slice(0,range.endOffset)).width*scale;
  return new DOMRect(left,rect.top,right-left,rect.height);
 }
 function prompt(text:string){notice.textContent=text;notice.hidden=false;alignNotice();} function alignNotice(){const b=stage.getBoundingClientRect();notice.style.left=`${b.left+12}px`;notice.style.right=`${Math.max(0,innerWidth-b.right)+12}px`;notice.style.bottom=`${Math.max(0,innerHeight-b.bottom)+20}px`;} new ResizeObserver(alignNotice).observe(stage);
 function grab(on:boolean){waiting=on;document.body.classList.toggle('paced-tool-active',enabled&&active&&!paused);root.classList.toggle('paced-awaiting',on);document.body.classList.toggle('paced-awaiting',on);if(!on)document.body.classList.remove('paced-grabbing');}
 function stop(){clearTimeout(timer);word=undefined;marker.hidden=true;view?.show(false);}
 function reset(){active=false;enabled=false;setPaused(false);stop();grab(false);notice.hidden=true;}
 function words(){const result:Range[]=[];if(!pane)return result;for(const span of pane.querySelectorAll('.textLayer span')){if(span.getAttribute('aria-hidden')==='true'||getComputedStyle(span).visibility==='hidden')continue;const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let n:Node|null;while((n=walker.nextNode()))for(const m of (n.textContent??'').matchAll(/\S+/gu)){const r=document.createRange();r.setStart(n,m.index!);r.setEnd(n,m.index!+m[0].length);result.push(r);}}return result;}
 function visible(){return active&&!root.hidden&&!root.classList.contains('highlights-open')&&!document.hidden&&!document.body.classList.contains('catch-open');}
 function position(){if(!word||!pane||!word.startContainer.isConnected||!visible()){marker.hidden=true;return;}const r=wordRect(word),b=pane.getBoundingClientRect();if(!r.width||r.bottom<b.top||r.top>b.bottom){marker.hidden=true;return;}const span=word.startContainer.parentElement!,s=getComputedStyle(span);const page=span.closest<HTMLElement>('.pdf-layered-text');
 if(page){if(marker.parentElement!==page)page.append(marker);const bounds=page.getBoundingClientRect();marker.style.position='absolute';marker.style.zIndex='1';marker.style.mixBlendMode='normal';marker.style.left=`${r.left-bounds.left-3}px`;marker.style.top=`${r.top-bounds.top-1}px`;}else if(marker.parentElement!==document.body)document.body.append(marker);
 label.textContent='';label.style.fontSize=s.fontSize;const origin=page?.getBoundingClientRect();marker.style.position=page?'absolute':'fixed';marker.style.left=`${r.left-(origin?.left??0)-3}px`;marker.style.top=`${r.top-(origin?.top??0)-1}px`;marker.style.width=`${r.width+6}px`;marker.style.height=`${r.height+2}px`;marker.style.zIndex=page?'1':'40';marker.style.mixBlendMode=page?'normal':'multiply';marker.style.clipPath=`inset(${Math.max(0,b.top-r.top)}px ${Math.max(0,r.right-b.right)}px ${Math.max(0,r.bottom-b.bottom)}px ${Math.max(0,b.left-r.left)}px)`;marker.hidden=false;if(!preparing){preparing=createSquishyNavigation(model,label,{text:word.toString(),colour,sectionLabel:true,expandy:false}).then(v=>{view=v;v.setColour(colour);v.show(!marker.hidden);});}view?.show(true);}
 function schedule(){clearTimeout(timer);if(enabled&&active&&!paused&&word)timer=setTimeout(step,60000/wpm);}
 function step(){if(!visible()){setPaused(true);marker.hidden=true;prompt('Paced reading paused — press Space to resume.');return;}if(!word?.startContainer.isConnected){stop();grab(true);prompt('Click a word to start paced reading in this section.');return;}const list=words(),next=list.find(r=>r.compareBoundaryPoints(Range.START_TO_START,word!)>0);if(!next){stop();prompt('End of the available text. Click a word to start again.');grab(true);return;}word=next;const r=wordRect(word),b=pane!.getBoundingClientRect();if(r.bottom>b.bottom-12)pane!.scrollTop+=r.bottom-b.bottom+40;position();schedule();}
 root.addEventListener('reader:tool-toggle',event=>{const d=(event as CustomEvent).detail;if(d.tool==='Paced Reading'&&!d.selected)reset();});
 root.addEventListener('reader:active-tool-change',event=>{
  active=(event as CustomEvent).detail.tool==='Paced Reading';
  if(!active){clearTimeout(timer);setPaused(true);grab(false);marker.hidden=true;view?.show(false);notice.hidden=true;return;}
  enabled=true;
  if(word?.startContainer.isConnected){setPaused(true);grab(false);position();prompt('Paced reading paused — Space to resume.');}
  else{stop();setPaused(false);grab(true);prompt('Click a word in the text to start paced reading. Space pauses or resumes.');}
 });
 root.addEventListener('reader:tool-settings',event=>{const d=(event as CustomEvent).detail;if(d.tool!=='Paced Reading')return;colour=d.colour;wpm=Math.max(60,Math.min(500,d.wpm||200));view?.setColour(colour);schedule();});
 stage.addEventListener('pointerup',event=>{if(!enabled||!active||paused)return;const target=event.target as Element;pane=target.closest<HTMLElement>('.section-reading-pane')??undefined;if(!pane)return;word=words().find(r=>[wordRect(r)].some(b=>event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom));if(!word)return;grab(false);setPaused(false);root.classList.remove('awaiting-text-selection','is-grabbing-text');document.body.classList.remove('awaiting-text-selection','is-grabbing-text');root.dispatchEvent(new Event('reader:clear-selection'));getSelection()?.removeAllRanges();stage.focus({preventScroll:true});prompt('Paced reading — Space to pause.');position();schedule();});
 window.addEventListener('keydown',event=>{if(event.code!=='Space'||!enabled||!active||!word||root.hidden||(event.target as Element)?.closest('input,textarea,button,[contenteditable=true]'))return;event.preventDefault();setPaused(!paused);prompt(paused?'Paced reading paused — Space to resume.':'Paced reading — Space to pause.');position();schedule();});
 stage.addEventListener('scroll',position,{capture:true,passive:true});window.addEventListener('resize',position);new MutationObserver(()=>{if(!visible()){marker.hidden=true;clearTimeout(timer);setPaused(true);}else if(word)position();}).observe(root,{attributes:true,attributeFilter:['hidden','class']});
 return {reset};
}
