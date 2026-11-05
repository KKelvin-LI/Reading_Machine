import {eatyTopView} from '../three/eaty-art';
import {playSound} from './sounds';

type AnnotationOrigin={x:number;y:number;beforeJump?:()=>Promise<void>};

export function annotationOrigin():AnnotationOrigin|undefined{
 const wheel=document.querySelector<HTMLElement>('.selection-wheel:not([hidden]) .wheel-elastic');
 const frog=document.querySelector<HTMLElement>('.frog-select-cursor:not([hidden]) svg image');
 const rect=(wheel??frog)?.getBoundingClientRect();
 return rect&&rect.width?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,
  beforeJump:wheel?()=>new Promise<void>(resolve=>{
   const menu=wheel.closest<HTMLElement>('.selection-wheel');
   if(!menu||menu.hidden){resolve();return;}
   menu.dispatchEvent(new CustomEvent('eaty:annotation-handoff',{detail:{resolve}}));
  }):undefined}:undefined;
}

/** A newly saved Eaty hops back to its annotation, then squashes on landing. */
export async function bounceSavedEaty(root:HTMLElement,id:string,origin?:AnnotationOrigin){
 await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 const find=()=>root.querySelector<HTMLElement>(`[data-annotation-eaty="${id}"]`);
 let target=find();if(!target||root.hidden)return;
 const url=await eatyTopView().catch(()=>undefined);target=find();if(!url||!target||root.hidden)return;
 const rect=target.getBoundingClientRect(),width=rect.width,height=rect.height;
 if(!width||!height)return;

 const start=origin??{x:rect.left+width/2,y:rect.top+height/2};
 const mascot=document.createElement('img');mascot.src=url;mascot.alt='';mascot.setAttribute('aria-hidden','true');
 Object.assign(mascot.style,{position:'fixed',width:`${width}px`,height:`${height}px`,objectFit:'contain',pointerEvents:'none',zIndex:'2147483646',transformOrigin:'center'});
 // The saved mark can redraw during layout; hide all replacements until landing.
 const hide=document.createElement('style');hide.textContent=`[data-annotation-eaty="${id}"]{visibility:hidden!important}`;
 document.head.append(hide);
 try{
  await origin?.beforeJump?.();
  if(!find()||root.hidden||document.hidden)return;
  root.dispatchEvent(new CustomEvent('reader:clear-selection',{detail:{committed:true}}));
  playSound('bubble');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.body.append(mascot);
  await new Promise<void>(resolve=>{
   const began=performance.now();
   const frame=(now:number)=>{
    const anchor=find();if(!anchor||root.hidden||document.hidden){resolve();return;}
    const r=anchor.getBoundingClientRect(),t=Math.min(1,(now-began)/650);
    const flight=Math.min(1,t/.75),ease=flight*flight*(3-2*flight);
    const end={x:r.left+r.width/2,y:r.top+r.height/2};
    const arc=Math.min(140,Math.max(45,Math.hypot(end.x-start.x,end.y-start.y)*.22));
    const landing=Math.max(0,(t-.75)/.25),squash=Math.sin(landing*Math.PI*2)*Math.exp(-landing*3)*.25;
    mascot.style.left=`${start.x+(end.x-start.x)*ease-width/2}px`;
    mascot.style.top=`${start.y+(end.y-start.y)*ease-4*arc*flight*(1-flight)-height/2}px`;
    mascot.style.transform=`scale(${1+squash},${1-squash}) rotate(-90deg)`;
    if(t<1)requestAnimationFrame(frame);else resolve();
   };requestAnimationFrame(frame);
  });
 }finally{mascot.remove();hide.remove();}
}
