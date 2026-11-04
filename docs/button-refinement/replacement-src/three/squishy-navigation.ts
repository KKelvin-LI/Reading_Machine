import * as THREE from 'three';
import { loader, studio } from './about-assets';
import { aboutSettings as cfg } from '../config/about';

/* Blender owns the dent and creases. This code only fits and plays the exported model. */
export async function createSquishyNavigation(host:HTMLElement,label:HTMLElement) {
  const gltf=await loader.loadAsync(import.meta.env.BASE_URL+'models/about/pu-navigation-v2.glb');
  const s=studio();host.append(s.renderer.domElement);
  const root=gltf.scene;s.scene.add(root);
  const body=root.getObjectByName('PU_Navigation_Body') as THREE.Mesh;
  const letters=[...'ABOUT'].map(c=>root.getObjectByName('PU_Label_'+c) as THREE.Mesh);
  if(!body||letters.some(x=>!x)) {s.dispose();throw new Error('New Blender button or ABOUT letters are missing');}
  const meshes=[body,...letters];
  // glTF Y-up -> the Blender model's XY front face, including its morph targets.
  const rotation=new THREE.Matrix4().makeRotationX(Math.PI/2);
  const bases=new Map<THREE.Mesh,THREE.BufferGeometry>();
  for(const mesh of meshes){
    const g=mesh.geometry.clone();g.applyMatrix4(rotation);
    for(const list of Object.values(g.morphAttributes))for(const attr of list)attr.applyMatrix4(rotation);
    g.boundingBox=new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute);bases.set(mesh,g);
    mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.setScalar(1);
    mesh.material=(mesh.material as THREE.MeshStandardMaterial).clone();
    (mesh.material as THREE.MeshStandardMaterial).color.set(mesh===body?cfg.buttonColour:cfg.buttonLetterColour);
  }
  // Blender exports one action per mesh: merge synchronized tracks into one clip.
  const tracks=gltf.animations.flatMap(clip=>clip.tracks);
  if(!tracks.length){s.dispose();throw new Error('Blender press animation is missing');}
  const clip=new THREE.AnimationClip('About_Press',-1,tracks);
  const mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
  action.timeScale=clip.duration/Math.max(.1,cfg.pressSeconds);
  const measure=document.createElement('canvas').getContext('2d')!;
  const control=label.closest('button')!;
  let visible=false,disposed=false,raf=0,last=0,playing=false;
  let completion:(()=>void)|undefined;
  let layoutKey='';

  function fitGeometry(base:THREE.BufferGeometry,scale:THREE.Vector3,offset:THREE.Vector3){
    const g=base.clone(),matrix=new THREE.Matrix4().makeScale(scale.x,scale.y,scale.z);
    matrix.setPosition(offset);g.applyMatrix4(matrix);
    const oldNormal=base.getAttribute('normal'),newNormal=g.getAttribute('normal');
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),v=new THREE.Vector3();
    for(const attr of g.morphAttributes.position??[]){
      for(let i=0;i<attr.count;i++)attr.setXYZ(i,attr.getX(i)*scale.x+(g.morphTargetsRelative?0:offset.x),attr.getY(i)*scale.y+(g.morphTargetsRelative?0:offset.y),attr.getZ(i)*scale.z+(g.morphTargetsRelative?0:offset.z));
    }
    for(const attr of g.morphAttributes.normal??[]){
      for(let i=0;i<attr.count;i++){
        v.set(attr.getX(i)+(g.morphTargetsRelative?oldNormal.getX(i):0),attr.getY(i)+(g.morphTargetsRelative?oldNormal.getY(i):0),attr.getZ(i)+(g.morphTargetsRelative?oldNormal.getZ(i):0)).applyNormalMatrix(normalMatrix);
        attr.setXYZ(i,v.x-(g.morphTargetsRelative?newNormal.getX(i):0),v.y-(g.morphTargetsRelative?newNormal.getY(i):0),v.z-(g.morphTargetsRelative?newNormal.getZ(i):0));
      }
    }
    return g;
  }
  function resize(){
    if(disposed)return;
    const style=getComputedStyle(label);measure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const m=measure.measureText('ABOUT'),cap=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    const textWidth=m.width+4*(parseFloat(style.letterSpacing)||0);
    control.style.setProperty('--about-cap-height',`${cap}px`);control.style.setProperty('--about-text-width',`${textWidth}px`);
    if(!visible||!host.getClientRects().length)return;
    const box=host.getBoundingClientRect(),w=box.width,h=box.height;if(!w||!h)return;
    const key=[w,h,cap,textWidth].join('/');
    if(key!==layoutKey){
      layoutKey=key;s.renderer.setSize(w,h,false);
      s.camera.left=-w/2;s.camera.right=w/2;s.camera.top=h/2;s.camera.bottom=-h/2;s.camera.position.z=w*3;s.camera.far=w*6;s.camera.updateProjectionMatrix();
      const bb=bases.get(body)!.boundingBox!,bs=bb.getSize(new THREE.Vector3()),bc=bb.getCenter(new THREE.Vector3());
      const labelBox=new THREE.Box3();for(const mesh of letters)labelBox.union(bases.get(mesh)!.boundingBox!);
      const ls=labelBox.getSize(new THREE.Vector3()),lc=labelBox.getCenter(new THREE.Vector3());
      for(const mesh of meshes){
        const isBody=mesh===body,scale=new THREE.Vector3(isBody?w/bs.x:textWidth/ls.x,isBody?h/bs.y:cap/ls.y,h/bs.y);
        const center=isBody?bc:lc;
        const offset=new THREE.Vector3(-center.x*scale.x,-center.y*scale.y,-bc.z*scale.z);
        const old=mesh.geometry;mesh.geometry=fitGeometry(bases.get(mesh)!,scale,offset);old.dispose();
      }
    }
    if(!playing)s.renderer.render(s.scene,s.camera);
  }
  function settle(){playing=false;const done=completion;completion=undefined;done?.();}
  mixer.addEventListener('finished',event=>{if(event.action===action)settle();});
  function tick(now:number){
    if(disposed)return;
    const dt=Math.min((now-last)/1000,.05);last=now;mixer.update(dt);
    if(visible&&!document.hidden)s.renderer.render(s.scene,s.camera);
    if(playing)raf=requestAnimationFrame(tick);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);observer.observe(control);resize();
  return {
    show(value:boolean){visible=value;if(value)resize();},
    press():Promise<void>{
      if(disposed||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
      if(playing)return Promise.resolve();
      return new Promise(resolve=>{completion=resolve;playing=true;action.reset().play();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);});
    },
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();mixer.stopAllAction();settle();for(const mesh of meshes){bases.get(mesh)!.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}s.dispose();},
  };
}
