import {playSound} from '../../ui/sounds';
import {eatyActions} from '../../ui/eaty-actions';
import {applyEatyImage} from '../../three/eaty-art';
import {savedHighlightArt} from '../../three/saved-highlight-art';
import {selectionLines} from '../../interactions/highlight';
export type MarkRect={page:number;x:number;y:number;w:number;h:number};
export type MarkInSlot=(slot:HTMLElement,rect:MarkRect)=>boolean;
export function captureMarks(stage:HTMLElement,range:Range):MarkRect[]{
 const pane=range.startContainer.parentElement?.closest('.section-reading-pane');
 const slots=(pane??stage).querySelectorAll<HTMLElement>('.pdf-slot');
 const out:MarkRect[]=[];
 for(const r of selectionLines(range))for(const slot of slots){const b=slot.getBoundingClientRect();const left=Math.max(b.left,r.left),top=Math.max(b.top,r.top),right=Math.min(b.right,r.left+r.width),bottom=Math.min(b.bottom,r.top+r.height);if(right>left&&bottom>top)out.push({page:Number(slot.dataset.page),x:(left-b.left)/b.width,y:(top-b.top)/b.height,w:(right-left)/b.width,h:(bottom-top)/b.height});}
 return out;
}
type MarkEntry = {
 rects?: MarkRect[];
 text?: string;
 page?: number;
 endPage?: number;
 id?: string;
 geometryVersion?: number;
};

// Old marks store the rectangles measured with the reader's compressed character spacing.
// Only replace those coordinates when the saved passage can be located in its original pane.
function restoreMarkGeometry(stage: HTMLElement, entry: MarkEntry) {
 if (entry.geometryVersion === 2 || !entry.text) return;
 const first = entry.rects?.[0];
 const last = entry.rects?.at(-1);
 const startPage = entry.page ?? first?.page ?? 1;
 const endPage = entry.endPage ?? last?.page ?? startPage;
 const query = entry.text.replace(/\s+/gu, ' ').trim();
 if (!query) return;

 for (const pane of stage.querySelectorAll<HTMLElement>('.section-reading-pane')) {
  const slots = [...pane.querySelectorAll<HTMLElement>('.pdf-slot')].filter(slot =>
   Number(slot.dataset.page) >= startPage && Number(slot.dataset.page) <= endPage);
  if (slots.length !== endPage - startPage + 1 || slots.some(slot => !slot.querySelector('.textLayer'))) continue;

  let text = '';
  const positions: {node: Text; offset: number}[] = [];
  for (const slot of slots) {
   const walker = document.createTreeWalker(slot.querySelector('.textLayer')!, NodeFilter.SHOW_TEXT);
   for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!node.parentElement?.closest('[data-pdf-item]')) continue;
    for (let offset = 0; offset < node.length; offset++) {
     const c = node.data[offset];
     if (/\s/u.test(c)) {
      if (text.endsWith(' ')) continue;
      text += ' ';
     } else text += c;
     positions.push({node, offset});
    }
   }
  }
  // A common word can occur on many lines. Use the original line to disambiguate,
  // and keep the stored coordinates if two occurrences still fit.
  let matched: MarkRect[] | undefined;
  for (let start = text.indexOf(query); start >= 0; start = text.indexOf(query, start + 1)) {
   const a = positions[start], b = positions[start + query.length - 1];
   const range = document.createRange();
   range.setStart(a.node, a.offset);
   range.setEnd(b.node, b.offset + 1);
   const rects = captureMarks(stage, range);
   if (!rects.length || rects[0].page !== startPage || rects.at(-1)!.page !== endPage) continue;
   if (first && Math.abs(rects[0].y - first.y) > Math.max(first.h, rects[0].h) / 2) continue;
   if (matched) return;
   matched = rects;
   if (!first) break;
  }
  if (!matched) continue;
  entry.rects = matched;
  entry.geometryVersion = 2;
  return;
 }
}

