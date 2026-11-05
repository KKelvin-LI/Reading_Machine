import {playSound} from './sounds';
/** Single press feedback, with a short double-click window reserved for deletion. */
export function eatyActions(button:HTMLButtonElement,onDelete:()=>Promise<void>,onClick?:()=>void){
 let timer:ReturnType<typeof setTimeout>|undefined,animation:Animation|undefined,busy=false;
 const art=button.querySelector('img')!;
 button.title='Click Eaty · double-click to delete';
 button.addEventListener('click',event=>{
  event.stopPropagation();if(busy)return;
  playSound('bubble');
  animation?.cancel();
  animation=art.animate([{scale:'1'},{scale:'.97 .94',offset:.22},{scale:'1.04 1.08',offset:.58},{scale:'1'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?1:430,easing:'cubic-bezier(.22,.7,.2,1)'});
  if(timer){clearTimeout(timer);timer=undefined;busy=true;void onDelete().catch(error=>console.warn('Could not delete Eaty annotation',error)).finally(()=>busy=false);}
  else timer=setTimeout(()=>{timer=undefined;if(button.isConnected)onClick?.();},300);
 });
 button.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();});
}
