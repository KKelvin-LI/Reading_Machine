import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

let cached='';
/** Baked 3D preview: a soft rubber block with a matte paper sleeve. */
export function eraserIcon(){
 if(cached)return cached;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(240,120);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2.2,2.2,1.1,-1.1,.1,20);camera.position.set(0,0,8);
 const group=new THREE.Group();group.rotation.set(.32,-.3,-.02);scene.add(group);
 const rubber=new THREE.MeshStandardMaterial({color:'#f2f2f3',roughness:.88,metalness:0});
 const body=new THREE.Mesh(new RoundedBoxGeometry(3.8,1.55,.85,5,.23),rubber);group.add(body);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;const pixels=ctx.createImageData(64,64);for(let i=0;i<pixels.data.length;i+=4){const n=185+Math.random()*12;pixels.data.set([n,n,n,255],i);}ctx.putImageData(pixels,0,0);
 const grain=new THREE.CanvasTexture(canvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(3,2);
 const paper=new THREE.MeshStandardMaterial({color:'#bdbec1',roughness:1,metalness:0,bumpMap:grain,bumpScale:.012});
 const sleeve=new THREE.Mesh(new RoundedBoxGeometry(2.65,1.61,.9,3,.035),paper);sleeve.position.x=.56;group.add(sleeve);
 scene.add(new THREE.AmbientLight(0xffffff,.8));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,5,6);scene.add(light);renderer.render(scene,camera);cached=renderer.domElement.toDataURL();
 body.geometry.dispose();sleeve.geometry.dispose();rubber.dispose();paper.dispose();grain.dispose();renderer.dispose();renderer.forceContextLoss();return cached;
}
