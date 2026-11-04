import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {loadModel} from '../interactions/models';
import {WrappedHighlight} from '../interactions/wrapped-highlight';
let setup:Promise<{renderer:THREE.WebGLRenderer;scene:THREE.Scene;camera:THREE.OrthographicCamera;anchor:THREE.Group}>;
const cache=new Map<string,Promise<string[]>>();
export function savedHighlightArt(widths:number[],colour:string){
 const key=colour+':'+widths.map(w=>w.toFixed(2)).join(',');const old=cache.get(key);if(old)return old;
 setup??=(async()=>{const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.localClippingEnabled=true;renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera();camera.position.z=500;const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.add(new THREE.AmbientLight(0xffffff,.35));const light=new THREE.DirectionalLight(0xfff6eb,2.2);light.position.set(-300,800,800);scene.add(light);return {renderer,scene,camera,anchor:await loadModel('squishy-anchor.glb','foam')};})();
 const result=setup.then(({renderer,scene,camera,anchor})=>{
  const template=anchor.clone(true);template.traverse(o=>{if(o instanceof THREE.Mesh){o.material=(o.material as THREE.MeshStandardMaterial).clone();(o.material as THREE.MeshStandardMaterial).color.set(colour);}});
  const h=40,pad=10,w=Math.ceil(Math.max(...widths)*h+pad*2),height=widths.length*h;
  const transition=new WrappedHighlight(template,0,0,1,h);transition.setRows(widths.map((ratio,i)=>({left:pad,top:i*h,width:ratio*h,height:h})),1);transition.tick(1,performance.now(),true);transition.root.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.MeshStandardMaterial).color.set(colour);});scene.add(transition.root);
  camera.left=0;camera.right=w;camera.top=innerHeight;camera.bottom=innerHeight-height;camera.near=-1000;camera.far=1000;camera.updateProjectionMatrix();renderer.setSize(w,height,false);renderer.render(scene,camera);
  const images=widths.map((ratio,i)=>{const c=document.createElement('canvas');c.width=Math.ceil(ratio*h+pad*2);c.height=h;c.getContext('2d')!.drawImage(renderer.domElement,0,i*h,c.width,h,0,0,c.width,h);return c.toDataURL();});
  transition.dispose();template.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose();});return images;
 });cache.set(key,result);if(cache.size>100)cache.delete(cache.keys().next().value!);return result;
}
