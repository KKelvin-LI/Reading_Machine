import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {homeSettings} from '../config/home';

/** Orthographic renders of the actual home model: front for branding, overhead for tools. */
let topView:Promise<string>|undefined,frontView:Promise<string>|undefined;
export function eatyTopView(){
 return topView??=renderView(true).catch(error=>{topView=undefined;throw error;});
}
export function eatyFrontView(){
 return frontView??=renderView(false).catch(error=>{frontView=undefined;throw error;});
}
async function renderView(overhead:boolean){
 const {scene:model}=await new GLTFLoader().loadAsync(import.meta.env.BASE_URL+homeSettings.frogUrl);
 model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  for(const material of materials){if(!(material instanceof THREE.MeshStandardMaterial))continue;
   if(/torso|face/i.test(o.name)&&!/cheek/i.test(o.name)){material.color.set('#fcf068');material.roughness=.62;}
   if(/tongue/i.test(o.name)){material.color.set('#f7c9de');material.roughness=.18;}
  }
 });
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const span=Math.max(size.x,overhead?size.z:size.y)*1.06;
 const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,100);
 if(overhead){camera.position.set(centre.x,bounds.max.y+10,centre.z);camera.up.set(0,0,-1);}
 else camera.position.set(centre.x,centre.y,bounds.max.z+10);
 camera.lookAt(centre);
 const scene=new THREE.Scene();scene.add(model,new THREE.HemisphereLight(0xffffff,0x807b78,1.25));
 const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(-3,8,5);scene.add(key);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setSize(512,512,false);renderer.setClearColor(0,0);
 try{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}
 finally{model.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.forceContextLoss();}
}
export function applyEatyImage(image:HTMLImageElement|SVGImageElement,view:'top'|'front'='top'){
 void (view==='front'?eatyFrontView():eatyTopView()).then(url=>{if(image instanceof SVGImageElement)image.setAttribute('href',url);else image.src=url;}).catch(error=>console.warn('Eaty render could not load',error));
}
export function mountEatyBrand(){
 document.querySelectorAll<HTMLImageElement>('img[data-eaty-front]').forEach(image=>applyEatyImage(image,'front'));
 void eatyFrontView().then(url=>{const icon=document.querySelector<HTMLLinkElement>('link[rel="icon"]');if(icon){icon.type='image/png';icon.href=url;}}).catch(()=>{});
}
