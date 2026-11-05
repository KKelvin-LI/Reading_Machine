import {playScrollTicks} from './sounds';

/** Carry fractional clicks across events, with speed measured in percent/second. */
export function percentageTicks(previous:number,next:number,remainder:number,elapsedMs=1000,previousSpeed=0){
 const distance=Math.abs(next-previous);
 if(distance===0)return {count:0,remainder,speed:previousSpeed,spacing:1};
 const instant=distance*1000/Math.max(16,Math.min(120,elapsedMs));
 // React immediately to acceleration, but ease down to avoid threshold chatter.
 const speed=Math.max(instant,previousSpeed*.65+instant*.35);
 const spacing=speed<15?1:speed<60?3:speed<150?6:9;
 const clicks=distance/spacing+remainder,count=Math.floor(clicks+1e-7);
 return {count,remainder:Math.max(0,clicks-count),speed,spacing};
}

export function mountScrollSounds(){
 const toolStates=new Map<string,{values:number[];remainder:number;speed:number;time:number}>();
 let toolIntent=0;
 const intent=(event:Event)=>{
  if(event.target instanceof Element&&event.target.closest('.tool-settings'))toolIntent=performance.now();
 };
 document.addEventListener('wheel',intent,{capture:true,passive:true});
 document.addEventListener('pointerdown',intent,{capture:true,passive:true});
 document.addEventListener('pointermove',event=>{if(event.buttons)intent(event);},{capture:true,passive:true});
 document.addEventListener('touchmove',intent,{capture:true,passive:true});
 document.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','PageDown','PageUp','Home','End',' '].includes(event.key))intent(event);},true);
 // Handles the custom pen-width triangle as well as native sliders and number fields.
 document.addEventListener('reader:tool-settings',event=>{
  const d=(event as CustomEvent).detail;
  const values=d.tool==='Paced Reading'?[(d.wpm-60)/440*100]:[d.opacity,(d.strokeLS-.1)/1.4*100];
  if(values.some((v:number)=>!Number.isFinite(v)))return;
  const now=performance.now(),old=toolStates.get(d.tool);
  let remainder=old?.remainder??0,speed=old?.speed??0;
  if(old&&now-toolIntent<500){
   const distance=values.reduce((sum:number,v:number,i:number)=>sum+Math.abs(v-old.values[i]),0);
   const step=percentageTicks(0,distance,remainder,now-old.time,now-old.time>250?0:speed);remainder=step.remainder;speed=step.speed;
   playScrollTicks(step.count);
  }
  toolStates.set(d.tool,{values,remainder,speed,time:now});
 });
}
