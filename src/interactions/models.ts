import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const assetUrl = (name: string) => `${import.meta.env.BASE_URL}models/${name}`;
export async function loadModel(file: string, _kind: 'foam'|'red'|'ruler') {
  const gltf=await new GLTFLoader().loadAsync(assetUrl(file));
  const source=gltf.scene;
  // Remove Blender presentation offsets. Orient Blender's top (+Z) toward camera.
  const oriented=new THREE.Group();oriented.add(source);oriented.rotation.x=Math.PI/2;oriented.updateMatrixWorld(true);
  oriented.traverse(o=>{
    if(o.name.includes('Soft_Outline')) o.visible=false; // Recreated by the web shadow, not opaque GLB layers.
    if(!(o instanceof THREE.Mesh)) return;
    // Keep exported PBR materials, maps, normals and clearcoat intact.
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const material of materials){
      if(material instanceof THREE.MeshStandardMaterial){
        material.envMapIntensity=0.8;
        if(material.map)material.map.anisotropy=8;
        if(material.normalMap)material.normalMap.anisotropy=8;
      }
    }
  });
  if(file==='squishy-anchor.glb') oriented.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    const position=o.geometry.getAttribute('position');let lo=Infinity,hi=-Infinity;
    for(let i=0;i<position.count;i++){lo=Math.min(lo,position.getX(i));hi=Math.max(hi,position.getX(i));}
    const values=new Float32Array(position.count);
    for(let i=0;i<position.count;i++){const x=Math.abs((position.getX(i)-(hi+lo)/2)/((hi-lo)/2));values[i]=Math.min(1,(x/.6)**2);}
    o.geometry.setAttribute('foamThickness',new THREE.BufferAttribute(values,1));
    const m=o.material as THREE.MeshPhysicalMaterial;m.transparent=true;m.depthWrite=false;
    m.userData.stretch={value:0};
    m.onBeforeCompile=shader=>{
      shader.uniforms.foamStretch=m.userData.stretch;
      shader.vertexShader='attribute float foamThickness; varying float vFoamThickness;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFoamThickness=foamThickness;');
      shader.fragmentShader='uniform float foamStretch; varying float vFoamThickness;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= mix(1.0, mix(0.30,0.65,vFoamThickness),foamStretch);');
    };
    m.customProgramCacheKey=()=> 'anchor-thickness-v1';
  });
  const box=new THREE.Box3().setFromObject(oriented,true);const center=box.getCenter(new THREE.Vector3());const size=box.getSize(new THREE.Vector3());
  const content=new THREE.Group();content.add(oriented);oriented.position.sub(center);
  const unit=new THREE.Group();unit.add(content);content.scale.setScalar(1/size.x);
  unit.userData.aspect=size.y/size.x;
  return unit;
}
export function morph(root:THREE.Object3D,name:string,value:number){root.traverse(o=>{if(o instanceof THREE.Mesh && o.morphTargetDictionary && o.morphTargetInfluences){const i=o.morphTargetDictionary[name];if(i!==undefined)o.morphTargetInfluences[i]=value;}});}
