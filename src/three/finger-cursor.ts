import * as THREE from 'three';
import {createPointingHand} from './pointing-hand';
export function mountFingerCursor(){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(40,45);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const canvas=renderer.domElement;canvas.className='finger-cursor';canvas.style.cssText='position:fixed;left:0;top:0;width:40px;height:45px;pointer-events:none;z-index:2147483647;display:none';document.body.append(canvas);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.3,.9,.2,-1.15,.1,10);camera.position.z=4;
 const hand=createPointingHand();scene.add(hand,new THREE.AmbientLight(0xffffff,2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,5,5);scene.add(key);
 const style=document.createElement('style');style.textContent='html.finger-visible,html.finger-visible body,html.finger-visible body #reader,html.finger-visible body #reader *,html.finger-visible body *,html.finger-visible body #reader .tool-settings *{cursor:none!important}';document.head.append(style);
 let x=0,y=0,visible=false,held=false,value=0,frame=0,last=0,pressUntil=0;
 function draw(now:number){frame=0;const dt=Math.min(.04,(now-last)/1000||.016);last=now;const target=held||now<pressUntil?1:0;value=THREE.MathUtils.damp(value,target,held?22:14,dt);hand.traverse(o=>{if(o instanceof THREE.Mesh&&o.morphTargetInfluences)o.morphTargetInfluences[0]=value;});renderer.render(scene,camera);if(Math.abs(value-target)>.001||now<pressUntil)frame=requestAnimationFrame(draw);}
 function paint(){if(!frame)frame=requestAnimationFrame(draw);}
 function position(e:PointerEvent){x=e.clientX;y=e.clientY;const target=e.target as Element;const drawing=document.querySelector('#reader')?.getAttribute('data-active-tool')==='Sketch Pad'&&!!target.closest?.('.section-reading-pane')&&!target.closest?.('button,input,textarea');visible=e.pointerType!=='touch'&&!drawing;canvas.style.display=visible?'block':'none';document.documentElement.classList.toggle('finger-visible',visible);canvas.style.transform=`translate(${x-10}px,${y-2.92}px)`;paint();}
 window.addEventListener('pointermove',position,true);window.addEventListener('pointerdown',e=>{position(e);if(e.button===0){held=true;pressUntil=performance.now()+140;paint();}},true);
 window.addEventListener('pointerup',()=>{held=false;paint();},true);window.addEventListener('pointercancel',()=>{held=false;paint();},true);
 const hide=()=>{held=false;visible=false;canvas.style.display='none';document.documentElement.classList.remove('finger-visible');};window.addEventListener('blur',hide);document.documentElement.addEventListener('pointerleave',hide);paint();
}
