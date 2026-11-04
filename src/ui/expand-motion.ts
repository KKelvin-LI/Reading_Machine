/** Shared entry/reverse-exit motion for expandable lists. Percentages follow row width. */
export const expandMotion={duration:520/1.5,travelFraction:.65,startPercent:-50,overshootPercent:5};
const openLists=new Set<HTMLElement>();
export function expandableMotion(container:HTMLElement){
 let animations:Animation[]=[],run=0,collisionFrame=0;
 function cancel(){run++;cancelAnimationFrame(collisionFrame);openLists.delete(container);animations.forEach(a=>a.cancel());animations=[];container.classList.remove('expand-moving');container.inert=false;}
 async function play(open:boolean){
  const token=++run;cancelAnimationFrame(collisionFrame);
  if(open)openLists.add(container);
  const rows=Array.from(container.children).filter((e):e is HTMLElement=>e instanceof HTMLElement);
  container.classList.add('expand-moving');container.inert=true;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){cancel();return true;}
  // Reverse live animations in place if the user closes during entry.
  const reversing=!open&&animations.length===rows.length&&animations.some(a=>a.playState==='running');
  if(reversing){animations.forEach(a=>a.reverse());}
  else{
   animations.forEach(a=>a.cancel());
   const {duration,travelFraction,startPercent,overshootPercent}=expandMotion;
   const delay=duration*travelFraction*.5;
   animations=rows.map((row,index)=>row.animate([
    {transform:`translateX(${startPercent}%)`,opacity:0,offset:0,easing:'cubic-bezier(.2,.65,.3,1)'},
    {opacity:1,offset:.12},
    {transform:`translateX(${overshootPercent}%)`,opacity:1,offset:travelFraction,easing:'cubic-bezier(.25,.7,.3,1)'},
    {transform:'translateX(0)',opacity:1,offset:1},
   ],{duration,delay:(open?index:rows.length-1-index)*delay,direction:open?'normal':'reverse',fill:'both'}));
  }
  if(open){
   const bumped=new Set<HTMLElement>();
   const collisions=()=>{if(token!==run)return;
    for(let i=0;i<rows.length;i++){
     const elapsed=Number(animations[i]?.currentTime??0)-i*expandMotion.duration*expandMotion.travelFraction*.5;
     if(elapsed<expandMotion.duration*.45||elapsed>expandMotion.duration)continue;
     const a=rows[i].getBoundingClientRect();
     for(const other of openLists){if(other===container||!other.isConnected||other.hidden)continue;
      for(const child of other.children){if(!(child instanceof HTMLElement)||bumped.has(child))continue;const b=child.getBoundingClientRect();
       if(a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom){bumped.add(child);child.animate([{transform:'translateX(0)'},{transform:'translateX(5%)',offset:.45},{transform:'translateX(0)'}],{duration:expandMotion.duration,easing:'cubic-bezier(.22,.7,.3,1)'});}
      }
     }
    }
    if(animations.some(a=>a.playState==='running'))collisionFrame=requestAnimationFrame(collisions);
   };collisionFrame=requestAnimationFrame(collisions);
  }
  await Promise.all(animations.map(a=>a.finished.catch(()=>undefined)));
  if(token!==run)return false;
  container.classList.remove('expand-moving');container.inert=false;if(!open)openLists.delete(container);
  if(open){animations.forEach(a=>a.cancel());animations=[];}
  return true;
 }
 return {play,cancel};
}
