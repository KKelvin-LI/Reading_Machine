import {playSound} from '../ui/sounds';
import * as THREE from 'three';
import {loader,studio} from './about-assets';
const cache=new Map<string,Promise<string[]>>();
/** Bake the original Blender asset to reusable frames, avoiding one WebGL context per row. */
export function historyArt(kind:'cross'|'line',colour:string){
  const key=kind+colour;if(cache.has(key))return cache.get(key)!;
  const work=(async()=>{
    const gltf=await loader.loadAsync(import.meta.env.BASE_URL+`models/history/${kind}.glb`);
    const s=studio(),root=gltf.scene;root.rotation.x=Math.PI/2;root.updateMatrixWorld(true);
    root.traverse(o=>{if(o instanceof THREE.Mesh){o.material=(o.material as THREE.MeshStandardMaterial).clone();(o.material as THREE.MeshStandardMaterial).color.set(colour);}});
    s.scene.add(root);const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());root.position.sub(centre);
    const horizontalMargin=kind==='line'?.5:.53;
    s.camera.left=-size.x*horizontalMargin;s.camera.right=size.x*horizontalMargin;s.camera.top=size.y*.53;s.camera.bottom=-size.y*.53;s.camera.position.z=Math.max(size.x,size.y)*3;s.camera.far=s.camera.position.z*3;s.camera.updateProjectionMatrix();
    s.renderer.setPixelRatio(1);s.renderer.setSize(kind==='cross'?96:1024,kind==='cross'?96:24,false);
    const frames:string[]=[];
    for(let i=0;i<(kind==='cross'?13:1);i++){
      root.traverse(o=>{if(o instanceof THREE.Mesh&&o.morphTargetDictionary&&o.morphTargetInfluences){const index=o.morphTargetDictionary.Finger_Press;if(index!==undefined)o.morphTargetInfluences[index]=i/12;}});
      s.renderer.render(s.scene,s.camera);frames.push(s.renderer.domElement.toDataURL('image/png'));
    }
    root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});s.dispose();return frames;
  })();cache.set(key,work);return work;
}
export async function pressCross(img:HTMLImageElement,colour:string,seconds:number){
  playSound('close');
  const frames=await historyArt('cross',colour);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  await new Promise<void>(resolve=>{const start=performance.now();function tick(now:number){const t=Math.min(1,(now-start)/(seconds*1000));const weight=t<.45?Math.sin(t/.45*Math.PI/2):Math.cos((t-.45)/.55*Math.PI/2)**2;img.src=frames[Math.round(weight*12)];if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
}
