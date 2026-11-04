/** Page-relative strokes survive scrolling, rerenders and reopening this history item. */
type Stroke={erase?:boolean;colour:string;opacity:number;width:number;points:[number,number][]};
export function mountSketchPad(root:HTMLElement){
 const stage=root.querySelector<HTMLElement>('#page-stage')!,ns='http://www.w3.org/2000/svg';
 let key='',data:Record<string,Stroke[]>={},colour='#151410',opacity=1,thickness=1,erase=false;let maskNumber=0;
 let drawing:{page:HTMLElement;stroke:Stroke;path:SVGPathElement;id:number}|undefined;
 function save(){if(key)try{localStorage.setItem(key,JSON.stringify(data));}catch{console.warn('Sketch could not be saved locally.');}}
 function path(stroke:Stroke){const p=document.createElementNS(ns,'path');p.setAttribute('d',stroke.points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke',stroke.colour);p.setAttribute('stroke-opacity',String(stroke.opacity));p.setAttribute('stroke-width',String(stroke.width));p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');return p;}
 function pageId(page:HTMLElement){return `section:${page.dataset.section??'0'}`;}
 function appendStroke(svg:SVGSVGElement,stroke:Stroke){
  const p=path(stroke);if(!stroke.erase){svg.append(p);return p;}
  const id=`sketch-erase-${++maskNumber}`,mask=document.createElementNS(ns,'mask');mask.id=id;mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width','1000');mask.setAttribute('height','100000');mask.style.maskType='luminance';
  const white=document.createElementNS(ns,'rect');white.setAttribute('width','1000');white.setAttribute('height','100000');white.setAttribute('fill','white');mask.append(white);p.setAttribute('stroke','black');mask.append(p);
  let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.prepend(defs);}defs.append(mask);
  const group=document.createElementNS(ns,'g');for(const child of [...svg.children])if(child!==defs)group.append(child);group.setAttribute('mask',`url(#${id})`);svg.append(group);return p;
 }
 function layer(page:HTMLElement){let svg=page.querySelector<SVGSVGElement>('.sketch-overlay');if(!svg){svg=document.createElementNS(ns,'svg');svg.classList.add('sketch-overlay');svg.setAttribute('viewBox',`0 0 1000 ${1000*Math.max(page.clientHeight,page.scrollHeight)/page.clientWidth}`);svg.setAttribute('aria-hidden','true');svg.style.height=`${Math.max(page.clientHeight,page.scrollHeight)}px`;svg.style.width=`${page.clientWidth}px`;for(const stroke of data[pageId(page)]??[])appendStroke(svg,stroke);page.append(svg);}return svg;}
 function refresh(){stage.querySelectorAll<HTMLElement>('.section-reading-pane').forEach(layer);}
 function point(page:HTMLElement,e:PointerEvent):[number,number]{const r=page.getBoundingClientRect();return [(e.clientX-r.left+page.scrollLeft)/page.clientWidth*1000,(e.clientY-r.top+page.scrollTop)/page.clientWidth*1000];}
 function finish(){if(!drawing)return;const id=drawing.id;drawing=undefined;if(stage.hasPointerCapture(id))stage.releasePointerCapture(id);save();stage.querySelectorAll('.sketch-overlay').forEach(s=>s.remove());refresh();}
 stage.addEventListener('pointerdown',e=>{if(root.dataset.activeTool!=='Sketch Pad'||e.button!==0)return;const page=(e.target as Element).closest<HTMLElement>('.section-reading-pane');if(!page||!key||(e.target as Element).closest('button,input,textarea,[data-comment-ui],.chapter-unlock-cover'))return;e.preventDefault();e.stopImmediatePropagation();getSelection()?.removeAllRanges();root.dispatchEvent(new Event('reader:clear-selection'));const probe=document.createElement('span');probe.style.height='var(--reader-ls)';root.append(probe);probe.style.display='block';const ls=probe.getBoundingClientRect().height||8;probe.remove();const stroke:Stroke={erase,colour,opacity,width:thickness*ls/page.getBoundingClientRect().width*1000,points:[point(page,e)]};stroke.points.push([...stroke.points[0]]);const svg=layer(page);(data[pageId(page)]??=[]).push(stroke);const p=appendStroke(svg,stroke);drawing={page,stroke,path:p,id:e.pointerId};stage.setPointerCapture(e.pointerId);},true);
 stage.addEventListener('pointermove',e=>{if(!drawing||e.pointerId!==drawing.id)return;e.preventDefault();e.stopImmediatePropagation();const rect=drawing.page.getBoundingClientRect();for(const sample of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e]){const bounded={clientX:Math.max(rect.left,Math.min(rect.left+drawing.page.clientWidth,sample.clientX)),clientY:Math.max(rect.top,Math.min(rect.bottom,sample.clientY))} as PointerEvent;drawing.stroke.points.push(point(drawing.page,bounded));}drawing.path.setAttribute('d',drawing.stroke.points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' '));},true);
 for(const event of ['pointerup','pointercancel'] as const)stage.addEventListener(event,e=>{if(!drawing)return;e.preventDefault();e.stopImmediatePropagation();finish();},true);
 root.addEventListener('reader:active-tool-change',()=>{finish();if(root.dataset.activeTool==='Sketch Pad')root.dispatchEvent(new Event('reader:clear-selection'));});
 root.addEventListener('reader:tool-settings',event=>{const d=(event as CustomEvent).detail;if(d.tool!=='Sketch Pad')return;erase=!!d.erase;root.classList.toggle('sketch-erasing',erase);colour=d.colour;opacity=d.opacity/100;thickness=Math.max(.1,Math.min(1.5,d.strokeLS));});
 new MutationObserver(()=>{if(stage.querySelector('.section-reading-pane:not(:has(.sketch-overlay))'))refresh();}).observe(stage,{childList:true,subtree:true});
 stage.addEventListener('contextmenu',event=>{if(root.dataset.activeTool==='Sketch Pad'){event.preventDefault();event.stopImmediatePropagation();}},true);
 stage.addEventListener('click',event=>{if(root.dataset.activeTool==='Sketch Pad'&&!(event.target as Element).closest('button,input,textarea,[data-comment-ui]')){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('pointerdown',event=>{
  if(root.hidden||root.dataset.activeTool!=='Sketch Pad')return;
  const target=event.target as Element;
  if(target.closest('.section-reading-pane,.tool-settings'))return;
  finish();root.dispatchEvent(new CustomEvent('reader:tool-activate',{detail:{tool:null}}));
 },true);
 window.addEventListener('pagehide',save);
 window.addEventListener('history:deleted',event=>{const removed=`reading-sketch:${(event as CustomEvent<string>).detail}`;localStorage.removeItem(removed);if(key===removed){drawing=undefined;key='';data={};stage.querySelectorAll('.sketch-overlay').forEach(s=>s.remove());}});
 return {setDocument(id:string){finish();key=`reading-sketch:${id}`;try{data=JSON.parse(localStorage.getItem(key)??'{}');}catch{data={};}stage.querySelectorAll('.sketch-overlay').forEach(s=>s.remove());refresh();}};
}
