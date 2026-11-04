import {colourCycle,colourNames} from '../../config/palette';
import {mountButtonToolSettings} from './button-tool-settings';
import {eraserIcon} from '../../three/eraser-icon';
import * as THREE from 'three';
import {cushionMaterial} from '../../three/cushion';
import '../../styles/pages/tool-settings.css';
function mountPanel(root:HTMLElement,stack:HTMLElement,toolName:string){
 if(toolName==='Checker'||toolName==='Connections')return mountButtonToolSettings(root,stack,toolName);
 const panel=document.createElement('section');panel.className='tool-settings';panel.hidden=true;panel.dataset.nativeControl='';panel.setAttribute('aria-label',`${toolName} settings`);panel.dataset.tool=toolName;panel.tabIndex=0;
 panel.innerHTML=`<h2></h2><div class="tool-palette" role="group" aria-label="Colour"></div><div class="tool-opacity-row"><input class="tool-opacity" aria-label="Opacity" type="range" min="1" max="100" value="100"><input class="tool-percent" aria-label="Opacity percentage" type="number" min="1" max="100" value="100"><span>%</span></div><input class="tool-stroke" aria-label="Stroke width" type="range" min="0.1" max="1.5" step="0.01" value="1">`;
 stack.append(panel);
 const paceRow=document.createElement('div');paceRow.className='tool-pace-row';paceRow.hidden=true;paceRow.innerHTML='<input class="tool-pace" aria-label="Reading speed" type="range" min="60" max="500" value="200"><input class="tool-wpm" aria-label="Words per minute" type="number" min="60" max="500" value="200"><span>WPM</span>';panel.append(paceRow);
 const pace=paceRow.querySelector<HTMLInputElement>('.tool-pace')!,wpm=paceRow.querySelector<HTMLInputElement>('.tool-wpm')!;
 const colours=[...colourCycle,'#151410'];
 const names=[...colourNames,'Black'];
 const states=new Map<string,{colour:string;opacity:number;stroke:number;wpm:number;erase?:boolean}>(),enabled=new Set<string>();let active='';
 const opacity=panel.querySelector<HTMLInputElement>('.tool-opacity')!,percent=panel.querySelector<HTMLInputElement>('.tool-percent')!,stroke=panel.querySelector<HTMLInputElement>('.tool-stroke')!;
 const strokeRow=document.createElement('div');strokeRow.className='tool-stroke-row';stroke.replaceWith(strokeRow);strokeRow.append(stroke);
 const triangle=document.createElement('button');triangle.type='button';triangle.className='tool-stroke-handle';triangle.dataset.nativeControl='';triangle.setAttribute('aria-label','Drag to adjust pen width');strokeRow.append(triangle);
 const setStroke=(x:number)=>{const rect=stroke.getBoundingClientRect();const probe=document.createElement('span');probe.style.width='var(--tip-size)';probe.style.position='absolute';panel.append(probe);const diameter=probe.getBoundingClientRect().width;probe.remove();const value=.1+Math.max(0,Math.min(1,(x-rect.left-diameter/2)/Math.max(1,rect.width-diameter)))*1.4;states.get(active)!.stroke=Math.round(value*100)/100;sync();};
 triangle.addEventListener('pointerdown',e=>{e.preventDefault();triangle.setPointerCapture(e.pointerId);setStroke(e.clientX);});
 triangle.addEventListener('pointermove',e=>{if(triangle.hasPointerCapture(e.pointerId))setStroke(e.clientX);});
 triangle.addEventListener('pointerup',e=>{if(triangle.hasPointerCapture(e.pointerId))triangle.releasePointerCapture(e.pointerId);});
 triangle.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();states.get(active)!.stroke=Math.max(.1,Math.min(1.5,states.get(active)!.stroke+(e.key==='ArrowRight'?.05:-.05)));sync();}});
 // Bake once with the same PU material; no animation loop or GL context per swatch.
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(64,64);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.1,1.1,1.1,-1.1,.1,10);camera.position.z=4;
 const geometry=new THREE.SphereGeometry(1,32,24),mesh=new THREE.Mesh(geometry,cushionMaterial(colours[0]));scene.add(mesh);scene.add(new THREE.AmbientLight(0xffffff,1));
 const buttons=colours.map((colour,i)=>{mesh.material.dispose();mesh.material=cushionMaterial(colour);renderer.render(scene,camera);const button=document.createElement('button');button.type='button';button.dataset.nativeControl='';button.style.setProperty('--swatch',colour);button.setAttribute('aria-label',names[i]);button.innerHTML=`<img alt="" src="${renderer.domElement.toDataURL()}">`;panel.querySelector('.tool-palette')!.append(button);button.onclick=()=>{states.get(active)!.colour=colour;states.get(active)!.erase=false;sync();};return button;});
 geometry.dispose();mesh.material.dispose();renderer.dispose();renderer.forceContextLoss();
 const eraser=document.createElement('button');eraser.type='button';eraser.className='tool-eraser';eraser.dataset.nativeControl='';eraser.setAttribute('aria-label','Eraser');eraser.setAttribute('aria-pressed','false');eraser.innerHTML='<span class="eraser-body"><span class="eraser-wrap"></span></span>';
 if(toolName==='Sketch Pad'){const img=document.createElement('img');img.src=eraserIcon();img.alt='';eraser.append(img);panel.querySelector('.tool-palette')!.append(eraser);}
 eraser.onclick=()=>{const state=states.get(active)!;state.erase=!state.erase;sync();};
 function sync(){if(!active)return;const state=states.get(active)!;const paced=active==='Paced Reading';paceRow.hidden=!paced;panel.querySelector<HTMLElement>('.tool-opacity-row')!.hidden=paced;strokeRow.hidden=paced;stroke.hidden=paced;pace.value=wpm.value=String(state.wpm);buttons[8].hidden=false;panel.querySelector('h2')!.textContent=`${active.toUpperCase()} SETTING`;panel.style.setProperty('--tool-colour',state.erase?'#bdbec1':state.colour);eraser.setAttribute('aria-pressed',String(!!state.erase));opacity.setAttribute('aria-label',state.erase?'Eraser strength':'Opacity');percent.setAttribute('aria-label',state.erase?'Eraser strength percentage':'Opacity percentage');panel.style.setProperty('--tool-alpha',String(state.opacity/100));panel.style.setProperty('--tip-size',`calc(var(--reader-ls) * ${state.stroke})`);opacity.value=percent.value=String(state.opacity);stroke.value=String(state.stroke);const fraction=(state.stroke-.1)/1.4;triangle.style.left=`calc(${fraction*100}% + (${.5-fraction} * var(--tip-size)))`;triangle.setAttribute('aria-valuetext',`${state.stroke} LS`);buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(!state.erase&&colours[i]===state.colour)));root.dispatchEvent(new CustomEvent('reader:tool-settings',{bubbles:true,detail:{tool:active,...state,strokeLS:state.stroke}}));}
 pace.oninput=()=>{states.get(active)!.wpm=+pace.value;sync();};wpm.onchange=()=>{states.get(active)!.wpm=Math.max(60,Math.min(500,Math.round(+wpm.value||200)));sync();};
 opacity.oninput=()=>{states.get(active)!.opacity=+opacity.value;sync();};percent.onchange=()=>{states.get(active)!.opacity=Math.max(1,Math.min(100,+percent.value||1));sync();};stroke.oninput=()=>{states.get(active)!.stroke=+stroke.value;sync();};
 root.addEventListener('reader:tool-toggle',event=>{const {tool,selected}=(event as CustomEvent).detail;if(tool!==toolName)return;if(selected){enabled.add(tool);active=tool;if(!states.has(tool))states.set(tool,{colour:tool==='Paced Reading'?'#f7c9de':'#151410',opacity:100,stroke:1,wpm:200});}else{enabled.delete(tool);if(active===tool)active=[...enabled].at(-1)??'';}panel.hidden=!active;sync();});
 panel.addEventListener('pointerdown',()=>{if(!panel.hidden)root.dispatchEvent(new CustomEvent('reader:tool-activate',{detail:{tool:toolName}}));});
 panel.addEventListener('keydown',event=>{if(event.target===panel&&(event.key==='Enter'||event.key===' ')){event.preventDefault();root.dispatchEvent(new CustomEvent('reader:tool-activate',{detail:{tool:toolName}}));}});
 const arrow=(on:boolean)=>document.body.classList.toggle('tool-slider-active',on);
 panel.addEventListener('pointerenter',()=>arrow(true));panel.addEventListener('pointerleave',()=>{if(!panel.matches(':active'))arrow(false);});window.addEventListener('pointerup',()=>arrow(!!stack.querySelector('.tool-settings:not([hidden]):hover')));
 return {reset(){enabled.clear();active='';panel.hidden=true;arrow(false);}};
}

