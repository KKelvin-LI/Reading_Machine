import {playSound} from '../../ui/sounds';
import {CompletionGate} from './completion-gate';
import {mountConnections} from '../connections/controller';
import {mountChecker} from '../checker/controller';
import {paneLayout} from './pane-layout';
import {mountSketchPad} from './sketch-pad';
import {mountPacedReading} from './paced-reading';
import {mountToolSettings} from './tool-settings';
import {mountSidebarToggle} from './sidebar-toggle';
import {renderProgressLock,animateChapterLock,renderProgressReplay} from '../../three/progress-lock';
import {sectionProgressPlan} from './section-progress';
import {sectionSettings} from '../../config/sections';
import {mountSectionNavigation} from '../sections/navigation';
import {sectionRange,pageCrop} from '../sections/ranges';
import {prototypeSections} from '../sections/prototype';
import {sectionAt,type ReadingSection} from '../sections/detection';
import {mountComments} from '../comments/controller';
import {mountSelectionMenu} from '../selection-menu/controller';
import {mountHighlights} from '../highlights/controller';
import {mountToolsButton} from './tools-button';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import {renderPage} from '../../lib/pdf';
import {readerSettings as cfg} from '../../config/reader';
import {saveReadingState} from '../history/store';
import '../../styles/pages/reader.css';

