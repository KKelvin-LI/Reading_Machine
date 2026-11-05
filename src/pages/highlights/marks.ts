import {playSound} from '../../ui/sounds';
import {eatyActions} from '../../ui/eaty-actions';
import {applyEatyImage} from '../../three/eaty-art';
import {textInk} from '../../interactions/text-ink';
import {savedHighlightArt} from '../../three/saved-highlight-art';
import {commentArrowArt} from '../../three/comment-arrow';
import {historyArt,pressCross} from '../../three/history-art';
import {selectionLines} from '../../interactions/highlight';
export type MarkRect={page:number;x:number;y:number;w:number;h:number};
export function captureMarks(stage:HTMLElement,range:Range):MarkRect[]{
 const pane=range.startContainer.parentElement?.closest('.section-reading-pane');
 const slots=(pane??stage).querySelectorAll<HTMLElement>('.pdf-slot');
 const out:MarkRect[]=[];
 for(const r of selectionLines(range))for(const slot of slots){const b=slot.getBoundingClientRect();const left=Math.max(b.left,r.left),top=Math.max(b.top,r.top),right=Math.min(b.right,r.left+r.width),bottom=Math.min(b.bottom,r.top+r.height);if(right>left&&bottom>top)out.push({page:Number(slot.dataset.page),x:(left-b.left)/b.width,y:(top-b.top)/b.height,w:(right-left)/b.width,h:(bottom-top)/b.height});}
 return out;
}
export function mountSavedMarks(stage:HTMLElement,getEntries:()=>{rects?:MarkRect[];text?:string;page?:number;endPage?:number;id?:string}[],colour='#bae4ee',onDelete?:(id:string)=>Promise<void>){
 let frame=0;const layerClass=colour==='#bae4ee'?'saved-highlight-marks':'saved-comment-marks';
 function draw(){frame=0;stage.querySelectorAll(`[data-eaty-mark="${layerClass}"]`).forEach(node=>node.remove());
  for(const entry of getEntries())if(!entry.rects?.length&&entry.text){
   const nodes:Text[]=[];
   for(const slot of stage.querySelectorAll<HTMLElement>('.pdf-slot')){const page=Number(slot.dataset.page);if(page<(entry.page??1)||page>(entry.endPage??entry.page??1))continue;for(const span of slot.querySelectorAll('.textLayer span')){const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))nodes.push(node as Text);}}
   let flat='';const positions:{node:Text;offset:number}[]=[];
   for(const node of nodes)for(let i=0;i<node.length;i++){const c=node.data[i];if(/\s/.test(c)){if(flat.endsWith(' '))continue;flat+=' ';}else flat+=c;positions.push({node,offset:i});}
   const query=entry.text.replace(/\s+/g,' ').trim(),start=flat.indexOf(query);
   if(start>=0&&query){const a=positions[start],b=positions[start+query.length-1];const range=document.createRange();range.setStart(a.node,a.offset);range.setEnd(b.node,b.offset+1);entry.rects=captureMarks(stage,range);}
  }

  for(const slot of stage.querySelectorAll<HTMLElement>('.pdf-slot')){
   let layer=slot.querySelector<HTMLElement>(`:scope > .${layerClass}`);
   if(!layer){layer=document.createElement('div');layer.className=layerClass;slot.append(layer);}
   layer.replaceChildren();
   for(const entry of getEntries()){
    const rects=entry.rects;if(!rects?.length)continue;
    const slotBox=slot.getBoundingClientRect();
    const widths=rects.map(r=>r.w*slotBox.width/(r.h*slotBox.height));
    const art=savedHighlightArt(widths,colour);
    rects.forEach((r,i)=>{if(r.page!==Number(slot.dataset.page))return;
     const mark=document.createElement('span');mark.className='persistent-foam-mark';if(entry.id)mark.dataset.annotationId=entry.id;Object.assign(mark.style,{left:`${r.x*100}%`,top:`${r.y*100}%`,width:`${r.w*100}%`,height:`${r.h*100}%`});layer!.append(mark);
     const image=document.createElement('img');image.alt='';image.className='persistent-foam-surface';image.style.left=i===0?`calc(${-25/widths[i]}% - 30px)`:`${-25/widths[i]}%`;image.style.width=i===0?`calc(${100+50/widths[i]}% + 30px)`:`${100+50/widths[i]}%`;mark.append(image);
     void art.then(images=>{if(mark.isConnected)image.src=images[i];}).catch(console.warn);
     const ink=textInk(slot,{left:slotBox.left+r.x*slotBox.width,top:slotBox.top+r.y*slotBox.height,width:r.w*slotBox.width,height:r.h*slotBox.height});mark.append(ink);
     if(i===0&&onDelete&&entry.id){const control=document.createElement('button');control.type='button';control.className='highlight-delete-tip';control.dataset.annotationEaty=entry.id;control.dataset.nativeControl='';control.setAttribute('aria-label','Eaty: double-click to delete saved highlight');const arrow=document.createElement('img');arrow.alt='';control.append(arrow);
     const pane=slot.closest<HTMLElement>('.section-reading-pane');
     if(pane){const b=pane.getBoundingClientRect();control.dataset.eatyMark=layerClass;Object.assign(control.style,{left:`${slotBox.left+r.x*slotBox.width-b.left+pane.scrollLeft-36}px`,right:'auto',top:`${slotBox.top+(r.y+r.h/2)*slotBox.height-b.top+pane.scrollTop}px`,zIndex:'6'});pane.append(control);}else mark.append(control);
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