export function mountToolSettings(root:HTMLElement){
 const stack=document.createElement('div');stack.className='tool-settings-stack';root.querySelector('.reading-window')!.append(stack);
 const panels=['Highlight','Sketch Pad','Paced Reading','Checker','Connections'].map(tool=>mountPanel(root,stack,tool));
 root.addEventListener('reader:highlights-open',()=>root.dispatchEvent(new CustomEvent('reader:tool-toggle',{detail:{tool:'Highlight',selected:true}})));
 let current:string|null=null;let expandy:Animation|undefined;
 function activate(tool:string|null){
  const target=tool?stack.querySelector<HTMLElement>(`[data-tool="${tool}"]`):null;
  if(tool&&(!target||target.hidden))return;
  if(current===tool)return;
  current=tool;root.dataset.activeTool=tool??'';
  stack.querySelectorAll<HTMLElement>('.tool-settings').forEach(panel=>{const chosen=panel===target;panel.classList.toggle('is-active-tool',chosen);});
  expandy?.cancel();
  if(target&&!matchMedia('(prefers-reduced-motion: reduce)').matches)expandy=target.animate([{transform:'scale(1)'},{transform:'scale(.97,.94)',offset:.22},{transform:'scale(1.04,1.08)',offset:.58},{transform:'scale(1)'}],{duration:430,easing:'cubic-bezier(.22,.7,.2,1)'});
  root.dispatchEvent(new CustomEvent('reader:active-tool-change',{detail:{tool}}));
 }
 root.addEventListener('reader:tool-activate',event=>activate((event as CustomEvent).detail.tool));
 root.addEventListener('reader:tool-toggle',event=>{const {tool,selected}=(event as CustomEvent).detail;if(selected)activate(tool);else if(current===tool)activate(null);});
 const position=()=>{const box=root.querySelector<HTMLElement>('.page-stage');if(box){const r=box.getBoundingClientRect(),w=stack.parentElement!.getBoundingClientRect();stack.style.bottom=`${Math.max(0,w.bottom-r.bottom)}px`;}};
 new ResizeObserver(position).observe(root.querySelector('.page-stage')!);window.addEventListener('resize',position);
 return {reset(){activate(null);panels.forEach(p=>p.reset());}};
}