export function mountSavedMarks(stage:HTMLElement,getEntries:()=>MarkEntry[],colour='#bae4ee',onDelete?:(id:string)=>Promise<void>,markInSlot:MarkInSlot=()=>true){
 let frame=0;const layerClass=colour==='#bae4ee'?'saved-highlight-marks':'saved-comment-marks';
 function draw(){frame=0;stage.querySelectorAll(`[data-eaty-mark="${layerClass}"]`).forEach(node=>node.remove());
  for(const entry of getEntries())restoreMarkGeometry(stage,entry);

  for(const slot of stage.querySelectorAll<HTMLElement>('.pdf-slot')){
   let layer=slot.querySelector<HTMLElement>(`:scope > .${layerClass}`);
   if(!layer){layer=document.createElement('div');layer.className=layerClass;slot.append(layer);}
   layer.replaceChildren();
   const slotBox=slot.getBoundingClientRect();
   if(!slotBox.width||!slotBox.height)continue;
   const pageNumber=Number(slot.dataset.page);
   for(const entry of getEntries()){
    const rects=entry.rects;if(!rects?.some(r=>r.page===pageNumber))continue;
    const widths=rects.map(r=>r.w*slotBox.width/(r.h*slotBox.height));
    const art=savedHighlightArt(widths,colour);
    rects.forEach((r,i)=>{if(r.page!==pageNumber||!markInSlot(slot,r))return;
     const mark=document.createElement('span');mark.className='persistent-foam-mark';if(entry.id)mark.dataset.annotationId=entry.id;Object.assign(mark.style,{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.w*100}%`,height:`${r.h*100}%`});layer!.append(mark);
     const image=document.createElement('img');image.alt='';image.className='persistent-foam-surface';image.style.left=i===0?`calc(${-25/widths[i]}% - 1.875rem)`:`${-25/widths[i]}%`;image.style.width=i===0?`calc(${100+50/widths[i]}% + 1.875rem)`:`${100+50/widths[i]}%`;mark.append(image);
     void art.then(images=>{if(mark.isConnected)image.src=images[i];}).catch(console.warn);
     if(i===0&&onDelete&&entry.id){const control=document.createElement('button');control.type='button';control.className='highlight-delete-tip';control.dataset.annotationEaty=entry.id;control.dataset.nativeControl='';control.setAttribute('aria-label','Eaty: double-click to delete saved highlight');const arrow=document.createElement('img');arrow.alt='';control.append(arrow);
     const pane=slot.closest<HTMLElement>('.section-reading-pane');
     if(pane){const b=pane.getBoundingClientRect();control.dataset.eatyMark=layerClass;Object.assign(control.style,{left:`calc(${slotBox.left+r.x*slotBox.width-b.left+pane.scrollLeft}px - 2.25rem)`,right:'auto',top:`${slotBox.top+(r.y+r.h/2)*slotBox.height-b.top+pane.scrollTop}px`,zIndex:'6'});pane.append(control);}else mark.append(control);
     applyEatyImage(arrow);eatyActions(control,()=>onDelete(entry.id!));}

    });
   }
  }
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
 new MutationObserver(records=>{if(records.some(r=>![...r.addedNodes,...r.removedNodes].every(n=>n instanceof Element&&n.hasAttribute('data-eaty-mark'))&&!(r.target as Element).closest?.('.saved-highlight-marks,.saved-comment-marks,[data-eaty-mark]')))schedule();}).observe(stage,{childList:true,subtree:true});
 new ResizeObserver(schedule).observe(stage);
 return schedule;
}

/** Withdraw the saved colour strip, leaving the document's text in place. */
export async function retractSavedMarks(stage:HTMLElement,id:string){
 const surfaces=Array.from(stage.querySelectorAll<HTMLElement>('.persistent-foam-mark'))
  .filter(mark=>mark.dataset.annotationId===id)
  .map(mark=>mark.querySelector<HTMLElement>('.persistent-foam-surface')!).filter(Boolean);
 const widths=surfaces.map(surface=>surface.getBoundingClientRect().width);
 const total=widths.reduce((a,b)=>a+b,0),duration=Math.max(180,total/Math.max(1,innerWidth*20)*1000);
 playSound('retract',duration/1000);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 let delay=0;const animations:Animation[]=[];
 for(let i=surfaces.length-1;i>=0;i--){
  const ms=duration*widths[i]/Math.max(1,total);
  animations.push(surfaces[i].animate([{transform:'scaleX(1)',transformOrigin:'left center'},{transform:'scaleX(0)',transformOrigin:'left center'}],{duration:ms,delay,easing:'ease-in',fill:'forwards'}));
  delay+=ms;
 }
 await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
}
