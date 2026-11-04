import {createCompletionEaty} from '../../three/completion-eaty';
import {createPopLettering} from '../../three/pop-lettering';

export function mountCompletion(){
 let playing=false;
 let yumTemplate:HTMLImageElement|undefined;
 let yumInkBottom=1;
 const parked=document.createElement('div');
 let prepared:Promise<Awaited<ReturnType<typeof createCompletionEaty>>>|undefined;
 function prepare(){return prepared??=createCompletionEaty(parked).then(async view=>{
  yumTemplate??=createPopLettering('YUM','#f89823');
  await yumTemplate.decode();
  const measure=document.createElement('canvas');measure.width=yumTemplate.naturalWidth;measure.height=yumTemplate.naturalHeight;
  const context=measure.getContext('2d')!;context.drawImage(yumTemplate,0,0);
  const rgba=context.getImageData(0,0,measure.width,measure.height).data;
  for(let y=measure.height-1;y>=0;y--){let ink=false;for(let x=0;x<measure.width;x++)if(rgba[(y*measure.width+x)*4+3]>16){ink=true;break;}if(ink){yumInkBottom=(y+1)/measure.height;break;}}

  view.pose(0,0,1,0,Math.PI/2,1,Math.PI/2);view.pose(0,0,1,0,0);return view;
 }).catch(error=>{prepared=undefined;throw error;});}
 document.addEventListener('reader:page-rendered',()=>{if(!prepared)void prepare().catch(console.warn);});
 const playCompletion=async(event:Event)=>{
  const detail=(event as CustomEvent<{reader:HTMLElement;accepted?:boolean;finished?:(success:boolean)=>void}>).detail;
  if(playing)return;playing=true;detail.accepted=true;
  let completed=false;
  const reader=detail.reader,wasInert=reader.inert;reader.inert=true;
  const overlay=document.createElement('section');overlay.setAttribute('aria-label','Eaty celebrates finishing your reading');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  Object.assign(overlay.style,{position:'fixed',inset:'0',background:'transparent',overflow:'hidden',zIndex:'2147483645'});
  document.body.append(overlay);
  let eaty:Awaited<ReturnType<typeof createCompletionEaty>>|undefined;
  let expansion:Animation|undefined;
  try{
   const source=reader.querySelector<HTMLElement>('.reading-window')??reader,rect=source.getBoundingClientRect();
   const clip=document.createElement('div'),canvas=document.createElement('div');
   Object.assign(clip.style,{position:'absolute',inset:'0',overflow:'hidden',zIndex:'1'});
   Object.assign(canvas.style,{position:'absolute',inset:'0',zIndex:'2',pointerEvents:'none'});
   overlay.append(clip,canvas);
   const ready=prepare();
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   const width=innerWidth,height=innerHeight,scale=Math.min(width/7,height/7)*.7,mouthY=height*.70,hingeX=width/2;
   async function tween(ms:number,draw:(t:number)=>void){await new Promise<void>(resolve=>{let elapsed=0,last=performance.now();function frame(now:number){if(!document.hidden)elapsed+=Math.min(40,now-last);last=now;const t=reduced?1:Math.min(1,elapsed/ms);draw(t);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});}
   const centreX=rect.left+rect.width/2,centreY=rect.top+rect.height/2;
   // Expand the opaque reading box first; a white veil then blends out its text.
   const expandScale=Math.max(width/Math.max(1,rect.width),height/Math.max(1,rect.height))*1.18;
   expansion=source.animate([
    {transform:'none',transformOrigin:'50% 50%'},
    {transform:`translate(${width/2-centreX}px,${height/2-centreY}px) scale(${expandScale})`,transformOrigin:'50% 50%'}
   ],{duration:reduced?1:280,easing:'cubic-bezier(.16,.8,.24,1)',fill:'forwards'});
   const whiteout=overlay.animate([
    {backgroundColor:'rgba(255,255,255,0)',offset:0},
    {backgroundColor:'rgba(255,255,255,0)',offset:.2},
    {backgroundColor:'rgba(255,255,255,1)',offset:1}
   ],{duration:reduced?1:300,easing:'ease-in-out',fill:'forwards'});
   await Promise.all([expansion.finished,whiteout.finished]);
   overlay.style.background='white';whiteout.cancel();expansion.cancel();expansion=undefined;
   eaty=await ready;eaty.attach(canvas);eaty.smile(0);
   await tween(650,t=>{
    const e=1-(1-t)**3;
    eaty!.pose(hingeX,mouthY+(height-mouthY+scale)*(1-e)-Math.sin(Math.PI*t)*scale*.5,scale,0,Math.PI/2*e,1,Math.PI/2*e);
   });
   const mouth=eaty.pose(hingeX,mouthY,scale,0,Math.PI/2,1,Math.PI/2);
   const paperWidth=mouth.width*.9,paperHeight=paperWidth*297/210;
   const texture=document.createElement('canvas');texture.width=840;texture.height=1188;
   const ink=texture.getContext('2d')!;ink.fillStyle='white';ink.fillRect(0,0,840,1188);ink.strokeStyle='#151410';ink.lineWidth=3;ink.strokeRect(2,2,836,1184);ink.fillStyle='#151410';ink.font='24px "Courier New",monospace';
   const words=Array.from({length:30},()=> 'Congratulations on finishing your reading! Every page is another step forward. Well done — you finished the whole document!').join(' ').split(' ');
   let line='',row=65;
   for(const word of words){if(ink.measureText(line+word+' ').width>748){ink.fillText(line,46,row);row+=32;line='';if(row>1140)break;}line+=word+' ';}
   eaty.setPaper(texture,paperWidth,paperHeight);
   const contactY=mouth.y-paperHeight,startY=-paperHeight-12;
   // Approach straight; chewing starts only when the bottom reaches the mouth.
   await tween(750,t=>{
    eaty!.paper(mouth.x,startY+(contactY-startY)*t*t,0);
   });
   let lastBite=-1;
   function crumbs(bite:number){
    if(reduced)return;
    for(const side of [-1,1])for(let i=0;i<5;i++){
     const crumb=document.createElement('span');
     const w=3+(i*3+bite)%5,h=3+(i+bite*2)%4;
     Object.assign(crumb.style,{position:'absolute',left:`${mouth.x+side*mouth.width*.48}px`,top:`${mouth.y}px`,width:`${w}px`,height:`${h}px`,background:'#fffdf4',border:'1px solid #bcb8aa',clipPath:'polygon(0 12%, 75% 0, 100% 68%, 32% 100%)',pointerEvents:'none',zIndex:'4'});
     overlay.append(crumb);
     const dx=side*scale*(.32+i*.12),dy=scale*(.18+i*.05);
     const flight=crumb.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${dx*.5}px,${-dy}px) rotate(${side*100}deg)`,opacity:1,offset:.4},{transform:`translate(${dx}px,${scale*.35}px) rotate(${side*(220+i*45)}deg)`,opacity:0}],{duration:420+i*35,easing:'linear',fill:'forwards'});
     flight.finished.then(()=>crumb.remove(),()=>crumb.remove());
    }
   }
   await tween(2800,t=>{
    const phase=t*Math.PI*4,swing=Math.sin(phase);
    const chew=(1+Math.cos(phase*2))/2;
    const sway=swing*paperWidth*.035*Math.sin(Math.PI*t);
    eaty!.pose(hingeX,mouthY,scale,0,Math.PI/2*chew,1,Math.PI/2);
    // Keep the sheet centred between the corners while it is pulled down.
    eaty!.paper(mouth.x+sway,contactY+(paperHeight+scale*.45)*t,swing*.025*Math.sin(Math.PI*t));
    const bite=Math.floor((phase+Math.PI/2)/Math.PI);
    if(bite>0&&bite!==lastBite){lastBite=bite;crumbs(bite);}
   });
   eaty.hidePaper();
   await tween(700,t=>{
    const e=t*t*(3-2*t);
    eaty!.pose(hingeX,mouthY,scale,0,Math.PI/2*(1-e),1,Math.PI/2*(1-e));
   });
   const yum=yumTemplate!.cloneNode(true) as HTMLImageElement;yum.className='completion-yum';
   Object.assign(yum.style,{position:'absolute',width:`${Math.min(width*.52,420)}px`,height:'auto',left:'50%',top:'10%',transform:'translateX(-50%)',zIndex:'3'});overlay.append(yum);
   // Measure the same spacing unit as the reader, then leave 2 LS above Eaty.
   const spacing=document.createElement('span');
   Object.assign(spacing.style,{position:'absolute',width:'var(--reader-ls, .55em)',height:'1px',visibility:'hidden'});
   reader.append(spacing);const ls=spacing.getBoundingClientRect().width;spacing.remove();
   const yumRect=yum.getBoundingClientRect();
   const jumpY=yumRect.top+yumRect.height*yumInkBottom+2*ls+eaty.topOffset*scale;
   yum.style.transform='translateX(-50%) scale(0)';
   await tween(180,t=>{
    const squeeze=reduced?1:1-.16*(t*t*(3-2*t));
    eaty!.pose(hingeX,mouthY,scale,0,0,1,0,squeeze);
   });
   await tween(420,t=>{
    const e=1-(1-t)**3;
    eaty!.smile(e);
    eaty!.pose(hingeX,mouthY+(jumpY-mouthY)*e,scale,0,0,1,0,reduced?1:.84+.16*Math.min(1,t*4));
    yum.style.transform=`translateX(-50%) scale(${e})`;
   });
   // CSS rotates clockwise; Three.js rotates counterclockwise for a positive angle.
   await tween(560,t=>{
    const angle=reduced?0:Math.sin(t*Math.PI*4)*7*Math.sin(Math.PI*t);
    yum.style.transform=`translateX(-50%) rotate(${angle}deg)`;
    eaty!.pose(hingeX,jumpY,scale,0,0,1,0,1,angle*Math.PI/180);
   });
   await tween(180,()=>{});
   // Keep both on one falling trajectory until their top edges clear the viewport.
   const dropDistance=Math.max(height-yumRect.top,height-jumpY+eaty.topOffset*scale)+24;
   await tween(650,t=>{
    const fall=dropDistance*t*t;
    yum.style.transform=`translate(-50%, ${fall}px)`;
    eaty!.pose(hingeX,jumpY+fall,scale,0,0,1,0);
   });
   completed=true;
   // Removing the overlay reveals the existing reader at its unchanged position.
  }catch(error){console.warn('Completion celebration unavailable',error);}
  finally{detail.finished?.(completed);expansion?.cancel();if(eaty)eaty.attach(parked);overlay.remove();reader.inert=wasInert;playing=false;document.dispatchEvent(new Event('reader:completion-finished'));}
 };
 document.addEventListener('reader:first-completion',playCompletion);
 document.addEventListener('reader:replay-completion',playCompletion);
 return {prepare};
}
