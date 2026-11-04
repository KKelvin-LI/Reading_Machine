import * as THREE from 'three';
import {studio} from '../../three/about-assets';
import {cushionMaterial} from '../../three/cushion';
const cache=new Map<string,string>();
/** Bake rounded, foamy 3D result symbols once; no persistent rendering loop. */
export function checkerResultArt(correct:boolean,colour:string){
 const key=`${correct}:${colour}`;if(cache.has(key))return cache.get(key)!;
 const s=studio(),material=cushionMaterial(colour);
 const points=correct?[[-.75,0],[-.22,-.48],[.78,.65]]:[[-.65,-.65],[.65,.65],[-.65,.65],[.65,-.65]];
 const segments=correct?[[0,1],[1,2]]:[[0,1],[2,3]];
 for(const [a,b] of segments){const start=new THREE.Vector3(...points[a] as [number,number],0),end=new THREE.Vector3(...points[b] as [number,number],0),delta=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.085,delta.length(),8,20),material);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());s.scene.add(mesh);}
 s.renderer.setPixelRatio(1);s.renderer.setSize(256,256,false);s.renderer.render(s.scene,s.camera);const image=s.renderer.domElement.toDataURL();s.scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});material.dispose();s.dispose();cache.set(key,image);return image;
}
