import * as THREE from 'three';
import { aboutSettings as cfg } from '../config/about';
import { glyph,loadAlphabet,loader,studio } from './about-assets';
function turnFront(geometry:THREE.BufferGeometry){
  const rotation=new THREE.Matrix4().makeRotationX(Math.PI/2);
  geometry.applyMatrix4(rotation);
  for(const attributes of Object.values(geometry.morphAttributes))for(const attr of attributes)attr.applyMatrix4(rotation);
}
export async function createSquishyNavigation(host:HTMLElement,label:HTMLElement) {
  const [source,gltf]=await Promise.all([loadAlphabet(cfg.buttonAlphabetUrl),loader.loadAsync(import.meta.env.BASE_URL+cfg.buttonUrl)]);
  const original=gltf.scene.getObjectByName('About_Squishy_Button') as THREE.Mesh;
  if(!original) throw new Error('About_Squishy_Button is missing');
  const s=studio(); host.append(s.renderer.domElement);
  const button=original.clone();button.geometry=original.geometry.clone();turnFront(button.geometry);
  button.position.set(0,0,0);button.rotation.set(0,0,0);button.scale.setScalar(1);
  button.material=(original.material as THREE.MeshStandardMaterial).clone();(button.material as THREE.MeshStandardMaterial).color.set(cfg.buttonColour);
  const index=button.morphTargetDictionary?.Finger_Press;
  if(index===undefined) {s.dispose();throw new Error('Finger_Press morph is missing');}
  s.scene.add(button);
  const letters=[...'ABOUT'].map(char=>{
    const mesh=glyph(source,char,cfg.buttonLetterColour);s.scene.add(mesh);
    return {mesh,base:mesh.geometry.clone(),rest:new Float32Array(),delta:new Float32Array()};
  });
  // The press profile matches the Blender target in prepare.py.
  let visible=false,pressedAt=-Infinity,raf=0,disposed=false;
  function resize() {
    cancelAnimationFrame(raf);
    const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
    s.renderer.setSize(width,height,false);
    const viewH=1.10,viewW=viewH*width/height;
    s.camera.left=-viewW/2;s.camera.right=viewW/2;s.camera.top=viewH/2;s.camera.bottom=-viewH/2;s.camera.updateProjectionMatrix();
    // Preserve rounded end geometry: only the centre is resized horizontally.
    const rest=original.geometry.clone();turnFront(rest);
    const targetHalf=viewW*.48,cap=.34,centre=Math.max(.02,targetHalf-cap);
    const reshape=(x:number)=>Math.abs(x)>.9?Math.sign(x)*(centre+(Math.abs(x)-.9)*cap/.5):x*centre/.9;
    const p=rest.getAttribute('position');const morph=rest.morphAttributes.position ?? [];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i);p.setX(i,reshape(x));
      for(const a of morph) a.setX(i,rest.morphTargetsRelative?reshape(x+a.getX(i))-reshape(x):reshape(a.getX(i)));
    }
    rest.computeVertexNormals();button.geometry.dispose();button.geometry=rest;
    const hr=host.getBoundingClientRect(),lr=label.getBoundingClientRect();
    const cell=lr.width/5/width*viewW,letterH=lr.height/height*viewH*.66;
    letters.forEach((item,j)=>{
      item.mesh.geometry.dispose();item.mesh.geometry=item.base.clone();
      item.mesh.geometry.computeBoundingBox();const bw=item.mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).x;
      const scale=Math.min(letterH,cell*.9/bw);
      const x=(lr.left-hr.left+lr.width*(j+.5)/5)/width*viewW-viewW/2;
      const y=viewH/2-(lr.top-hr.top+lr.height/2)/height*viewH;
      item.mesh.geometry.scale(scale,scale,scale);item.mesh.geometry.translate(x,y,.31+scale*.16);
      const pos=item.mesh.geometry.getAttribute('position');item.rest=new Float32Array(pos.array);item.delta=new Float32Array(pos.count);
      for(let i=0;i<pos.count;i++){
        const worldX=pos.getX(i),sourceX=worldX/centre*.9;
        item.delta[i]=.19*Math.exp(-((sourceX/.65)**2+(pos.getY(i)/.35)**2)*1.6)+.025;
      }
    });
    draw(performance.now());
  }
  function draw(now:number) {
    if(disposed)return;
    const age=(now-pressedAt)/1000/cfg.pressSeconds;
    const weight=age<0||age>=1?0:age<.24?Math.sin(age/.24*Math.PI/2):Math.pow(Math.cos((age-.24)/.76*Math.PI/2),2);
    button.morphTargetInfluences![index!]=weight;
    for(const item of letters){
      const p=item.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<p.count;i++){
        p.setXYZ(i,item.rest[i*3]*(1+.018*weight),item.rest[i*3+1]*(1+.018*weight),item.rest[i*3+2]-item.delta[i]*weight);
      }
      p.needsUpdate=true;item.mesh.geometry.computeVertexNormals();
    }
    if(visible&&!document.hidden)s.renderer.render(s.scene,s.camera);
    if(visible&&age<1&&age>=0)raf=requestAnimationFrame(draw);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);
  return {
    show(value:boolean){visible=value;cancelAnimationFrame(raf);if(value)resize();},
    press(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;pressedAt=performance.now();cancelAnimationFrame(raf);draw(pressedAt);},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();button.geometry.dispose();(button.material as THREE.Material).dispose();for(const i of letters){i.base.dispose();i.mesh.geometry.dispose();(i.mesh.material as THREE.Material).dispose();}s.dispose();},
  };
}
