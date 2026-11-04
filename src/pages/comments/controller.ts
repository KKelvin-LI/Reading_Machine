import {eatyActions} from '../../ui/eaty-actions';
import {applyEatyImage} from '../../three/eaty-art';
import {captureMarks,mountSavedMarks} from '../highlights/marks';
import {historyArt,pressCross} from '../../three/history-art';
import {commentArrowArt,pressCommentArrow} from '../../three/comment-arrow';
import {listComments,putComment,removeComment,type CommentEntry} from './store';
import '../../styles/pages/comments.css';
export function mountComments(root:HTMLElement){
 const stage=root.querySelector<HTMLElement>('#page-stage')!,windowEl=root.querySelector<HTMLElement>('.reading-window')!;
 const layer=document.createElement('div');layer.className='pdf-comments';layer.dataset.commentUi='';windowEl.append(layer);
 const marks=document.createElement('div');marks.className='comment-marks';layer.append(marks);
 const status=document.createElement('p');status.className='comment-status';status.setAttribute('role','status');layer.append(status);
 let id:string|undefined,version=0,entries:CommentEntry[]=[],frame=0;
 const views=new Map<string,{box:HTMLElement;arrow:HTMLButtonElement;input:HTMLTextAreaElement}>();
 const redrawFoam=mountSavedMarks(stage,()=>entries,'#fcf068');
 const persist=(entry:CommentEntry)=>{void putComment({...entry}).catch(()=>status.textContent='Could not save this comment. Please keep this page open and try again.');};
 function schedule(){if(!frame)frame=requestAnimationFrame(layout);}
 function layout(){frame=0;marks.replaceChildren();const base=windowEl.getBoundingClientRect(),viewport=stage.getBoundingClientRect();
  const measure=document.createElement('span');measure.style.cssText='position:absolute;visibility:hidden;height:var(--reader-ls,.55em);width:0;pointer-events:none';layer.append(measure);layer.style.setProperty('--comment-ls',getComputedStyle(measure).height);measure.remove();
  Object.assign(marks.style,{left:`${viewport.left-base.left}px`,top:`${viewport.top-base.top}px`,width:`${viewport.width}px`,height:`${viewport.height}px`});
  for(const entry of entries){const view=views.get(entry.id)!;let last:DOMRect|undefined;
   for(const [rectIndex,rect] of entry.rects.entries()){const slot=Array.from(stage.querySelectorAll<HTMLElement>(`.pdf-slot[data-page="${rect.page}"]`)).find(el=>{const b=el.getBoundingClientRect(),c=el.closest('.section-page-window')?.getBoundingClientRect();return !c||(b.top+(rect.y+rect.h)*b.height>c.top&&b.top+rect.y*b.height<c.bottom);});if(!slot)continue;const b=slot.getBoundingClientRect();const r=new DOMRect(b.left+rect.x*b.width,b.top+rect.y*b.height,rect.w*b.width,rect.h*b.height);const clip=slot.closest('.section-page-window')?.getBoundingClientRect();if(clip&&(r.bottom<=clip.top||r.top>=clip.bottom))continue;if(!last)last=r;
    if(r.bottom<viewport.top||r.top>viewport.bottom)continue;
    const mark=document.createElement('span');mark.className='comment-highlight';mark.dataset.tip=entry.rects.length===1?'both':rectIndex===0?'start':rectIndex===entry.rects.length-1?'end':'middle';Object.assign(mark.style,{left:`${r.left-viewport.left}px`,top:`${r.top-viewport.top}px`,width:`${r.width}px`,height:`${r.height}px`});marks.append(mark);
   }
   const visible=!!last&&last.bottom>=viewport.top&&last.top<=viewport.bottom;view.arrow.hidden=!visible;
   if(last){view.arrow.style.left=`${Math.max(0,last.left-base.left-42)}px`;view.arrow.style.top=`${last.top-base.top-12}px`;}
   view.box.hidden=!entry.open||(!visible&&entry.x===undefined);
   const width=Math.min(base.width*.85,Math.max(180,entry.width*base.width)),height=Math.min(base.height*.85,Math.max(110,entry.height*base.height));
   const x=entry.x!==undefined?entry.x*base.width:(last?last.right-base.left-width:base.width-width-20);
   const y=entry.y!==undefined?entry.y*base.height:(last?last.bottom-base.top+12:20);
   Object.assign(view.box.style,{left:`${Math.max(0,Math.min(base.width-width,x))}px`,top:`${Math.max(0,Math.min(base.height-height,y))}px`,width:`${width}px`,height:`${height}px`});
  }
 }

 function create(entry:CommentEntry){
  const box=document.createElement('section');box.className='comment-box';box.setAttribute('aria-label','Comment on selected text');
  box.innerHTML='<header class="comment-drag"><span></span></header><textarea placeholder="Type here to leave comment" aria-label="Comment text"></textarea>';
  box.querySelector('header span')!.textContent=`Kelvin Li  ${new Intl.DateTimeFormat('en-AU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}).format(entry.createdAt)}`;
  const input=box.querySelector('textarea')!;input.value=entry.body;input.addEventListener('input',()=>{entry.body=input.value;persist(entry);});
  const arrow=document.createElement('button');arrow.type='button';arrow.className='comment-arrow';arrow.setAttribute('aria-label','Show or hide comment');arrow.setAttribute('aria-expanded',String(entry.open));arrow.innerHTML='<img alt="">';
  const arrowImage=arrow.querySelector('img')!;
  applyEatyImage(arrowImage);
  let busy=false;
  arrow.setAttribute('aria-label','Eaty: click to toggle comment, double-click to delete');
  eatyActions(arrow,async()=>{busy=true;try{await removeComment(entry.id);entries=entries.filter(e=>e.id!==entry.id);redrawFoam();views.delete(entry.id);box.remove();arrow.remove();layout();}catch(error){status.textContent='Could not delete this comment.';throw error;}finally{busy=false;}},()=>{if(busy)return;entry.open=!entry.open;arrow.setAttribute('aria-expanded',String(entry.open));persist(entry);layout();});
  function handle(el:HTMLElement,corner?:string){el.addEventListener('pointerdown',event=>{if(event.button!==0||(event.target as Element).closest('button'))return;event.preventDefault();event.stopPropagation();el.setPointerCapture(event.pointerId);const start=box.getBoundingClientRect(),base=windowEl.getBoundingClientRect(),sx=event.clientX,sy=event.clientY;
   const move=(e:PointerEvent)=>{const dx=e.clientX-sx,dy=e.clientY-sy;let x=start.left-base.left,y=start.top-base.top,w=start.width,h=start.height;
    if(!corner){x+=dx;y+=dy;}else{if(corner.includes('e'))w+=dx;if(corner.includes('s'))h+=dy;if(corner.includes('w')){w-=dx;x+=dx;}if(corner.includes('n')){h-=dy;y+=dy;}}
    w=Math.min(base.width,Math.max(180,w));h=Math.min(base.height,Math.max(110,h));entry.x=Math.max(0,Math.min(base.width-w,x))/base.width;entry.y=Math.max(0,Math.min(base.height-h,y))/base.height;entry.width=w/base.width;entry.height=h/base.height;layout();};
   const end=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);if(el.hasPointerCapture(event.pointerId))el.releasePointerCapture(event.pointerId);persist(entry);};el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  });}
  handle(box.querySelector<HTMLElement>('header')!);handle(box);
  // The box border/header moves it; the editable area retains normal text selection.
  input.addEventListener('pointerdown',e=>e.stopPropagation());
  for(const corner of ['nw','ne','sw','se']){const grip=document.createElement('span');grip.className=`comment-resize ${corner}`;grip.setAttribute('aria-hidden','true');box.append(grip);handle(grip,corner);}
  layer.append(box,arrow);views.set(entry.id,{box,arrow,input});
 }
 stage.addEventListener('scroll',schedule,{passive:true,capture:true});new ResizeObserver(schedule).observe(stage);new MutationObserver(records=>{if(records.some(r=>!(r.target as Element).closest?.('.saved-highlight-marks,.saved-comment-marks')))schedule();}).observe(stage,{childList:true,subtree:true});
 return {
  async setDocument(documentId?:string){const token=++version;id=documentId;entries=[];views.forEach(v=>{v.box.remove();v.arrow.remove();});views.clear();marks.replaceChildren();status.textContent='';if(!id)return;const loaded=await listComments(id);if(token!==version)return;entries=loaded;entries.forEach(create);redrawFoam();schedule();},
  reset(){version++;id=undefined;entries=[];views.forEach(v=>{v.box.remove();v.arrow.remove();});views.clear();marks.replaceChildren();redrawFoam();},
  async save(range:Range){const token=version;if(!id)throw new Error('No document');const rects=captureMarks(stage,range);
   if(!rects.length)throw new Error('No text rectangles');const entry:CommentEntry={id:crypto.randomUUID(),documentId:id,text:range.toString(),body:'',createdAt:Date.now(),rects,width:.3,height:.24,open:true};await putComment(entry);if(token!==version)return;entries.push(entry);redrawFoam();create(entry);root.dispatchEvent(new Event('reader:clear-selection'));layout();views.get(entry.id)!.input.focus({preventScroll:true});
  }
 };
}
