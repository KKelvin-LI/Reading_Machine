import {playSound} from '../ui/sounds';
import * as THREE from 'three';
import {cushionMaterial} from './cushion';
const cache=new Map<string,string[]>();
/** Bake the actual foam meshes once; checkpoint badges need no persistent GL loop. */
function frames(base:string,colour:string,platformVisible=true){
 const key=base+colour+platformVisible;if(cache.has(key))return cache.get(key)!;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(platformVisible?96:256,platformVisible?96:256);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,20);camera.position.z=6;
 scene.add(new THREE.AmbientLight(0xffffff,1));
 const platformMat=cushionMaterial(base),mat=cushionMaterial(colour);
 // Flat foam platform with a soft bevel, rather than a spherical badge.
 const disk=new THREE.Shape();disk.absarc(0,0,.92,0,Math.PI*2,false);
 platformMat.normalScale.multiplyScalar(1.5);
 const platform=new THREE.Mesh(new THREE.ExtrudeGeometry(disk,{depth:.06,bevelEnabled:true,bevelSize:.07,bevelThickness:.045,bevelSegments:5,steps:1,curveSegments:48}),platformMat);
 platform.position.z=-.21;if(platformVisible)scene.add(platform);
 const shape=new THREE.Shape();shape.moveTo(-.37,-.48);shape.lineTo(.37,-.48);shape.quadraticCurveTo(.46,-.48,.46,-.37);shape.lineTo(.46,.12);shape.quadraticCurveTo(.46,.22,.35,.22);shape.lineTo(-.35,.22);shape.quadraticCurveTo(-.46,.22,-.46,.12);shape.lineTo(-.46,-.37);shape.quadraticCurveTo(-.46,-.48,-.37,-.48);
 const hole=new THREE.Path();hole.absarc(0,-.06,.075,0,Math.PI*2,true);shape.holes.push(hole);
 const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSize:.10,bevelThickness:.12,bevelSegments:8,steps:1,curveSegments:20}),mat);const positions=body.geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);if(z>=.14)positions.setZ(i,z+.14*Math.max(0,1-(x/.5)**2)*Math.max(0,1-((y+.13)/.43)**2));}
 body.geometry.computeVertexNormals();scene.add(body);
 // A recessed surface of the same material closes the keyhole, rather than white paint.
 const recess=new THREE.Mesh(new THREE.CircleGeometry(.08,24),mat);recess.position.set(0,-.06,-.035);scene.add(recess);
 const points=[new THREE.Vector3(-.28,.12,.05),new THREE.Vector3(-.28,.47,.05),new THREE.Vector3(0,.7,.05),new THREE.Vector3(.28,.47,.05),new THREE.Vector3(.28,.12,.05)];
 const shackle=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),40,.065,10,false),mat);const hinge=new THREE.Group();hinge.position.set(.28,.12,.05);shackle.position.set(-.28,-.12,-.05);hinge.add(shackle);scene.add(hinge);
 const target=new THREE.Color(colour),out:string[]=[];
 for(let i=0;i<=20;i++){const t=i/20;mat.color.copy(new THREE.Color('#bcbec0')).lerp(target,Math.min(1,t/.45));hinge.rotation.z=-Math.max(0,(t-.45)/.55)*.45;renderer.render(scene,camera);out.push(renderer.domElement.toDataURL());}
 scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});mat.dispose();platformMat.dispose();renderer.dispose();renderer.forceContextLoss();cache.set(key,out);return out;
}
export function renderProgressLock(el:HTMLElement,animate:boolean){
 const style=getComputedStyle(el),images=frames(style.getPropertyValue('--checkpoint-base').trim(),style.getPropertyValue('--checkpoint-colour').trim());
 const img=new Image();img.alt='';img.className='progress-lock-render';el.append(img);
 if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){img.src=images[20];return;}
 const start=performance.now();function tick(now:number){if(!el.isConnected)return;const t=Math.min(1,(now-start)/850);img.src=images[Math.round(t*20)];if(t<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);
}

/** The chapter cover uses the same inflated foam lock, without its progress platform. */
export async function animateChapterLock(cover:HTMLElement,colour:string){
 const images=frames(colour,colour,false),img=new Image();img.alt='Unlocking chapter';img.style.cssText='width:clamp(4rem,16%,8rem);height:auto';img.src=images[0];cover.replaceChildren(img);playSound('chapterUnlock');
 await new Promise<void>(resolve=>{const start=performance.now();function tick(now:number){if(!cover.isConnected){resolve();return;}const t=Math.min(1,(now-start)/870);img.src=images[Math.round(t*20)];if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
}

const replayImages=new Map<string,string>();
/** Same bevelled foam platform as the checkpoint circles, with a raised replay arrow. */
export function renderProgressReplay(el:HTMLElement,unlocked:boolean,baseColour:string,arrowColour:string){
 if(!unlocked){
  el.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="white" stroke="#151410" stroke-width="1"/><path d="M22 21a8 8 0 1 0-12 1M10 17v5h5" fill="none" stroke="#bcbec0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return;
 }
 const key=baseColour+arrowColour;let replayImage=replayImages.get(key);
 if(!replayImage){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(128,128);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,20);camera.position.z=6;scene.add(new THREE.AmbientLight(0xffffff,1));
  const base=cushionMaterial(baseColour),arrowMaterial=cushionMaterial(arrowColour);
  const disk=new THREE.Shape();disk.absarc(0,0,.92,0,Math.PI*2,false);
  const platform=new THREE.Mesh(new THREE.ExtrudeGeometry(disk,{depth:.06,bevelEnabled:true,bevelSize:.07,bevelThickness:.045,bevelSegments:5,steps:1,curveSegments:48}),base);platform.position.z=-.21;scene.add(platform);
  const points:THREE.Vector3[]=[];
  for(let i=0;i<=48;i++){const angle=-Math.PI*.2+i/48*Math.PI*1.65;points.push(new THREE.Vector3(.44*Math.cos(angle),.44*Math.sin(angle),.04));}
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.075,12,false),arrowMaterial));
  const tip=points.at(-1)!,previous=points.at(-2)!,direction=tip.clone().sub(previous).normalize();
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(.17,.30,3),arrowMaterial);arrow.position.copy(tip).addScaledVector(direction,.06);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);scene.add(arrow);
  renderer.render(scene,camera);replayImage=renderer.domElement.toDataURL();replayImages.set(key,replayImage);scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});base.dispose();arrowMaterial.dispose();renderer.dispose();renderer.forceContextLoss();
 }
 const image=new Image();image.src=replayImage;image.alt='';image.className='progress-lock-render';el.replaceChildren(image);
}
