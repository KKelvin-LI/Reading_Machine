import {createPopLettering} from '../../three/pop-lettering';
import {createElasticCursor} from './elastic-cursor';
import {nearPdfText} from '../../interactions/text-hit';
import {dragDirection} from './direction';
import {selectionMenuSettings as cfg} from '../../config/selection-menu';
import {createSelectionWheel,wheelPath,wheelOutline} from '../../three/selection-wheel';
import '../../styles/pages/selection-menu.css';

export function mountSelectionMenu(root:HTMLElement,highlight:(range:Range)=>Promise<void>,comment:(range:Range)=>Promise<void>){
  const stage=root.querySelector<HTMLElement>('#page-stage')!;
  const menu=document.createElement('div');menu.className='selection-wheel';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Selected text actions');
  const paths=cfg.actions.map((a,i)=>{
    const t=a.angle+.19,end=a.angle+Math.PI/2-.19,r=146;
    return `<path id="wheel-text-${i}" d="M${200+r*Math.cos(t)},${200+r*Math.sin(t)} A${r},${r} 0 0 1 ${200+r*Math.cos(end)},${200+r*Math.sin(end)}"/>`;
  }).join('');
  menu.innerHTML=`<svg viewBox="0 0 400 400"><defs>${paths}</defs>${cfg.actions.map((a,i)=>`<g data-visual="${i}"><path class="wheel-shape" d="${wheelPath(a.angle)}"/><text transform="translate(0 ${a.id==='ask'||a.id==='distracted'?-7.6:7.6})"><textPath href="#wheel-text-${i}" startOffset="50%" text-anchor="middle">${a.label}</textPath></text></g>`).join('')}</svg><div class="wheel-model" aria-hidden="true"></div>`;
  cfg.actions.forEach((action,i)=>{
    const button=document.createElement('button');button.type='button';button.dataset.nativeControl='';button.dataset.action=String(i);button.setAttribute('role','menuitem');button.setAttribute('aria-label',action.label);
    const points=wheelOutline(action.angle);
    button.style.clipPath=`polygon(${points.map(p=>`${(p.x+200)/4}% ${(p.y+200)/4}%`).join(',')})`;menu.append(button);
  });
  const elastic=createElasticCursor(menu);
  document.body.append(menu);const message=document.createElement('p');message.className='wheel-status';message.hidden=true;message.setAttribute('role','status');document.body.append(message);
  const items=[...menu.querySelectorAll<HTMLButtonElement>('[data-action]')];
  let view:Awaited<ReturnType<typeof createSelectionWheel>>|undefined,ready:Promise<typeof view>|undefined;
  let range:Range|undefined,active=-1,busy=false,version=0,notice:ReturnType<typeof setTimeout>|undefined;
  let awaitingSelection=false,pendingAction=-1,restTimer:ReturnType<typeof setTimeout>|undefined;
  let drag=false,lastRange:Range|undefined,down:{x:number;y:number;id:number;startedAt:number;threshold:number;range?:Range}|undefined;
  document.addEventListener('selectionchange',()=>{const sel=window.getSelection();if(sel?.rangeCount&&!sel.isCollapsed){const r=sel.getRangeAt(0);if(stage.contains(r.startContainer)&&stage.contains(r.endContainer))lastRange=r.cloneRange();}});
  function selection(cached=true){const sel=window.getSelection();if(!sel?.rangeCount||sel.isCollapsed)return cached&&lastRange&&stage.contains(lastRange.startContainer)?lastRange.cloneRange():undefined;const r=sel.getRangeAt(0);if(stage.contains(r.startContainer)&&stage.contains(r.endContainer)&&r.toString().trim())return r.cloneRange();}
  function selectionPrompt(value:boolean){
    awaitingSelection=value;root.classList.toggle('awaiting-text-selection',value);
    document.body.classList.toggle('awaiting-text-selection',value);
    clearTimeout(notice);
    if(value){message.textContent='Select some text to use this action.';message.hidden=false;}
    else{root.classList.remove('is-grabbing-text');document.body.classList.remove('is-grabbing-text');message.hidden=true;}
  }
  function tell(text:string){message.textContent=text;message.hidden=false;clearTimeout(notice);notice=setTimeout(()=>message.hidden=true,3000);}
  function hitSection(clientX:number,clientY:number){
    const rect=menu.getBoundingClientRect(),x=(clientX-rect.left)/rect.width*400-200,y=(clientY-rect.top)/rect.height*400-200;
    return cfg.actions.findIndex(action=>{const polygon=wheelOutline(action.angle);let inside=false;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;});
  }
  let ouch:HTMLImageElement|undefined,ouchAnimation:Animation|undefined;
  function clearOuch(){ouchAnimation?.cancel();ouchAnimation=undefined;if(ouch)ouch.hidden=true;}
  function prepareOuch(){
    if(ouch)return;
    ouch=createPopLettering('OUCH!');ouch.className='wheel-ouch';ouch.hidden=true;
    ouch.setAttribute('aria-hidden','true');document.body.append(ouch);
  }
  async function showOuch(rect:DOMRect){
    prepareOuch();clearOuch();const image=ouch!;
    const width=Math.min(220,rect.width*.7,innerWidth-16),height=width*image.naturalHeight/Math.max(1,image.naturalWidth);
    image.style.width=`${width}px`;
    image.style.left=`${Math.max(8,Math.min(innerWidth-width-8,rect.left+(rect.width-width)/2))}px`;
    image.style.top=`${Math.max(8,Math.min(innerHeight-height-8,rect.top+rect.height/2-rect.width*96/400-height+height*.12))}px`;
    image.style.transformOrigin='bottom center';
    image.hidden=false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    ouchAnimation=image.animate(reduced?[{opacity:1},{opacity:0}]:[
      {transform:'scale(1)',opacity:1,offset:0},
      {transform:'scale(3)',opacity:1,offset:.12},
      {transform:'translateX(-9px) rotate(-7deg) scale(3)',offset:.25},
      {transform:'translateX(9px) rotate(7deg) scale(3)',offset:.34},
      {transform:'translateX(0) rotate(0) scale(3)',offset:.43},
      {transform:'translateX(-9px) rotate(-7deg) scale(3)',offset:.52},
      {transform:'translateX(9px) rotate(7deg) scale(3)',offset:.61},
      {transform:'translateX(0) rotate(0) scale(3)',offset:.7},
      {transform:'scale(3)',opacity:1,offset:.8},
      {transform:'scale(0)',opacity:0,offset:1},
    ],{duration:reduced?150:525,easing:'ease-in-out',fill:'forwards'});
    await Promise.all([ouchAnimation.finished.catch(()=>{}),elastic.hurt(reduced?150:525)]);
    image.hidden=true;
  }
  async function retractAndClose(){
    busy=true;const token=version,stretched=elastic.isStretched(),rect=menu.getBoundingClientRect();
    hover(-1);menu.classList.add('is-retracting');await elastic.retract();
    if(token!==version)return;
    selectionPrompt(false);pendingAction=-1;
    if(stretched)await showOuch(rect);
    if(token===version)close();
  }
  function hover(index:number){active=index;menu.querySelectorAll('[data-visual]').forEach((item,i)=>item.classList.toggle('is-hover',i===index));view?.hover(index);}
  function prepare(){return ready??=createSelectionWheel(menu.querySelector<HTMLElement>('.wheel-model')!).then(v=>{view=v;menu.classList.add('model-ready');if(!menu.hidden)hover(active);return v;}).catch(e=>{console.warn(e);return undefined;});}
  function releasePointer(){if(down&&root.hasPointerCapture(down.id))root.releasePointerCapture(down.id);}
  function close(){menu.classList.remove('is-retracting');elastic.hide();version++;releasePointer();down=undefined;drag=false;busy=false;menu.hidden=true;root.classList.remove('selection-wheel-open');view?.hide();active=-1;}
  function open(x:number,y:number,r?:Range){
    clearOuch();prepareOuch();close();range=r;if(!r?.toString().trim())selectionPrompt(true);menu.hidden=false;root.classList.add('selection-wheel-open');
    const frame=root.getBoundingClientRect(),size=Math.min(cfg.diameter,frame.width-16,frame.height-16);menu.style.width=menu.style.height=`${size}px`;
    menu.style.left=`${Math.max(frame.left+8,Math.min(frame.right-size-8,x-size/2))}px`;
    menu.style.top=`${Math.max(frame.top+8,Math.min(frame.bottom-size-8,y-size/2))}px`;
    elastic.show(x,y);hover(-1);void prepare();
  }
  function cancelAction(){
    clearTimeout(restTimer);pendingAction=-1;selectionPrompt(false);close();range=lastRange=undefined;
    root.dispatchEvent(new Event('reader:cancel-selection-animation'));
    root.dispatchEvent(new Event('reader:clear-selection'));
  }
  async function perform(index:number,saved:Range){
    const action=cfg.actions[index];
    if(action.id==='highlight'){await highlight(saved);tell('Highlight completed — saved to Highlights.');}
    else if(action.id==='comment'){await comment(saved);tell('Comment added — type in the yellow box.');}
    else tell(`${action.label} is not connected yet — no action was performed.`);
  }
  async function completionFeedback(saved:Range,token:number){
    await new Promise<void>(resolve=>root.dispatchEvent(new CustomEvent('reader:animate-selection',{
      detail:{padding:parseFloat(getComputedStyle(root).fontSize)*.3,resolve},
    })));
    if(token!==version)return false;
    root.dispatchEvent(new Event('reader:clear-selection'));return true;
  }

  function finishDeferredSelection(){
    const selected=selection(false);if(!selected?.toString().trim()||pendingAction<0)return;
    const saved=selected.cloneRange(),chosen=pendingAction;selectionPrompt(false);close();
    const token=version;clearTimeout(restTimer);
    restTimer=setTimeout(async()=>{
      if(token!==version)return;busy=true;
      try{if(await completionFeedback(saved,token)){await perform(chosen,saved);pendingAction=-1;range=lastRange=undefined;}}
      catch{tell('This action could not be completed. Please try again.');}
      finally{if(token===version)busy=false;}
    },500);
  }
  async function activate(index:number,point?:{x:number;y:number}){
    if(busy||index<0)return;
    busy=true;hover(index);const token=version,saved=range?.cloneRange(),action=cfg.actions[index];

    const model=await prepare();if(token!==version)return;const bounds=menu.getBoundingClientRect();
    await model?.press(index,point?{x:(point.x-bounds.left)/bounds.width*400-200,y:200-(point.y-bounds.top)/bounds.height*400}:undefined);if(token!==version)return;
    if(action.id==='distracted'){selectionPrompt(false);pendingAction=-1;close();document.dispatchEvent(new Event('catch:open'));return;}
    if(!saved){pendingAction=index;close();selectionPrompt(true);return;}
    try{
      await new Promise<void>(resolve=>root.dispatchEvent(new CustomEvent('reader:animate-selection',{detail:{padding:parseFloat(getComputedStyle(root).fontSize)*.3,resolve}})));
      if(token!==version)return;
      await perform(index,saved);
      root.dispatchEvent(new Event('reader:clear-selection'));
    }catch{tell('This action could not be completed. Please try again.');}
    close();if(action.id!=='comment')stage.focus({preventScroll:true});
  }
  let wheelPointer:number|undefined;
  items.forEach((item,i)=>{
    menu.querySelector<SVGElement>(`[data-visual="${i}"]`)!.style.setProperty('--wheel-colour',cfg.actions[i].colour);menu.querySelector<SVGElement>(`[data-visual="${i}"]`)!.style.setProperty('--wheel-text',cfg.actions[i].textColour);
    item.addEventListener('pointerenter',()=>{if(!busy&&!drag&&wheelPointer===undefined)hover(i);});item.addEventListener('focus',()=>hover(i));
    item.addEventListener('pointerdown',e=>{if(e.button===0&&!busy){
      e.preventDefault();wheelPointer=e.pointerId;hover(i);

    }});item.addEventListener('click',e=>{if(e.detail===0)void activate(i);});
    item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void activate(i);}else if(e.key.startsWith('Arrow')){e.preventDefault();const next=(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?3:1))%4;items[next].focus();}});
  });
  stage.addEventListener('contextmenu',event=>{if(root.dataset.activeTool==='Sketch Pad')return;const r=selection(false);if(!r)return;event.preventDefault();
    const eaty=document.querySelector<HTMLElement>('.frog-select-cursor:not([hidden]) image');
    const origin=eaty?.getBoundingClientRect(),line=r.getClientRects()[0];
    const x=origin?origin.left+origin.width/2:line.left-24,y=origin?origin.top+origin.height/2:line.top+line.height/2;
    open(event.clientX,event.clientY,r);elastic.jumpFrom(x,y);});
  stage.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||e.key==='F10'&&e.shiftKey){const r=selection();if(r){e.preventDefault();const rect=r.getBoundingClientRect();open(rect.left+rect.width/2,rect.bottom,r);items[0].focus();}}});
  // Sidebar whitespace and blank PDF space only. Text drags remain native selection.
  root.addEventListener('pointerdown',e=>{
    if(e.button!==0||root.dataset.activeTool==='Sketch Pad'||(root.dataset.activeTool==='Paced Reading'&&root.dataset.pacedPaused!=='true'))return;
    if(awaitingSelection){root.classList.add('is-grabbing-text');document.body.classList.add('is-grabbing-text');return;}
    if(busy||root.classList.contains('highlights-open'))return;
    const target=e.target as Element;
    if(target.closest('button,input,textarea,select,a,label,[data-comment-ui]'))return;
    // The full reading window includes the gutter and the empty space beneath the sidebar.
    if(!target.closest('.reading-window'))return;
    if(nearPdfText(stage,e.clientX,e.clientY))return;
    // Observe the press without consuming it: ordinary cursor dent and deselection run.
    down={x:e.clientX,y:e.clientY,id:e.pointerId,startedAt:performance.now(),range:selection(),threshold:cfg.dragDistanceEm*parseFloat(getComputedStyle(root).fontSize)};
  },true);
  window.addEventListener('pointermove',e=>{
    if(!down||e.pointerId!==down.id||!(e.buttons&1))return;
    const origin=down;
    if(!drag&&performance.now()-origin.startedAt<cfg.holdMs)return;
    const chosen=dragDirection(e.clientX-origin.x,e.clientY-origin.y,origin.threshold);
    if(!drag&&chosen<0)return;
    e.preventDefault();
    if(!drag){open(origin.x,origin.y,origin.range);down=origin;drag=true;root.setPointerCapture(origin.id);}
    // While held, update the chosen section but do not execute or close the wheel.
    hover(hitSection(e.clientX,e.clientY));
  },true);
  window.addEventListener('pointerup',e=>{
    if(wheelPointer===e.pointerId){wheelPointer=undefined;if(!menu.hidden&&!busy){const hit=hitSection(e.clientX,e.clientY);if(hit>=0)void activate(hit,{x:e.clientX,y:e.clientY});else void retractAndClose();}return;}
    if(awaitingSelection||pendingAction>=0){
      root.classList.remove('is-grabbing-text');document.body.classList.remove('is-grabbing-text');
      setTimeout(()=>{if(pendingAction>=0)finishDeferredSelection();},0);
    }
    if(!down||e.pointerId!==down.id)return;
    if(drag)e.preventDefault();
    const chosen=drag?hitSection(e.clientX,e.clientY):-1;
    const wasDragging=drag;releasePointer();down=undefined;drag=false;
    if(wasDragging){if(chosen>=0)void activate(chosen,{x:e.clientX,y:e.clientY});else void retractAndClose();}
    else {lastRange=undefined;root.dispatchEvent(new Event('reader:clear-selection'));}
  },true);
  window.addEventListener('click',e=>{if(drag||busy){e.preventDefault();e.stopImmediatePropagation();}},true);
  window.addEventListener('pointercancel',e=>{if(wheelPointer===e.pointerId){wheelPointer=undefined;close();}else if(down?.id===e.pointerId)close();},true);
  window.addEventListener('pointermove',e=>{
    if(menu.hidden||drag||busy||wheelPointer!==undefined)return;
    const b=menu.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*400-200,y=(e.clientY-b.top)/b.height*400-200;
    // Use the actual capsule hit regions, not the old rectangular ring bounds.
    const hit=cfg.actions.findIndex(action=>{
      const polygon=wheelOutline(action.angle);let inside=false;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[i],b=polygon[j];
        if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      }
      return inside;
    });
    hover(hit);
  },true);
  window.addEventListener('pointerdown',e=>{
    if(e.button!==0||menu.contains(e.target as Node))return;
    clearTimeout(restTimer);
    const target=e.target as Element;
    const blank=root.contains(target)&&!target.closest('button,input,textarea,select,a,label,[data-comment-ui]')&&!nearPdfText(stage,e.clientX,e.clientY);
    if((awaitingSelection||!menu.hidden||pendingAction>=0)&&blank){cancelAction();return;}
    if(pendingAction>=0){
      version++;busy=false;
      root.dispatchEvent(new Event('reader:cancel-selection-animation'));
      selectionPrompt(true);
    }
    if(!menu.hidden)close();
  },true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!menu.hidden||awaitingSelection||pendingAction>=0)){e.preventDefault();cancelAction();stage.focus({preventScroll:true});}},true);
  stage.addEventListener('scroll',()=>{if(!menu.hidden&&!drag)close();},{passive:true,capture:true});
  window.addEventListener('resize',close);window.addEventListener('blur',close);root.addEventListener('reader:highlights-open',close);
  return {reset(){clearOuch();cancelAction();message.hidden=true;}};
}
