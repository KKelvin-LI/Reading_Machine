import {viewportScale} from '../../ui/viewport-scale';
import {playSound,startPiWind,stopPiWind} from '../../ui/sounds';
import {selectionMenuSettings} from '../../config/selection-menu';
import {catchSettings as cfg} from '../../config/catch';
import {eatyTopView,eatyFrontView} from '../../three/eaty-art';
import '../../styles/pages/catch.css';

function headingText(text:string){const title=document.createElement('div');title.className='catch-heading';title.textContent=`[${text}]`;return title;}
export function mountCatch(){
 const app=document.getElementById('app')!;
 const overlay=document.createElement('section');overlay.className='eaty-balloon-window';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Pop the Eaty balloon');
 overlay.innerHTML='<svg class="balloon-string" aria-hidden="true"><path fill="none" stroke="#837d72" stroke-width="2"/></svg><button class="eaty-balloon" aria-label="Pop Eaty to return to reading"><img alt="Eaty balloon"></button><span class="balloon-pin" aria-hidden="true"></span>';
 document.body.append(overlay);overlay.append(headingText('POP IT!'));
 const balloon=overlay.querySelector<HTMLButtonElement>('button')!,img=balloon.querySelector('img')!,string=overlay.querySelector('path')!,pin=overlay.querySelector<HTMLElement>('.balloon-pin')!;
 let active=false,popped=false,raf=0,last=0,angle=0,velocity=0,wind=0,targetWind=0,nextWind=0,clicks:number[]=[],focus:HTMLElement|null=null,oldInert=false,oldOverflow='',art='';
 let balloonRotation=0,uiScale=viewportScale();
 window.addEventListener('resize',()=>{uiScale=viewportScale();});
 let mini:HTMLImageElement|null=null;
 let flightStart={x:0,y:0};
 let pointer:{x:number;y:number}|null=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 // Alpha hit testing follows Eaty's silhouette, including the gaps beside the legs.
 const mask=document.createElement('canvas');mask.width=mask.height=512;const ctx=mask.getContext('2d',{willReadFrequently:true})!;
 let attachment=.82,visibleTop=.1;
 const ready=eatyFrontView().then(async url=>{
  art=url;img.src=url;await img.decode();
  ctx.drawImage(img,0,0,512,512);const pixels=ctx.getImageData(0,0,512,512).data;for(let y=0;y<512;y++){let found=false;for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>100){visibleTop=y/512;found=true;break;}if(found)break;}for(let y=511;y>=0;y--){if(pixels[(y*512+256)*4+3]>100){attachment=y/512;break;}}
 });
 function tick(now:number){
  if(!active||popped)return;
  const dt=1.5*Math.min(.032,(now-last)/1000||.016);last=now;
  if(now>nextWind){targetWind=(Math.random()-.5)*5;nextWind=now+400+Math.random()*1000;}
  wind+=(targetWind-wind)*(1-Math.exp(-4*dt));
  if(!reduced.matches){velocity+=(wind-2.5*angle-.9*velocity)*dt;angle+=velocity*dt;angle=Math.max(-1.1,Math.min(1.1,angle));}
  const size=.77*Math.min(innerWidth*.4,innerHeight*.36,340*uiScale),length=innerHeight*.8-size*(attachment-visibleTop),ox=innerWidth/2,oy=innerHeight;
  let x=ox+Math.sin(angle)*length;const y=oy-Math.cos(angle)*length;
  const edge=size*.48;if(x<edge||x>innerWidth-edge){x=Math.max(edge,Math.min(innerWidth-edge,x));angle=Math.asin(Math.max(-1,Math.min(1,(x-ox)/length)));velocity=(x<=edge?1:-1)*Math.max(1.8,Math.abs(velocity)*1.15);targetWind=velocity;}
  const targetRotation=Math.atan2(wind*25,length*.3);
  balloonRotation+=(targetRotation-balloonRotation)*(1-Math.exp(-8*dt));
  const bend=Math.tan(balloonRotation)*length*.3;
  Object.assign(balloon.style,{transformOrigin:`50% ${attachment*100}%`,transform:`rotate(${balloonRotation}rad)`,width:`${size}px`,height:`${size}px`,left:`${x-size/2}px`,top:`${y-size*attachment}px`});
  string.setAttribute('d',`M ${ox} ${oy} C ${ox+wind*18+Math.sin(now*.002)*22} ${oy-length*.3}, ${x-bend} ${y+length*.3}, ${x} ${y}`);

  raf=requestAnimationFrame(tick);
 }
 async function pop(point?:{x:number;y:number}){
  if(!active||popped)return;stopPiWind();playSound('balloonPop');playSound('bubble');popped=true;cancelAnimationFrame(raf);balloon.hidden=true;
  const r=balloon.style,animations:Animation[]=[];
  const balloonRect=balloon.getBoundingClientRect();
  flightStart={x:parseFloat(r.left)+parseFloat(r.width)/2,y:parseFloat(r.top)+parseFloat(r.height)/2};
  playSound('spin');mini?.remove();mini=document.createElement('img');mini.src=art;mini.alt='Eaty';mini.className='cc-mini-eaty';
  const readerRect=document.getElementById('reader')!.getBoundingClientRect();
  const miniSize=Math.min(selectionMenuSettings.diameter*uiScale,readerRect.width-16*uiScale,readerRect.height-16*uiScale)*64/400;
  Object.assign(mini.style,{width:`${miniSize}px`,height:`${miniSize}px`,left:`${flightStart.x-miniSize/2}px`,top:`${flightStart.y-miniSize/2}px`});overlay.append(mini);
  const ceiling=-miniSize*visibleTop;
  mini.animate([{top:`${flightStart.y-miniSize/2}px`,transform:'scale(.25)'},{top:`${ceiling}px`,transform:'scale(1)',offset:.65},{top:`${ceiling}px`,transform:'scale(1.18,.72)',offset:.78},{top:`${ceiling+12}px`,transform:'scale(1)'}],{duration:reduced.matches?1:500,fill:'forwards',easing:'ease-out'});

  const size=parseFloat(r.width),origin={x:(point?.x??parseFloat(r.left)+size/2)-parseFloat(r.left),y:(point?.y??parseFloat(r.top)+size/2)-parseFloat(r.top)};
  // Curled membrane scraps: curved concave tears, independent recoil and tumbling.
  // Sample the actual Eaty surface colour so scraps retain the character palette.
  const scraps: {node:SVGSVGElement;x:number;y:number;vx:number;vy:number;spin:number;rotation:number}[]=[];
  overlay.querySelector<HTMLElement>('.catch-heading')!.hidden=true;
  for(let i=0;i<42;i++){
   let sx=0,sy=0,pixel:Uint8ClampedArray=new Uint8ClampedArray(4);
   for(let attempt=0;attempt<100;attempt++){sx=Math.random()*512;sy=Math.random()*512;pixel=ctx.getImageData(Math.floor(sx),Math.floor(sy),1,1).data;if(pixel[3]>100)break;}
   if(pixel[3]<100)continue;
   const x=sx/512*size,y=sy/512*size,theta=Math.atan2(y-origin.y,x-origin.x);
   const width=size*(.055+Math.random()*.1),height=width*(.6+Math.random()*1.2),curl=.25+Math.random()*.45;
   const shard=document.createElementNS('http://www.w3.org/2000/svg','svg');shard.classList.add('eaty-shard');shard.setAttribute('viewBox','0 0 100 100');
   // Two concave sides retract toward the thicker curved outer rim, like torn latex.
   const path=`M 8 12 Q ${50+curl*30} ${35+curl*35} 85 8 Q 110 55 72 94 Q ${52-curl*30} ${60-curl*30} 8 12 Z`;
   const colour=`rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
   shard.innerHTML=`<path d="${path}" fill="${colour}" stroke="rgba(50,35,25,.55)" stroke-width="2"/><path d="M 85 8 Q 98 52 72 94 Q 90 48 85 8" fill="rgba(255,255,255,.45)"/>`;
   Object.assign(shard.style,{left:r.left,top:r.top,width:`${width}px`,height:`${height}px`,overflow:'visible'});overlay.append(shard);
   const speed=Math.hypot(innerWidth,innerHeight)*(6+Math.random()*3);scraps.push({node:shard,x,y,vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed-80,spin:(Math.random()-.5)*900,rotation:Math.random()*360});
  }
  await new Promise<void>(resolve=>{let previous=performance.now(),elapsed=0;function scatter(now:number){const dt=Math.min(.035,(now-previous)/1000);previous=now;elapsed+=dt;
   for(const f of scraps){f.vx*=Math.exp(-.3*dt);f.vy+=650*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.rotation+=f.spin*dt;const recoil=1-.3*Math.min(1,elapsed/.06),flutter=.75+.25*Math.sin(elapsed*17+f.spin);f.node.style.transform=`translate(${f.x}px,${f.y}px) rotate(${f.rotation}deg) scale(${recoil},${recoil*flutter})`;f.node.style.opacity='1';}
   if(elapsed<.5&&!reduced.matches)requestAnimationFrame(scatter);else{scraps.forEach(f=>f.node.remove());resolve();}}
   requestAnimationFrame(scatter);
  });
  string.setAttribute('d','');await Promise.all(animations.map(a=>a.finished));
  showContinuation();
 }
 let savedLine:HTMLElement|null=null;
 type CapturedRun = {node:HTMLElement;rect:DOMRect;selector:string;font:string;letterSpacing:string;transform:string;direction:string};
 let captured:CapturedRun[]=[];
 let savedPane:HTMLElement|null=null;
 function currentRun(run:CapturedRun){
  return run.node.isConnected?run.node:document.querySelector<HTMLElement>(run.selector);
 }
 function readingActive(){const reader=document.getElementById('reader');return !!reader&&!reader.hidden&&!reader.inert&&document.getElementById('home')!.hidden;}
 document.addEventListener('reader:page-rendered',()=>{if(savedLine&&!savedLine.isConnected)savedLine=null;if(savedPane&&!savedPane.isConnected)savedPane=null;});
 document.addEventListener('pointerdown',event=>{
  if(active||!readingActive())return;
  const pane=(event.target as Element).closest<HTMLElement>('.section-reading-pane');if(!pane)return;savedPane=pane;
  const spans=[...pane.querySelectorAll<HTMLElement>('.textLayer span')];
  savedLine=spans.find(span=>{const r=span.getBoundingClientRect();return event.clientY>=r.top&&event.clientY<=r.bottom&&event.clientX>=r.left&&event.clientX<=r.right;})??savedLine;
 },true);
 async function finish(){
  stopPiWind();
  overlay.hidden=true;const reader=document.getElementById('reader')!;reader.hidden=false;reader.style.visibility='';active=false;app.inert=oldInert;document.body.style.overflow=oldOverflow;document.body.classList.remove('catch-open');document.dispatchEvent(new Event('catch:visibility'));focus?.focus({preventScroll:true});
 }
 function showContinuation(){
  pin.hidden=true;overlay.classList.add('continuing');
  const scene=document.createElement('div');scene.className='catch-continuation';
  const heading=headingText('CLICK TO CONTINUE.');scene.append(heading);
  const list=document.createElement('div');list.className='continue-lines';scene.append(list);
  const button=document.createElement('button');button.className='continue-reading-box';button.setAttribute('aria-label','Click this text box to resume reading');
  const left=Math.min(...captured.map(item=>item.rect.left)),top=Math.min(...captured.map(item=>item.rect.top));
  const right=Math.max(...captured.map(item=>item.rect.right)),bottom=Math.max(...captured.map(item=>item.rect.bottom));
  const padding=Math.max(...captured.map(item=>Math.min(item.rect.height,item.rect.width)))*.85;
  const width=right-left+padding*2, height=bottom-top+padding*2;
  Object.assign(list.style,{width:`${width}px`,height:`${height}px`});
  button.style.borderRadius=`min(1.375rem, ${padding*2}px)`;
  const rows=captured.map(item=>{
   const row=document.createElement('span');row.textContent=item.node.textContent;
   // Anchor the centre so the original PDF rotation also works for vertical text.
   const x=item.rect.left-left+padding+item.rect.width/2, y=item.rect.top-top+padding+item.rect.height/2;
   Object.assign(row.style,{left:`${x}px`,top:`${y}px`,font:item.font,letterSpacing:item.letterSpacing,direction:item.direction,
    transform:`translate(-50%, -50%) ${item.transform}`});
   button.append(row);return row;
  });
  list.append(button);overlay.append(scene);
  // PDF runs have independent horizontal scales. Fit each copy to its captured
  // screen bounds after the browser has laid it out in the button's font context.
  const rowBoxes=rows.map(row=>row.getBoundingClientRect());
  rows.forEach((row,index)=>{
   const {rect,transform}=captured[index], natural=rowBoxes[index];
   if(natural.width&&natural.height)row.style.transform=`translate(-50%, -50%) scale(${rect.width/natural.width}, ${rect.height/natural.height}) ${transform}`;
  });
  function fitBox(){
   const vw=scene.clientWidth,vh=scene.clientHeight,margin=Math.min(padding,vw*.02,vh*.02);
   const scale=Math.min(1,(vw-2*margin)/width,(vh-2*margin)/height);
   list.style.transform=`scale(${scale})`;
   list.style.left=`${Math.max(margin,Math.min(left-padding,vw-margin-width*scale))}px`;
   list.style.top=`${Math.max(margin,Math.min(top-padding,vh-margin-height*scale))}px`;
  }
  fitBox();
  const observer=new ResizeObserver(fitBox);observer.observe(scene);
  button.addEventListener('click',async()=>{
   if(scene.classList.contains('is-pressing'))return;playSound('close');scene.classList.add('is-pressing');button.classList.add('chosen');
   if(mini){
    const r=mini.getBoundingClientRect(),box=button.getBoundingClientRect(),scale=box.width/width;
    mini.getAnimations().forEach(a=>a.cancel());
    if(mini.parentElement!==button){
     Object.assign(mini.style,{position:'absolute',left:`${(r.left-box.left)/scale}px`,top:`${(r.top-box.top)/scale}px`});
     button.append(mini);
    }
   }
   await button.animate([{transform:'scale(1)'},{transform:'scale(.97,.94)',offset:.22},{transform:'scale(1.04,1.08)',offset:.58},{transform:'scale(1)'}],{duration:reduced.matches?1:430,easing:'ease-out'}).finished;
   if(mini){
    const mascot=mini,r=mascot.getBoundingClientRect();overlay.append(mascot);Object.assign(mascot.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
    mascot.src=await eatyTopView();
    const row=currentRun(captured[0])?.getBoundingClientRect()??captured[0].rect,side=parseFloat(mascot.style.width);
    const landingLeft=row.left-36*uiScale,landingTop=row.top+row.height/2-side/2;
    mascot.style.transformOrigin='center';
    const frames:Keyframe[]=[],height=Math.max(100,Math.min(innerHeight*.22,220));
    for(let i=0;i<=80;i++){const t=i/80,x=r.left+(landingLeft-r.left)*t,y=r.top+(landingTop-r.top)*t-4*height*t*(1-t);frames.push({left:`${x}px`,top:`${y}px`,transform:`rotate(${-90*t}deg)`,offset:t});}
    await mascot.animate(frames,{duration:reduced.matches?1:1040,fill:'forwards',easing:'ease-in-out'}).finished;
   }

   if(mini){mini.remove();mini=null;}
   if(!reduced.matches)playSound('windowDown',.2);
   const drop=button.animate([{transform:'translateY(0)',opacity:1},{transform:`translateY(${innerHeight}px)`,opacity:1}],{duration:reduced.matches?1:200,easing:'ease-in',fill:'forwards'});
   // Reveal the reading surface as the continuation box clears the window.
   scene.style.background='transparent';overlay.style.background='transparent';
   await drop.finished;button.style.visibility='hidden';
   observer.disconnect();scene.remove();overlay.style.background='';overlay.classList.remove('continuing');await finish();
   const first=currentRun(captured[0])?.firstChild,last=currentRun(captured[captured.length-1])?.lastChild;
   if(!first||!last)return;
   const range=document.createRange();range.setStart(first,0);range.setEnd(last,last.textContent?.length??0);
   const selection=window.getSelection();
   selection?.removeAllRanges();selection?.addRange(range);
   document.getElementById('reader')!.dispatchEvent(new CustomEvent('reader:select-continuation',{detail:{range}}));
  });
  button.focus({preventScroll:true});
  if(mini){
   const mascot=mini,rect=button.getBoundingClientRect(),size=parseFloat(mascot.style.width);
   const start={x:flightStart.x,y:12-size*visibleTop},end={x:rect.right-rect.width*.075-size/2,y:rect.top-size*attachment};
   mascot.getAnimations().forEach(animation=>animation.cancel());
   mascot.style.transformOrigin=`50% ${attachment*100}%`;
   const frames:Keyframe[]=[];
   for(let i=0;i<=160;i++){
    const t=i/160,e=t*t*(3-2*t),radius=Math.sin(Math.PI*t)*Math.min(28,innerWidth*.035);
    const x=start.x-size/2+(end.x-start.x+size/2)*e+Math.sin(t*Math.PI*12)*radius;
    const y=start.y+(end.y-start.y)*e+Math.cos(t*Math.PI*12)*radius*.5;
    frames.push({left:`${x}px`,top:`${y}px`,transform:`rotate(${t*2160}deg)`,offset:t});
   }
   const flight=mascot.animate(frames,{duration:reduced.matches?1:1300,fill:'forwards',easing:'linear'});
   void flight.finished.then(async()=>{
    if(!mascot.isConnected||scene.classList.contains('is-pressing'))return;
    flight.cancel();
    button.append(mascot);
    Object.assign(mascot.style,{position:'absolute',left:`calc(92.5% - ${size/2}px)`,top:`${-size*attachment}px`});
    await mascot.animate([{transform:'scale(1)'},{transform:'scale(1.28,.68)',offset:.18},{transform:'translateY(-12px) scale(.9,1.12)',offset:.47},{transform:'scale(1.08,.91)',offset:.76},{transform:'scale(1)'}],{duration:reduced.matches?1:520,easing:'ease-out'}).finished;
   }).catch(()=>{});

  }

 }
 async function activate(){
  if(active)return;
  if(!readingActive()){clicks=[];return;}
  const pane=(savedLine?.isConnected?savedLine.closest<HTMLElement>('.section-reading-pane'):savedPane?.isConnected?savedPane:document.querySelector<HTMLElement>('.section-reading-pane'));
  captured=[];
  if(pane){
   const spans=[...pane.querySelectorAll<HTMLElement>('.textLayer [data-pdf-item]')].filter(node=>node.textContent?.trim());
   const rows:HTMLElement[][]=[];
   for(const node of spans){const previous=rows.at(-1);if(previous&&previous[0].closest('.textLayer')===node.closest('.textLayer')&&Math.abs(previous[0].getBoundingClientRect().top-node.getBoundingClientRect().top)<3)previous.push(node);else rows.push([node]);}
   let index=rows.findIndex(row=>row.includes(savedLine!));
   if(index<0){const bounds=pane.getBoundingClientRect();index=Math.max(0,rows.findIndex(row=>row[0].getBoundingClientRect().bottom>bounds.top));}
   captured=rows.slice(index,index+5).flat().map(node=>{
    const style=getComputedStyle(node),page=node.closest<HTMLElement>('.pdf-slot')!.dataset.page;
    const selector=`.section-reading-pane[data-section="${pane.dataset.section}"] .pdf-slot[data-page="${page}"] [data-pdf-item="${node.dataset.pdfItem}"]`;
    return {node,selector,rect:node.getBoundingClientRect(),font:style.font||`${style.fontStyle} ${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`,
     letterSpacing:style.letterSpacing,direction:style.direction,transform:style.transform==='none'?'':style.transform};
   });
  }
  if(!captured.length)return;
startPiWind();active=true;popped=false;clicks=[];pointer=null;angle=velocity=wind=targetWind=balloonRotation=0;nextWind=0;focus=document.activeElement as HTMLElement;oldInert=app.inert;oldOverflow=document.body.style.overflow;app.inert=true;document.body.style.overflow='hidden';document.body.classList.add('catch-open');overlay.hidden=false;overlay.querySelector<HTMLImageElement>('.catch-heading')!.hidden=false;balloon.hidden=false;pin.hidden=true;document.dispatchEvent(new Event('catch:visibility'));
  overlay.style.setProperty('--catch-heading-size',getComputedStyle(document.querySelector('#reader-sidebar')!).fontSize);
  await ready;balloon.focus({preventScroll:true});last=performance.now();raf=requestAnimationFrame(tick);
 }
 overlay.addEventListener('pointermove',e=>{if(popped)return;pointer={x:e.clientX,y:e.clientY};pin.hidden=false;pin.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;});
 overlay.addEventListener('pointerleave',()=>{pointer=null;pin.hidden=true;});
 balloon.addEventListener('click',e=>{if(e.detail===0){void pop();return;}const size=parseFloat(balloon.style.width),px=parseFloat(balloon.style.left)+size/2,py=parseFloat(balloon.style.top)+size*attachment,dx=e.clientX-px,dy=e.clientY-py,c=Math.cos(balloonRotation),s=Math.sin(balloonRotation),u=(c*dx+s*dy+size/2)/size,v=(-s*dx+c*dy+size*attachment)/size;if(u>=0&&u<1&&v>=0&&v<1&&ctx.getImageData(Math.floor(u*512),Math.floor(v*512),1,1).data[3]>100)void pop({x:e.clientX,y:e.clientY});});
 overlay.addEventListener('keydown',e=>{if(e.key==='Tab'&&!popped){e.preventDefault();balloon.focus();}});
 document.addEventListener('catch:open',()=>void activate());
 window.addEventListener('click',e=>{if(!readingActive()){clicks=[];return;}if(active||e.button!==0||e.detail===0||document.querySelector('#reader')?.getAttribute('data-active-tool')==='Sketch Pad')return;const now=performance.now();clicks=clicks.filter(t=>now-t<=cfg.clickWindowMs);clicks.push(now);if(clicks.length>=cfg.clicks){e.preventDefault();e.stopImmediatePropagation();void activate();}},true);
}
