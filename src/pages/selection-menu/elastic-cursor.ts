import {applyEatyImage} from '../../three/eaty-art';
import {settings} from '../../interactions/settings';
/** Eaty extends a rounded tongue; existing spring motion and selection targets are preserved. */
export function createElasticCursor(menu:HTMLElement){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('wheel-elastic');svg.setAttribute('viewBox','0 0 400 400');svg.setAttribute('aria-hidden','true');
 const defs=document.createElementNS(ns,'defs');
 defs.innerHTML='<linearGradient id="eaty-wheel-tongue" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#ffdce9"/><stop offset=".27" stop-color="#f2bfd3"/><stop offset=".55" stop-color="#df9eb9"/><stop offset=".83" stop-color="#ca809f"/><stop offset="1" stop-color="#985a76"/></linearGradient>';
 svg.append(defs);
 const path=document.createElementNS(ns,'path');path.setAttribute('fill','url(#eaty-wheel-tongue)');svg.append(path);menu.append(svg);
 const frog=document.createElementNS(ns,'image');frog.setAttribute('x','-32');frog.setAttribute('y','-32');frog.setAttribute('width','64');frog.setAttribute('height','64');applyEatyImage(frog);
 const shine=document.createElementNS(ns,'path');shine.setAttribute('fill','none');shine.setAttribute('stroke','#fff0f6');shine.setAttribute('stroke-opacity','.55');shine.setAttribute('stroke-linecap','round');svg.append(shine);const jumper=document.createElementNS(ns,'g');jumper.append(frog);svg.append(jumper);jumper.style.transformOrigin='200px 200px';
 let jump:Animation|undefined,hurt:Animation|undefined;
 let x=200,y=200,tx=200,ty=200,vx=0,vy=0,raf=0,last=0,visible=false,retracting=false;
 let finishRetraction:(()=>void)|undefined;
 function draw(){
  const dx=x-200,dy=y-200,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
  const scale=400/Math.max(1,menu.getBoundingClientRect().width);
  const a=settings.cursorSize*scale/2;
  // Broad, nearly parallel sides and a rounded tip replace the pinched band and end bulb.
  const width=Math.max(7,Math.min(13,a*.7)),root=12,end=Math.max(root,d),tipRadius=Math.min(width,(end-root)/2);
  const transform=`translate(200 200) rotate(${angle})`;
  path.setAttribute('transform',transform);shine.setAttribute('transform',transform);
  frog.setAttribute('transform',`translate(200 200) rotate(${angle-90})`);
  path.setAttribute('d',`M ${root} ${-width} C ${root+(end-root)*.35} ${-width*1.05} ${end-tipRadius} ${-width*.85} ${end-tipRadius} ${-width*.85} Q ${end+tipRadius} 0 ${end-tipRadius} ${width*.85} C ${end-tipRadius} ${width*.85} ${root+(end-root)*.35} ${width*1.05} ${root} ${width} Z`);
  shine.setAttribute('stroke-width',String(width*.22));
  shine.setAttribute('d',`M ${root+7} ${-width*.45} Q ${(root+end)/2} ${-width*.65} ${Math.max(root+7,end-width)} ${-width*.36}`);
  path.style.display=shine.style.display=d>20?'':'none';
 }
 function tick(now:number){raf=0;if(!visible)return;const dt=Math.min((now-last)/1000||.016,.025);last=now;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){x=tx;y=ty;vx=vy=0;}else{vx+=(900*(tx-x)-52*vx)*dt;vy+=(900*(ty-y)-52*vy)*dt;x+=vx*dt;y+=vy*dt;}
  draw();if(Math.hypot(tx-x,ty-y,vx,vy)>.05)raf=requestAnimationFrame(tick);
 }
 function move(clientX:number,clientY:number){const r=menu.getBoundingClientRect();tx=(clientX-r.left)/r.width*400;ty=(clientY-r.top)/r.height*400;if(visible&&!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
 window.addEventListener('pointermove',e=>{if(visible&&!retracting)move(e.clientX,e.clientY);},{passive:true});
 return {async hurt(duration:number){
  jump?.cancel();svg.classList.remove('eaty-arriving');
  frog.setAttribute('transform','translate(200 200) rotate(180)');
  hurt=jumper.animate(matchMedia('(prefers-reduced-motion: reduce)').matches?[{opacity:1},{opacity:0}]:[
   {transform:'scale(1)',opacity:1,offset:0},
   {transform:'scale(3)',offset:.12},
   {transform:'translateX(-9px) rotate(-7deg) scale(3)',offset:.25},
   {transform:'translateX(9px) rotate(7deg) scale(3)',offset:.34},
   {transform:'scale(3)',offset:.43},
   {transform:'translateX(-9px) rotate(-7deg) scale(3)',offset:.52},
   {transform:'translateX(9px) rotate(7deg) scale(3)',offset:.61},
   {transform:'scale(3)',offset:.7},
   {transform:'scale(3)',opacity:1,offset:.8},
   {transform:'scale(0)',opacity:0,offset:1},
  ],{duration,easing:'ease-in-out',fill:'forwards'});
  await hurt.finished.catch(()=>{});
 },isStretched(){return Math.hypot(x-200,y-200)>20;},jumpFrom(clientX:number,clientY:number){
  jump?.cancel();const r=menu.getBoundingClientRect(),scale=400/r.width,dx=(clientX-r.left-r.width/2)*scale,dy=(clientY-r.top-r.height/2)*scale;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  svg.classList.add('eaty-arriving');
  jump=jumper.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:`translate(${dx*.55}px,${dy*.55-90}px)`,offset:.45},{transform:'translate(0,0)',offset:.85},{transform:'translate(0,0)'}],{duration:960,easing:'cubic-bezier(.22,.7,.2,1)'});
  void jump.finished.then(()=>svg.classList.remove('eaty-arriving')).catch(()=>{});
 },async retract(){retracting=true;cancelAnimationFrame(raf);raf=0;const sx=x,sy=y,start=performance.now();await new Promise<void>(resolve=>{finishRetraction=resolve;if(matchMedia('(prefers-reduced-motion: reduce)').matches){x=y=200;draw();finishRetraction=undefined;resolve();return;}function back(now:number){const t=Math.min(1,(now-start)/180),k=1-t;x=200+(sx-200)*k;y=200+(sy-200)*k;draw();if(t<1&&Math.hypot(x-200,y-200)>20)raf=requestAnimationFrame(back);else{x=y=200;draw();raf=0;finishRetraction=undefined;resolve();}}raf=requestAnimationFrame(back);});},show(cx:number,cy:number){retracting=false;visible=true;x=y=200;vx=vy=0;move(cx,cy);draw();},hide(){hurt?.cancel();jump?.cancel();svg.classList.remove('eaty-arriving');visible=false;cancelAnimationFrame(raf);raf=0;finishRetraction?.();finishRetraction=undefined;}};
}
