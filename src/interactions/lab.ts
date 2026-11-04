import {applyEatyImage} from '../three/eaty-art';
import {createPointingHand} from '../three/pointing-hand';
import {nearPdfText} from './text-hit';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as THREE from 'three';
import { loadModel, morph } from './models';
import { selectionLines } from './highlight';
import { settings, Spring } from './settings';
import './lab.css';
import { TextSelection } from './text-selection';
import { WrappedHighlight } from './wrapped-highlight';
import { SelectedText } from './selected-text';
import { hoverHeight, CURSOR_RESIZE_SPEED } from './highlight-layout';

export async function startLab(){
  const stage=document.getElementById('page-stage')!;
  const toolbar=document.createElement('div');toolbar.className='lab-toolbar';
  toolbar.innerHTML=`<strong>Interaction trial</strong><label><input id="squishy-on" type="checkbox" checked> Squishy cursor</label><label>Ruler <select id="ruler-mode"><option value="off">Off</option><option value="ticket">Ticket V2</option></select></label><button id="clear-effects">Clear selection</button><button id="tune-effects">Tune</button><span id="lab-status" role="status">Loading models…</span>`;
  document.querySelector('.reader-toolbar')!.after(toolbar);
  const panel=document.createElement('aside');panel.className='tuning';panel.hidden=true;panel.innerHTML='<strong>Live tuning</strong><p>Changes last for this session. Defaults live in settings.ts.</p>';
  for(const [key,label,min,max,step] of [
    ['cursorSize','Cursor size',16,60,1],['pressDepth','Press strength',0,1.2,.05],['highlightOpacity','Centre opacity',.05,.8,.05],['shoulderOpacity','Shoulder opacity',.1,1,.05],['rulerPull','Ticket pull / row offset',0,40,1],['letterDepth','Letter depth',.2,4,.2],['springStiffness','Return stiffness',60,400,10],['springDamping','Return damping',8,40,1]
  ] as const){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(settings[key]);const value=document.createElement('output');value.textContent=input.value;input.oninput=()=>{settings[key]=Number(input.value);value.textContent=input.value;selectionDirty=true;};row.append(input,value);panel.append(row);}
  document.body.append(panel);document.getElementById('tune-effects')!.onclick=()=>panel.hidden=!panel.hidden;
  const status=(s:string)=>document.getElementById('lab-status')!.textContent=s;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}catch{status('WebGL unavailable — native reader still works.');return;}
  renderer.localClippingEnabled=true;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.domElement.className='interaction-canvas';renderer.domElement.setAttribute('aria-hidden','true');document.body.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,innerWidth,innerHeight,0,-1000,1000);camera.position.z=500;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
  const pmrem=new THREE.PMREMGenerator(renderer),studio=new RoomEnvironment();
  scene.environment=pmrem.fromScene(studio,.04).texture;studio.dispose();pmrem.dispose();
  scene.add(new THREE.AmbientLight(0xffffff,.35));
  const light=new THREE.DirectionalLight(0xfff6eb,2.2);light.position.set(-300,800,800);scene.add(light);
  let savedRange:Range|null=null,selectionDirty=false;
  const resize=()=>{renderer.setSize(innerWidth,innerHeight);camera.right=innerWidth;camera.top=innerHeight;camera.updateProjectionMatrix();selectionDirty=true;};resize();window.addEventListener('resize',resize);
  const place=(obj:THREE.Object3D,x:number,y:number,z=10)=>obj.position.set(x,innerHeight-y,z);
  let round:THREE.Group,red:THREE.Group,ticket:THREE.Group,anchor:THREE.Group;
  try{[round,red,ticket,anchor]=await Promise.all([loadModel('round-button-click.glb','foam'),loadModel('red-squishy-block.glb','red'),loadModel('ticket-ruler-v2.glb','ruler'),loadModel('squishy-anchor.glb','foam')]);}
  catch(e){status('A model could not load. Native reading remains available.');console.error(e);return;}
  status('Drag text to highlight · click a row with ruler on');
  round.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];const tinted=materials.map(m=>{const copy=m.clone();if(copy instanceof THREE.MeshStandardMaterial)copy.color.set(settings.cursorColor);return copy;});o.material=Array.isArray(o.material)?tinted:tinted[0];}});
  const hand=createPointingHand();scene.add(hand);
  scene.add(round,ticket,anchor);ticket.visible=round.visible=anchor.visible=false;
  // The cursor uses the Blender button mesh. Highlights use a runtime strip to fit any text length.
  const cursorPress=new Spring();let pointer={x:0,y:0},inside=false,down=false;let enabled=true;
  const glow=document.createElement('div');glow.className='ruler-shadow';glow.hidden=true;document.body.append(glow);
  const rowLayer=document.createElement('div');rowLayer.className='ruler-row';rowLayer.hidden=true;document.body.append(rowLayer);
  let rulerMode='off',rowRect:DOMRect|null=null;const rowSpring=new Spring();
  const strips=new THREE.Group(),letters=new THREE.Group(),masks=new THREE.Group();scene.add(strips,letters,masks);
  const textSelection=new TextSelection(stage);
  const transitions=new Map<number,WrappedHighlight>();
  const selectedText=new SelectedText(stage);
  const reader=document.getElementById('reader')!;
  const frogCursor=document.createElement('div');frogCursor.className='frog-select-cursor';frogCursor.setAttribute('aria-hidden','true');
  frogCursor.hidden=true;
  frogCursor.innerHTML='<svg viewBox="0 0 84 48"><image x="36" y="0" width="48" height="48" transform="rotate(-90 60 24)"/></svg>';
  let highlightOrigin={x:0,y:0};
  let eatyAnchor:{x:number;y:number;backwards:boolean;slot:HTMLElement|null;u:number;v:number}|null=null;
  applyEatyImage(frogCursor.querySelector('image')!);
  document.body.append(frogCursor);
  let feedback:{start:number;padding:number;resolve:()=>void}|null=null;
  function cancelFeedback(){const previous=feedback;feedback=null;if(previous)for(const t of transitions.values())t.setFeedback();previous?.resolve();}
  reader.addEventListener('reader:cancel-selection-animation',cancelFeedback);
  reader.addEventListener('reader:animate-selection',event=>{
    cancelFeedback();const detail=(event as CustomEvent<{padding:number;resolve:()=>void}>).detail;
    feedback={start:performance.now(),padding:detail.padding,resolve:detail.resolve};
  });
  let pending:WrappedHighlight|null=null;
  let cursorHeight=settings.cursorSize;
  let releasing:{transition:WrappedHighlight;spring:Spring;start:number;x:number;y:number}[]=[];
  function disposeGroup(group:THREE.Group){for(const o of [...group.children]){o.traverse(c=>{if(c instanceof THREE.Mesh){c.geometry.dispose();const ms=Array.isArray(c.material)?c.material:[c.material];ms.forEach(m=>m.dispose());}});group.remove(o);}}
  let highlightHold:ReturnType<typeof setTimeout>|undefined;
  function cancelHighlightHold(){clearTimeout(highlightHold);highlightHold=undefined;}
  function clearSelection(){
    cancelHighlightHold();
    const first=savedRange&&!savedRange.collapsed?selectionLines(savedRange)[0]:undefined;
    const retractX=first?first.left-12:highlightOrigin.x,retractY=innerHeight-(first?first.top+first.height/2:highlightOrigin.y);
    down=false;cursorPress.target=0;selectionDirty=false;
    cancelFeedback();
    selectedText.clear();savedRange=null;window.getSelection()?.removeAllRanges();disposeGroup(letters);disposeGroup(masks);
    textSelection.end();
    pending?.dispose();pending=null;
    for(const transition of transitions.values()){scene.add(transition.root);const spring=new Spring();spring.value=1;spring.target=0;releasing.push({transition,spring,start:performance.now(),x:retractX,y:retractY});}transitions.clear();
    rowSpring.target=0;stage.classList.toggle('squishy-selection',enabled);
  }
  document.getElementById('clear-effects')!.onclick=clearSelection;
  document.getElementById('squishy-on')!.onchange=e=>{enabled=(e.target as HTMLInputElement).checked;if(!enabled)clearSelection();};
  document.getElementById('ruler-mode')!.onchange=e=>{rulerMode=(e.target as HTMLSelectElement).value;clearSelection();};
  // Maintain semantic DOM buttons and their native keyboard/focus behaviour.
  const controls:{el:HTMLButtonElement;model:THREE.Group;spring:Spring}[]=[];
  document.querySelectorAll<HTMLButtonElement>('button:not(#dismiss-error):not([data-native-control])').forEach(el=>{
    const model=(el.classList.contains('icon-button')?round:red).clone(true);scene.add(model);const spring=new Spring();controls.push({el,model,spring});el.classList.add('squishy-control');
    el.addEventListener('pointerdown',()=>spring.target=1);el.addEventListener('pointerleave',()=>spring.target=0);
    el.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')spring.target=1;});el.addEventListener('keyup',()=>spring.target=0);
  });
  window.addEventListener('pointerup',()=>{
    cancelHighlightHold();
    const sel=window.getSelection();
    if(sel?.rangeCount&&stage.contains(sel.anchorNode)&&stage.contains(sel.focusNode)&&!sel.isCollapsed){savedRange=sel.getRangeAt(0).cloneRange();rebuildSelection();}
    textSelection.end();pending?.dispose();pending=null;down=false;cursorPress.target=0;controls.forEach(c=>c.spring.target=0);selectionDirty=true;});
  window.addEventListener('blur',()=>{cancelHighlightHold();textSelection.end();down=false;inside=false;cursorPress.target=0;controls.forEach(c=>c.spring.target=0);});
  const home=document.getElementById('home')!;
  let readerInside=false;
  window.addEventListener('pointermove',e=>{if(reader.classList.contains('selection-wheel-open'))pointer={x:e.clientX,y:e.clientY};});
  reader.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;readerInside=true;pointer={x:e.clientX,y:e.clientY};});
  reader.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;readerInside=true;pointer={x:e.clientX,y:e.clientY};});
  reader.addEventListener('pointerleave',()=>{readerInside=false;});
  reader.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType!=='touch')cursorPress.target=1;});
  reader.addEventListener('pointercancel',()=>{cancelHighlightHold();textSelection.end();down=false;readerInside=false;cursorPress.target=0;});
  window.addEventListener('blur',()=>{readerInside=false;});
  let homeInside=false;
  home.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;homeInside=true;pointer={x:e.clientX,y:e.clientY};});
  home.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;homeInside=true;pointer={x:e.clientX,y:e.clientY};});
  home.addEventListener('pointerleave',()=>{homeInside=false;});
  home.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch')return;pointer={x:e.clientX,y:e.clientY};cursorPress.target=1;});
  home.addEventListener('pointercancel',()=>{homeInside=false;cursorPress.target=0;});
  window.addEventListener('blur',()=>{homeInside=false;});
  stage.addEventListener('pointerenter',e=>{inside=true;pointer={x:e.clientX,y:e.clientY};});stage.addEventListener('pointerleave',()=>inside=false);
  stage.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};if(textSelection.active){e.preventDefault();textSelection.move(e.clientX,e.clientY);}if(down)selectionDirty=true;});
  reader.addEventListener('pointerdown',e=>{
    if(reader.dataset.activeTool==='Sketch Pad'||(reader.dataset.activeTool==='Paced Reading'&&reader.dataset.pacedPaused!=='true'))return;
    const target=e.target as Element;
    if(target.closest('button,input,textarea,select,a,label,[data-comment-ui]'))return;
    if(!stage.contains(target)&&!nearPdfText(stage,e.clientX,e.clientY))return;
    if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY};down=true;cursorPress.target=1;
    clearSelection();
    if(rulerMode!=='off'){e.preventDefault();selectRow(e.clientY);}
    else if(enabled){
      e.preventDefault();const start={x:e.clientX,y:e.clientY,id:e.pointerId};
      highlightHold=setTimeout(()=>{
        highlightHold=undefined;
        if(reader.hidden||reader.inert||!enabled)return;
        if(textSelection.begin(start.x,start.y)){
          down=true;highlightOrigin={x:start.x,y:start.y};eatyAnchor=null;
          stage.setPointerCapture(start.id);
          pending=new WrappedHighlight(anchor,start.x,start.y,cursorPress.value,cursorHeight);strips.add(pending.root);
          textSelection.move(pointer.x,pointer.y);selectionDirty=true;
        }
      },220);
    }
  });
  window.addEventListener('keydown',e=>{if(e.key==='Escape')clearSelection();});
  document.getElementById('back-home')!.addEventListener('click',()=>{clearSelection();inside=false;});
  document.addEventListener('reader:page-rendered',()=>{clearSelection();});
  reader.addEventListener('reader:highlights-open',clearSelection);
  reader.addEventListener('reader:clear-selection',clearSelection);
  reader.addEventListener('reader:select-continuation',event=>{
    clearSelection();eatyAnchor=null;
    const range=(event as CustomEvent<{range:Range}>).detail.range;
    const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
    savedRange=range.cloneRange();enabled=true;rebuildSelection();selectionDirty=true;
  });
  // Scroll changes screen coordinates, not the selected DOM Range.
  document.addEventListener('scroll',()=>{selectionDirty=true;},true);
  stage.addEventListener('pointercancel',clearSelection);
  document.addEventListener('selectionchange',()=>{
    const sel=window.getSelection();if(sel?.rangeCount&&stage.contains(sel.anchorNode)&&stage.contains(sel.focusNode)&&sel.toString().trim()){savedRange=sel.getRangeAt(0).cloneRange();selectionDirty=true;}
    else if(savedRange){savedRange=null;selectionDirty=true;}
  });
  function selectRow(y:number){
    const spans=Array.from(stage.querySelectorAll<HTMLElement>('.textLayer span')).filter(el=>el.textContent?.trim());
    const hit=spans.find(el=>{const r=el.getBoundingClientRect();return y>=r.top-3&&y<=r.bottom+3;});if(!hit)return;
    const hr=hit.getBoundingClientRect();const same=spans.map(el=>el.getBoundingClientRect()).filter(r=>Math.abs(r.top-hr.top)<hr.height*.5);
    const left=Math.min(...same.map(r=>r.left)),right=Math.max(...same.map(r=>r.right));rowRect=new DOMRect(left,hr.top,right-left,hr.height);rowSpring.target=1;
    // Pixel-perfect copy of the actual PDF row preserves fonts and graphics.
    const source=stage.querySelector<HTMLCanvasElement>('.pdf-page > canvas');if(!source)return;
    const pr=source.getBoundingClientRect(),r=rowRect,ratio=source.width/pr.width;
    const copy=document.createElement('canvas');copy.width=Math.ceil(r.width*ratio);copy.height=Math.ceil(r.height*ratio);copy.style.width=r.width+'px';copy.style.height=r.height+'px';
    copy.getContext('2d')!.drawImage(source,(r.left-pr.left)*ratio,(r.top-pr.top)*ratio,r.width*ratio,r.height*ratio,0,0,copy.width,copy.height);
    // Remove only white paper from the row copy, leaving the ticket shading visible.
    const ctx=copy.getContext('2d')!,pixels=ctx.getImageData(0,0,copy.width,copy.height);
    for(let i=0;i<pixels.data.length;i+=4){const whiteness=Math.min(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);pixels.data[i+3]=255-whiteness;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=0;}
    ctx.putImageData(pixels,0,0);
    rowLayer.replaceChildren(copy);rowLayer.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;rowLayer.hidden=false;
  }
  function rebuildSelection(){
    selectionDirty=false;disposeGroup(letters);disposeGroup(masks);stage.classList.toggle('squishy-selection',enabled);
    const rects=savedRange&&enabled?selectionLines(savedRange):[];
    if(!rects.length){selectedText.clear();for(const t of transitions.values())t.dispose();transitions.clear();return;}
    let transition=transitions.get(0);
    if(!transition){transition=pending??new WrappedHighlight(anchor,pointer.x,pointer.y,cursorPress.value,cursorHeight);pending=null;transitions.set(0,transition);strips.add(transition.root);}
    const selection=window.getSelection();
    const backwards=!!selection&&!!savedRange&&(selection.anchorNode!==savedRange.startContainer||selection.anchorOffset!==savedRange.startOffset);
        if(!eatyAnchor){const initial=backwards?rects[rects.length-1]:rects[0];const x=backwards?initial.left+initial.width:initial.left,y=initial.top+initial.height/2;const node=selection?.anchorNode;const slot=(node instanceof Element?node:node?.parentElement)?.closest<HTMLElement>('.pdf-slot')??null;const b=slot?.getBoundingClientRect();eatyAnchor={x,y,backwards,slot,u:b?(x-b.left)/b.width:0,v:b?(y-b.top)/b.height:0};}
    transition.setRows(rects.map((row,i)=>backwards?(i===rects.length-1?{...row,width:row.width+30}:row):(i===0?{...row,left:row.left-30,width:row.width+30}:row)),backwards?-1:1);
    selectedText.update(rects);
  }

  let last=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let lastHomeFrame='',hoverKey='',cachedHoverHeight=settings.cursorSize;
  let scrollRevision=0;stage.addEventListener('scroll',()=>scrollRevision++,{passive:true,capture:true});
  function tick(now:number){
    if(document.hidden||document.body.classList.contains('catch-open')){last=now;requestAnimationFrame(tick);return;}
    const dt=Math.min(.04,(now-last)/1000);last=now;
    const readerVisible=!document.getElementById('reader')!.hidden;
    const frogCursorActive=readerVisible&&!reader.inert&&enabled&&(textSelection.active||feedback!==null||!!savedRange&&!savedRange.collapsed||releasing.length>0)&&!reader.classList.contains('selection-wheel-open');
    reader.classList.toggle('squishy-cursor-active',frogCursorActive);
    frogCursor.hidden=!frogCursorActive;
    if(eatyAnchor?.slot?.isConnected){const b=eatyAnchor.slot.getBoundingClientRect();eatyAnchor.x=b.left+eatyAnchor.u*b.width;eatyAnchor.y=b.top+eatyAnchor.v*b.height;}
    const activePane=eatyAnchor?.slot?.closest('.section-reading-pane');
    const bounds=activePane?.getBoundingClientRect();
    const clip=bounds?`inset(${Math.max(0,bounds.top+1)}px ${Math.max(0,innerWidth-bounds.right+1)}px ${Math.max(0,innerHeight-bounds.bottom+1)}px ${Math.max(0,bounds.left+1)}px)`:'none';
    renderer.domElement.style.clipPath=clip;selectedText.setClip(clip);
    if(bounds&&eatyAnchor)frogCursor.hidden=frogCursor.hidden||eatyAnchor.y<bounds.top+24||eatyAnchor.y>bounds.bottom-24;
    const cursorX=eatyAnchor?.x??highlightOrigin.x,cursorY=eatyAnchor?.y??highlightOrigin.y,reverse=eatyAnchor?.backwards??false;
    const halfLS=parseFloat(getComputedStyle(reader).fontSize)*.325;
    frogCursor.style.left=`${reverse?cursorX-48:cursorX-72}px`;frogCursor.style.top=`${cursorY-24}px`;
    frogCursor.querySelector('image')!.setAttribute('transform',`rotate(${reverse?90:-90} 60 24)`);
    const homeCursor=!home.hidden&&homeInside&&enabled;
    home.classList.toggle('squishy-cursor-active',homeCursor);
    if(selectionDirty)rebuildSelection();
    const pressValue=Math.max(0,cursorPress.step(dt,reduced.matches));
    if(feedback){
      const elapsed=reduced.matches?430:now-feedback.start,t=Math.min(1,elapsed/430);
      const expansion=t<.22?-.25*t/.22:t<.58?-.25+1.25*(t-.22)/.36:1-(t-.58)/.42;
      for(const transition of transitions.values())transition.setFeedback(feedback.padding*expansion,0,1);
      if(t>=1){const done=feedback;feedback=null;done.resolve();}

    }
    pending?.tick(dt,now,reduced.matches);for(const transition of transitions.values())transition.tick(dt,now,reduced.matches);
    const nextHoverKey=[inside,pointer.x,pointer.y,scrollRevision].join('/');
    if(nextHoverKey!==hoverKey){hoverKey=nextHoverKey;cachedHoverHeight=inside?hoverHeight(stage,pointer.x,pointer.y):settings.cursorSize;}
    const targetHeight=cachedHoverHeight;
    cursorHeight=reduced.matches?targetHeight:THREE.MathUtils.damp(cursorHeight,targetHeight,CURSOR_RESIZE_SPEED,dt);
    round.visible=reader.dataset.activeTool!=='Checker'&&reader.dataset.activeTool!=='Sketch Pad'&&!document.body.classList.contains('paced-tool-active')&&!document.body.classList.contains('paced-awaiting')&&!document.body.classList.contains('tool-slider-active')&&!reader.classList.contains('selection-wheel-open')&&!reader.classList.contains('awaiting-text-selection')&&(homeCursor||(readerVisible&&(readerInside||reader.classList.contains('selection-wheel-open'))&&enabled&&!pending));
    hand.visible=false;round.visible=false;
    if(hand.visible){place(hand,pointer.x,pointer.y,30);const size=settings.cursorSize*1.25;hand.scale.set(size,size*(1-pressValue*.06),size*(1-pressValue*.18));}
    // Selection rectangles are the single source of truth, during drag and after release.
    // The anchor is a hidden template, never a second free-floating highlight.
    anchor.visible=false;
    if(down&&savedRange&&!savedRange.collapsed)hand.visible=false;
    if(!down&&!savedRange&&transitions.size)clearSelection();
    if(readerVisible)for(const c of controls){const r=c.el.getBoundingClientRect();c.model.visible=r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&!c.el.disabled;const v=c.spring.step(dt,reduced.matches);if(c.model.visible){place(c.model,r.left+r.width/2,r.top+r.height/2,15);c.model.scale.set(r.width,r.height/(c.model.userData.aspect||.4),Math.min(r.width,60));morph(c.model,'Sponge_Press',Math.max(0,v)*settings.pressDepth);morph(c.model,'Finger_Press',Math.max(0,v)*settings.pressDepth);}}
    else for(const c of controls)c.model.visible=false;
    const pull=rowSpring.step(dt,reduced.matches);ticket.visible=false;
    if(rowRect&&rowSpring.target===0&&Math.abs(pull)<.008&&Math.abs(rowSpring.velocity)<.03){rowRect=null;rowLayer.hidden=true;glow.hidden=true;}
    if(readerVisible&&rowRect){const r=rowRect,model=ticket;model.visible=rulerMode!=='off';const width=r.width+130;const heightScale=(r.height+18)/(model.userData.aspect||.15);model.scale.set(width,heightScale,heightScale);place(model,r.left+r.width/2+34,r.top+r.height/2,3);morph(model,'Select_Pull_Left',pull*.45);const c=rowLayer.firstElementChild as HTMLElement|null;if(c)c.style.transform=`translateX(${-pull*settings.rulerPull}px)`;glow.hidden=false;glow.style.cssText=`left:${r.left-8}px;top:${r.top-5}px;width:${r.width+16}px;height:${r.height+10}px`;}
    for(const item of releasing){const p=reduced.matches?1:Math.min(1,(now-item.start)/item.transition.retractDuration);item.spring.value=1-p;item.transition.retract(p);if(p===1)item.transition.dispose();}
    releasing=releasing.filter(item=>item.spring.value>0);

    strips.visible=letters.visible=masks.visible=readerVisible;
    const homeFrame=[hand.visible,pointer.x,pointer.y,Math.round(pressValue*1000),Math.round(cursorHeight*100)].join('/');
    if(homeFrame!==lastHomeFrame||pending||[...transitions.values()].some(t=>t.isAnimating)||releasing.length||rowRect||controls.some(c=>Math.abs(c.spring.value-c.spring.target)>.001)){renderer.render(scene,camera);lastHomeFrame=homeFrame;}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // Read-only diagnostics for manual/automated trial checks.
  (window as any).__readingLab={settings,scene,clearSelection,get state(){return {highlightLines:strips.children.length,raisedLetters:letters.children.length,rulerMode,modelsReady:true};}};
}