type Slot={element:HTMLDivElement;frame:HTMLDivElement;scale:number;page:number;height:number;cropStart:number;pane:HTMLElement;section:number};
export function mountReader(root:HTMLElement){
  const stage=root.querySelector<HTMLElement>('#page-stage')!;
  const mount=root.querySelector<HTMLElement>('#page-mount')!;
  const progress=root.querySelector<HTMLElement>('#reading-progress')!;
  const toolList=root.querySelector<HTMLElement>('#reading-tool-list')!;
  const tools=root.querySelector<HTMLElement>('.reading-tools')!;
  const status=root.querySelector<HTMLElement>('#reader-unlock-status')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let pdf:PDFDocumentProxy|null=null, id:string|undefined, slots:Slot[]=[], generation=0;
  let highWater=0,currentPage=1,ready=false,disposed=true;
  let saveTimer:ReturnType<typeof setTimeout>|undefined, resizeTimer:ReturnType<typeof setTimeout>|undefined;
  let renderJob:Promise<void>=Promise.resolve(), rendering=false,rerun=false;
  let abort=new AbortController();
  let sections:ReadingSection[]=[{index:1,title:'Full document',page:1,position:0,source:'fallback'}],sectionVersion=0;
  let sectionsReady:Promise<void>=Promise.resolve();
  let activeSection=0, openSections=[0],unlockedSection=0;
  const rotatedPanes=new Set<number>();
  let rotating=false;
  const pendingReveals=new Set<number>();
  const completedSections=new Set<number>();
  const sectionFractions=new Map<number,number>();
  let progressPlan=sectionProgressPlan(sections,1);
  const sectionStateKey=()=>`reading-machine-sequential-v1:${id??pdf?.fingerprints[0]??'document'}`;
  let historyDeleted=false;
  window.addEventListener('history:deleted',event=>{if((event as CustomEvent<string>).detail===id){historyDeleted=true;clearTimeout(saveTimer);}});
  function saveSectionState(){if(historyDeleted)return;try{localStorage.setItem(sectionStateKey(),JSON.stringify({current:activeSection,unlocked:unlockedSection,completed:[...completedSections],fractions:[...sectionFractions]}));}catch(error){console.warn('Could not save section progress',error);}}
  function completeSection(index:number){if(index<=unlockedSection){const fresh=!completedSections.has(index);completedSections.add(index);sectionFractions.set(index,1);update();
      if(fresh&&progressPlan.checkpoints.slice(0,cfg.tools.length-1).includes(index))playSound('bubble');
      if(fresh&&!reduced.matches){const bar=progress.querySelector<HTMLElement>(`.reading-track[data-section="${index}"]`);if(bar){const ls=parseFloat(getComputedStyle(root).getPropertyValue('--reader-ls'))||.55;const grow=ls*parseFloat(getComputedStyle(root).fontSize)*.5;const r=bar.getBoundingClientRect();bar.animate([{transform:'scale(1)'},{transform:`scale(${1+grow*2/Math.max(1,r.width)},${1+grow*2/Math.max(1,r.height)})`,offset:.45},{transform:'scale(.98,.96)',offset:.75},{transform:'scale(1)'}],{duration:600,easing:'cubic-bezier(.22,.7,.2,1)'});}}saveSectionState();}}

  const sectionNavigation=mountSectionNavigation(root,async (index,replace,selection)=>{
    if(index<0||index>=sections.length||index>unlockedSection||disposed)return;
    if(selection){
      selectionMenu.reset();openSections=selection;
      sectionNavigation.set(sections,activeSection,openSections,unlockedSection);
      await layout(sections[index].page,index);return;
    }
    if(index===activeSection)return;
    selectionMenu.reset();
    if(replace!==undefined&&replace!==index)openSections=openSections.filter(i=>i!==replace);
    if(replace!==undefined&&openSections.includes(index)){sectionNavigation.set(sections,activeSection,openSections,unlockedSection);await layout(sections[index].page);return;}
    if(openSections.includes(index)){if(openSections.length===1)return;openSections=openSections.filter(i=>i!==index);}
    else openSections=[...openSections,index].sort((a,b)=>a-b);
    sectionNavigation.set(sections,activeSection,openSections,unlockedSection);await layout(sections[index].page,index);
  });
  function indexSections(document:PDFDocumentProxy){rotatedPanes.clear();const token=++sectionVersion;
    sectionsReady=prototypeSections(document,()=>token!==sectionVersion||disposed).then(found=>{
      if(token!==sectionVersion)return;sections=found;activeSection=unlockedSection=0;completedSections.clear();sectionFractions.clear();
      try{const saved=JSON.parse(localStorage.getItem(sectionStateKey())??'null');if(saved){unlockedSection=Math.min(sections.length-1,Math.max(0,Number(saved.unlocked)||0));activeSection=unlockedSection;for(const [n,f] of saved.fractions??[])if(Number.isInteger(n)&&n>=0&&n<sections.length&&Number.isFinite(f))sectionFractions.set(n,Math.max(0,Math.min(1,f)));for(const n of saved.completed??[])if(Number.isInteger(n)&&n>=0&&n<=unlockedSection)completedSections.add(n);}}catch{ /* Start at section one if saved progress is invalid. */ }
      toolList.replaceChildren();buildProgress();update();
      currentPage=sections[activeSection].page;openSections=[activeSection];sectionNavigation.set(sections,activeSection,openSections,unlockedSection);
      highlights.refreshSections((page,position)=>sectionAt(sections,page,position));
    }).catch(error=>{if(token!==sectionVersion)return;console.warn(error);sections=[{index:1,title:'Full document',page:1,position:0,source:'fallback'}];activeSection=0;openSections=[0];buildProgress();update();sectionNavigation.set(sections,0);});
  }
  const selected=new Set<number>();
  const toolSettings=mountToolSettings(root);
  const pacedReading=mountPacedReading(root);
  const checker=mountChecker(root);
  const connections=mountConnections(root,()=>({count:sections.length,unlocked:unlockedSection,pdf,sections}),async index=>{
    if(index>unlockedSection||disposed)return;
    if(!openSections.includes(index)){openSections=[index];sectionNavigation.set(sections,activeSection,openSections,unlockedSection);await layout(sections[index].page);}
    queue();await renderJob;
  });
  const sketchPad=mountSketchPad(root);
  const toolsButton=mountToolsButton(root);
  const highlights=mountHighlights(root,async(page,position)=>{
    await sectionsReady;
    const index=Math.max(0,sections.indexOf(sectionAt(sections,page,position)));
    if(index>unlockedSection)return;
    if(!openSections.includes(index)){openSections=[...new Set([index,activeSection])].sort((a,b)=>a-b);sectionNavigation.set(sections,activeSection,openSections,unlockedSection);await layout(page);}
    const slot=slots.find(s=>s.page===page&&s.section===index);if(!slot)return;
    slot.pane.scrollTop=slot.frame.offsetTop+(position-slot.cropStart)*slot.height;
    queue();await renderJob;
  },async(page,position)=>{await sectionsReady;
    const node=window.getSelection()?.anchorNode;
    const pane=(node instanceof Element?node:node?.parentElement)?.closest<HTMLElement>('.section-reading-pane');
    return pane?sections[Number(pane.dataset.section)]:sectionAt(sections,page,position);
  });
  const comments=mountComments(root);
  const selectionMenu=mountSelectionMenu(root,range=>highlights.save(range),range=>comments.save(range));
  // Identical silhouette to the section locks; shading appears only when earned.
  const lock=(key:number)=>`<svg viewBox="0 0 32 40" aria-hidden="true"><defs><linearGradient id="progress-lock-${key}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="white" stop-opacity=".8"/><stop offset=".35" stop-color="currentColor"/><stop offset=".7" stop-color="currentColor"/><stop offset="1" stop-color="#151410" stop-opacity=".65"/></linearGradient></defs><g class="checkpoint-lock-shape"><path d="M8 17V11a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" stroke-width="3.5"/><rect x="3" y="16" width="26" height="23" rx="5" fill="currentColor"/></g><g class="checkpoint-lock-inflation" fill="url(#progress-lock-${key})"><path d="M8 17V11a8 8 0 0 1 16 0v6" fill="none" stroke="url(#progress-lock-${key})" stroke-width="3.5"/><rect x="3" y="16" width="26" height="23" rx="5"/></g><circle cx="16" cy="25" r="3" fill="currentColor" style="filter:brightness(.65)"/><path d="M16 26v6" stroke="currentColor" style="filter:brightness(.65)" stroke-width="3"/></svg>`;
  function buildProgress(){
    progressPlan=sectionProgressPlan(sections,pdf?.numPages??1);
    progress.replaceChildren();
    sections.forEach((section,i)=>{
      const band=progressPlan.checkpoints.filter(end=>end<i).length;
      const track=document.createElement('span');track.className='reading-track';
      track.dataset.section=String(i);track.style.flex=`${progressPlan.weights[i]} 1 0%`;
      track.style.setProperty('--quarter-colour',cfg.colours[band]);
      track.title=`Section ${section.index}: ${section.title} — ${(progressPlan.weights[i]/progressPlan.total*100).toFixed(1)}% of document`;
      track.innerHTML='<i class="reading-fill"></i>';progress.append(track);
      progressPlan.checkpoints.forEach((end,k)=>{if(end!==i)return;
        const marker=document.createElement('span');marker.className='reading-lock';marker.dataset.checkpoint=String(k);
        marker.style.setProperty('--checkpoint-colour',cfg.colours[k+1]);
        marker.style.setProperty('--checkpoint-base',cfg.colours[k]);
        marker.title=`${cfg.tools[k+1]} — finish Section ${section.index} (${progressPlan.ends[i].toFixed(1)}%)`;
        marker.innerHTML=lock(k);progress.append(marker);
      });
    });
  }
  const replay=root.querySelector<HTMLButtonElement>('#reading-replay')!;
  let replayUnlocked:boolean|undefined;
  let pendingCompletionUnlock=false;
  function updateReplay(){
    const unlocked=highWater>=100-1e-8;
    replay.disabled=!unlocked;
    replay.title=unlocked?'Replay finishing animation':'Finish 100% to unlock replay';
    if(unlocked===replayUnlocked)return;
    if(ready&&replayUnlocked===false&&unlocked)pendingCompletionUnlock=true;
    replayUnlocked=unlocked;
    const band=progressPlan.checkpoints.length;
    renderProgressReplay(replay,unlocked,cfg.colours[band%cfg.colours.length],cfg.colours[(band+1)%cfg.colours.length]);
  }
  updateReplay();
  replay.addEventListener('click',event=>{
    event.stopPropagation();
    if(!ready||disposed||root.inert||highWater<100-1e-8)return;
    document.dispatchEvent(new CustomEvent('reader:replay-completion',{detail:{reader:root}}));
  });
  const completionGate=new CompletionGate({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
  function checkCompletion(){
    completionGate.check(id??pdf?.fingerprints[0],highWater>=100-1e-8,ready&&!disposed&&!root.inert&&!root.hidden,finished=>{
      const detail={reader:root,accepted:false,finished:(success:boolean)=>{if(success)pendingCompletionUnlock=false;finished(success);}};
      flush();document.dispatchEvent(new CustomEvent('reader:first-completion',{detail}));
      return detail.accepted;
    },pendingCompletionUnlock);
  }
  new MutationObserver(()=>queueMicrotask(checkCompletion)).observe(root,{attributes:true,attributeFilter:['hidden','inert']});
  document.addEventListener('reader:page-rendered',checkCompletion);
  document.addEventListener('catch:visibility',checkCompletion);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkCompletion();});
  function update(){
    highWater=progressPlan.weights.reduce((sum,w,i)=>sum+w*(completedSections.has(i)?1:sectionFractions.get(i)??0),0)/progressPlan.total*100;
    updateReplay();
    progress.setAttribute('aria-valuenow',String(highWater));
    root.querySelector('#reading-percent')!.textContent=`${Math.floor(highWater)}%`;
    progress.querySelectorAll<HTMLElement>('.reading-track').forEach((track,i)=>track.style.setProperty('--fill',`${(completedSections.has(i)?1:sectionFractions.get(i)??0)*100}%`));
    progress.querySelectorAll<HTMLElement>('.reading-lock').forEach(marker=>{const earned=completedSections.has(progressPlan.checkpoints[Number(marker.dataset.checkpoint)]);if(earned&&!marker.classList.contains('unlocked')){marker.classList.add('unlocked');renderProgressLock(marker,ready);} });
    cfg.tools.forEach((_,i)=>{
      if(i<cfg.tools.length&&(i===0||completedSections.has(progressPlan.checkpoints[i-1]))&&!toolList.querySelector(`[data-tool="${i}"]`)){
        const label=document.createElement('label');label.className='reading-tool';label.dataset.tool=String(i);
        const box=document.createElement('input');box.type='checkbox';box.checked=selected.has(i);
        box.addEventListener('change',()=>{box.checked?selected.add(i):selected.delete(i);root.dispatchEvent(new CustomEvent('reader:tool-toggle',{bubbles:true,detail:{tool:cfg.tools[i],selected:box.checked}}));});
        const text=document.createElement('span');text.className='reading-tool-text';text.textContent=cfg.tools[i];label.append(box,text);toolList.append(label);
        status.textContent=`${cfg.tools[i]} unlocked`;
      }
    });
    tools.classList.toggle('has-tools',toolList.childElementCount>0);
    queueMicrotask(checkCompletion);
  }

  function flush(){
    clearTimeout(saveTimer);
    if(id&&ready)void saveReadingState(id,currentPage,highWater).catch(console.warn);
  }
  function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(flush,cfg.saveDelayMs);}
  const progressPages=()=>sections.at(-1)?.endPage??pdf?.numPages??1;
  function track(event:Event){
    const pane=event.target as HTMLElement;if(!pane.classList.contains("section-reading-pane"))return;
    if(!ready||disposed)return;
    const max=pane.scrollHeight-pane.clientHeight;
    // A fresh document starts at 0. Scrolling back never removes earned tools.
    const range=sectionRange(sections,Number(pane.dataset.section),pdf?.numPages??1);
    const start=range.startPage-1+range.startPosition,end=range.endPage-1+range.endPosition;
    const fraction=max>1?Math.min(1,pane.scrollTop/max):0;
    if(max>1&&pane.scrollTop>=max-2)completeSection(Number(pane.dataset.section));
    const section=Number(pane.dataset.section);
    sectionFractions.set(section,Math.max(sectionFractions.get(section)??0,fraction));update();saveSectionState();
    const top=pane.scrollTop;
    currentPage=slots.find(s=>s.pane===pane&&s.frame.offsetTop+s.frame.offsetHeight>top+1)?.page??sections[activeSection].page;
    saveSoon();queue();
  }
  function release(slot:Slot){
    slot.element.querySelectorAll('canvas').forEach(canvas=>{canvas.width=canvas.height=0;});
    slot.element.replaceChildren();slot.element.removeAttribute('data-rendered');
  }
  // Only nearby pages own canvas/text layers. Rendering is serial and cancellable.
  function queue(){
    if(disposed||!ready)return;
    if(rendering){rerun=true;return;}
    const token=generation;rendering=true;
    renderJob=(async()=>{
      do{
        rerun=false;
        
        for(const slot of slots){
          if(disposed||token!==generation)return;
          const top=slot.pane.scrollTop,height=slot.pane.clientHeight;const a=slot.frame.offsetTop,b=a+slot.frame.offsetHeight;
          if(b<top-height||a>top+height*2){if(slot.element.childElementCount)release(slot);continue;}
          if(slot.element.dataset.rendered==='true')continue;
          slot.element.setAttribute('aria-busy','true');
          try{
            const page=await renderPage(pdf!,slot.page,slot.scale,0,abort.signal);
            if(disposed||token!==generation){page.querySelectorAll('canvas').forEach(c=>{c.width=c.height=0;});return;}
            slot.element.replaceChildren(page);slot.element.dataset.rendered='true';
            // Hidden neighbouring columns must not enter native text selection either.
            const regions=sections[slot.section].regions?.[slot.page];
            if(regions){const box=slot.element.getBoundingClientRect();
              for(const span of slot.element.querySelectorAll<HTMLElement>('.textLayer span')){
                const rect=span.getBoundingClientRect();if(!rect.width||!rect.height)continue;
                const x=(rect.left+rect.width/2-box.left)/box.width,y=(rect.top+rect.height/2-box.top)/box.height;
                if(!regions.some(r=>x>=r.left&&x<=r.right&&y>=r.start&&y<=r.end)){span.style.visibility='hidden';span.style.userSelect='none';span.setAttribute('aria-hidden','true');}
              }
            }
          }catch(error){
            if(disposed||token!==generation)return;
            console.warn(error);const retry=document.createElement('button');retry.className='pdf-retry';retry.dataset.nativeControl='';retry.textContent=`Retry page ${slot.page}`;retry.title=error instanceof Error?error.message:String(error);
            retry.onclick=()=>{slot.element.replaceChildren();queue();};slot.element.replaceChildren(retry);
          }finally{slot.element.setAttribute('aria-busy','false');}
        }
      }while(rerun&&token===generation&&!disposed);
    })().finally(()=>{rendering=false;if(rerun&&!disposed)queue();});
  }
  async function layout(page:number,added?:number){
    const rotationMs=650;let layoutSoundPlayed=false;
    const previous=new Map(Array.from(mount.querySelectorAll<HTMLElement>('.section-reading-pane')).map(el=>[Number(el.dataset.section),{rect:el.getBoundingClientRect(),fraction:el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)}]));
    const token=++generation;ready=false;abort.abort();await renderJob;abort=new AbortController();
    if(disposed||token!==generation||!pdf)return;
    sectionNavigation.clearFooters();slots.forEach(release);slots=[];mount.replaceChildren();
    const arrangement=paneLayout(openSections,rotatedPanes);
    mount.style.gridTemplateColumns=`repeat(${arrangement.columns},minmax(0,1fr))`;
    mount.style.gridTemplateRows=`repeat(${arrangement.rows},minmax(0,1fr))`;
    for(const section of openSections){
    const pane=document.createElement('div');pane.className='section-reading-pane';pane.dataset.section=String(section);pane.tabIndex=0;pane.setAttribute('aria-label',`Section ${sections[section].index}: ${sections[section].title}`);pane.style.setProperty('--active-section-colour',sectionSettings.colours[section%sectionSettings.colours.length]);pane.style.gridArea=arrangement.areas[openSections.indexOf(section)];mount.append(pane);
    const rotateDock=document.createElement('div');rotateDock.className='pane-rotate-dock';
    const rotate=document.createElement('button');rotate.type='button';rotate.className='pane-rotate';rotate.dataset.nativeControl='';rotate.setAttribute('aria-label','Rotate reading layout');rotate.setAttribute('aria-pressed',String(rotatedPanes.has(section)));
    rotate.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9a7.5 7.5 0 0 0-12-3M5 15a7.5 7.5 0 0 0 12 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 1v7H1zM17 23v-7h6z" fill="currentColor"/></svg>';
    rotate.onclick=async event=>{event.stopPropagation();if(rotating)return;playSound('pen');rotating=true;selectionMenu.reset();if(openSections.length===2){const was=openSections.some(i=>rotatedPanes.has(i));openSections.forEach(i=>was?rotatedPanes.delete(i):rotatedPanes.add(i));}else if(rotatedPanes.has(section))rotatedPanes.delete(section);else rotatedPanes.add(section);try{await layout(currentPage,section);}finally{rotating=false;}};
    rotateDock.append(rotate);if(openSections.length>1)pane.append(rotateDock);
    if(pendingReveals.has(section)){
      pane.classList.add('chapter-revealing');
      const cover=document.createElement('div');cover.className='chapter-unlock-cover';cover.setAttribute('role','status');cover.setAttribute('aria-label','Unlocking chapter');
      cover.innerHTML='<svg viewBox="0 0 32 40" aria-hidden="true"><path class="chapter-shackle" d="M8 17V11a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><rect x="3" y="16" width="26" height="23" rx="5" fill="currentColor"/><circle cx="16" cy="25" r="3" fill="white"/><path d="M16 26v6" stroke="white" stroke-width="3"/></svg>';
      pane.append(cover);
    }
    const width=pane.clientWidth-parseFloat(getComputedStyle(pane).paddingLeft)*2;
    const range=sectionRange(sections,section,pdf.numPages);
    for(let n=range.startPage;n<=Math.min(pdf.numPages,range.endPage);n++){
      const regions=sections[section].regions?.[n];
      const crop=regions?{start:Math.min(...regions.map(r=>r.start)),end:Math.max(...regions.map(r=>r.end))}:pageCrop(range,n);if(!crop)continue;
      const item=await pdf.getPage(n);
      if(disposed||token!==generation)return;
      const natural=item.getViewport({scale:1});const scale=width/natural.width;
      const element=document.createElement('div');element.className='pdf-slot';element.dataset.page=String(n);element.style.height=`${natural.height*scale}px`;element.setAttribute('aria-label',`Page ${n}`);
      if(regions){
        const left=regions.find(r=>r.left===0),right=regions.find(r=>r.left===.5);
        const points=left&&right?[[0,left.start],[.5,left.start],[.5,right.start],[1,right.start],[1,right.end],[.5,right.end],[.5,left.end],[0,left.end]]:
          (()=>{const r=regions[0];return [[r.left,r.start],[r.right,r.start],[r.right,r.end],[r.left,r.end]];})();
        element.style.clipPath=`polygon(${points.map(([x,y])=>`${x*100}% ${y*100}%`).join(',')})`;
      }
      const height=natural.height*scale,frame=document.createElement('div');frame.className='section-page-window';frame.style.height=`${height*(crop.end-crop.start)}px`;element.style.top=`${-height*crop.start}px`;frame.append(element);
      slots.push({element,frame,scale,page:n,height,cropStart:crop.start,pane,section});pane.append(frame);
    }
    if(section<sections.length-1)sectionNavigation.footer(pane,section+1,async next=>{if(!completedSections.has(section)&&pane.scrollTop+pane.clientHeight<pane.scrollHeight-2)return;completeSection(section);if(next>unlockedSection){if(section!==unlockedSection)return;unlockedSection=next;pendingReveals.add(next);}selectionMenu.reset();activeSection=unlockedSection;openSections=[...new Set([next,activeSection])].sort((a,b)=>a-b);saveSectionState();sectionNavigation.set(sections,activeSection,openSections,unlockedSection);await layout(sections[next].page);});
    const old=previous.get(section);pane.scrollTop=old?old.fraction*Math.max(0,pane.scrollHeight-pane.clientHeight):slots.find(s=>s.pane===pane&&s.page===page)?.frame.offsetTop??0;
    if(added!==undefined&&!reduced.matches){if(!layoutSoundPlayed){
      layoutSoundPlayed=true;
      // Rotated panes are horizontal; the default arrangement is vertical.
      if(rotating)playSound(rotatedPanes.has(added)?'windowUp':'windowDown',rotationMs/1000);
      else if(previous.size>0&&openSections.length!==previous.size)playSound(openSections.length>previous.size?'windowUp':'windowDown',sectionSettings.transitionMs/1000);
    }const b=pane.getBoundingClientRect();const x=old?old.rect.left-b.left:(added<activeSection?-b.width:b.width);pane.style.transformOrigin='top left';pane.animate([{transform:`translate(${x}px,${old?old.rect.top-b.top:0}px) scale(${old?old.rect.width/b.width:1},${old?old.rect.height/b.height:1})`,opacity:old?1:0},{transform:'none',opacity:1}],{duration:rotating?rotationMs:sectionSettings.transitionMs,easing:'cubic-bezier(.22,.7,.2,1)'});if(rotating)pane.querySelector('svg')?.animate([{transform:`rotate(${rotatedPanes.has(section)?-90:90}deg)`},{transform:'rotate(0deg)'}],{duration:rotationMs,easing:'ease-out'});}
    }
    ready=true;queue();await renderJob;queueMicrotask(checkCompletion);
    if(disposed||token!==generation)return;
    for(const pane of mount.querySelectorAll<HTMLElement>('.chapter-revealing')){
      const cover=pane.querySelector<HTMLElement>('.chapter-unlock-cover')!;
      const section=Number(pane.dataset.section);pendingReveals.delete(section);
      void (async()=>{
        if(!reduced.matches){
          await animateChapterLock(cover,sectionSettings.colours[section%sectionSettings.colours.length]);
          await cover.animate([{opacity:1},{opacity:0}],{duration:450,fill:'forwards',easing:'ease-out'}).finished;
        }
        cover.remove();pane.classList.remove('chapter-revealing');
      })();
    }
  }
  mountSidebarToggle(root,async()=>{if(!disposed&&pdf)await layout(currentPage);});
  stage.addEventListener('scroll',track,{passive:true,capture:true});
  stage.addEventListener('wheel',event=>{const pane=(event.target as Element).closest<HTMLElement>('.section-reading-pane');if(ready&&!disposed&&pane&&event.deltaY>0&&pane.scrollHeight<=pane.clientHeight+1){const range=sectionRange(sections,Number(pane.dataset.section),pdf?.numPages??1);completeSection(Number(pane.dataset.section));saveSoon();}},{passive:true});
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed)void layout(currentPage);},180);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
  window.addEventListener('pagehide',flush);
  update();
  return {
    snapshot(){return {
      panes:[...mount.querySelectorAll<HTMLElement>('.section-reading-pane')].map(pane=>({section:Number(pane.dataset.section),fraction:pane.scrollTop/Math.max(1,pane.scrollHeight-pane.clientHeight)})),
      rotated:[...rotatedPanes],
    };},
    async restore(snapshot:{panes:{section:number;fraction:number}[];rotated:number[]}){
      const panes=snapshot.panes.filter(p=>Number.isInteger(p.section)&&p.section>=0&&p.section<=unlockedSection&&Number.isFinite(p.fraction));
      if(!panes.length)return;
      openSections=[...new Set(panes.map(p=>p.section))];rotatedPanes.clear();
      for(const section of snapshot.rotated??[])if(openSections.includes(section))rotatedPanes.add(section);
      sectionNavigation.set(sections,activeSection,openSections,unlockedSection);
      await layout(currentPage);
      for(const pane of mount.querySelectorAll<HTMLElement>('.section-reading-pane')){
        const saved=panes.find(p=>p.section===Number(pane.dataset.section));
        if(saved)pane.scrollTop=Math.max(0,Math.min(1,saved.fraction))*Math.max(0,pane.scrollHeight-pane.clientHeight);
      }
      queue();
    },
    async show(document:PDFDocumentProxy,historyId?:string,page=1,percent=0,animate=true){
      connections.reset();checker.setDocument(document.fingerprints[0]??'');
      sketchPad.setDocument(historyId??document.fingerprints[0]??'temporary-document');
      flush();ready=false;pendingCompletionUnlock=false;replayUnlocked=undefined;selectionMenu.reset();toolsButton.reset();disposed=false;historyDeleted=false;pdf=document;id=historyId;currentPage=page;highWater=percent;selected.clear();toolSettings.reset();pacedReading.reset();toolList.replaceChildren();update();
      await highlights.setDocument(historyId,document.numPages);
      await comments.setDocument(historyId);
      root.hidden=false;
      const window=root.querySelector<HTMLElement>('.reading-window')!;
      window.getAnimations().forEach(a=>a.cancel());
      if(animate)window.animate([{transform:'translateY(110%)'},{transform:'translateY(0)'}],{duration:reduced.matches?0:cfg.slideSeconds*1000,easing:'cubic-bezier(.22,.7,.2,1)'});
      indexSections(document);
      await sectionsReady;
      if(disposed||pdf!==document)return;
      await layout(currentPage);
    },
    async close(){connections.reset();checker.reset();pacedReading.reset();sectionVersion++;sectionNavigation.reset();comments.reset();flush();selectionMenu.reset();highlights.reset();toolsButton.reset();disposed=true;ready=false;++generation;abort.abort();await renderJob;slots.forEach(release);slots=[];mount.replaceChildren();pdf=null;},
  };
}
