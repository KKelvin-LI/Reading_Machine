import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { aboutSettings as cfg } from '../config/about';
const loader = new GLTFLoader();
const alphabets = new Map<string,Promise<THREE.Group>>();
export function loadAlphabet(url=cfg.alphabetUrl) {
  if(!alphabets.has(url))alphabets.set(url,loader.loadAsync(import.meta.env.BASE_URL+url).then(g=>g.scene).catch(e=>{alphabets.delete(url);throw e;}));
  return alphabets.get(url)!;
}
export function glyph(source:THREE.Group, char:string, colour:string) {
  const original=source.getObjectByName('AboutGlyph_'+(char==='!'?'Exclamation':char)) as THREE.Mesh;
  if (!original) throw new Error('Inflated letter missing: '+char);
  const mesh=new THREE.Mesh(original.geometry.clone(),(original.material as THREE.MeshStandardMaterial).clone());
  // Blender XY face becomes XZ in glTF. Restore a face-on XY mesh.
  mesh.geometry.rotateX(Math.PI/2); mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!, size=box.getSize(new THREE.Vector3()), mid=box.getCenter(new THREE.Vector3());
  mesh.geometry.translate(-mid.x,-mid.y,-mid.z); mesh.geometry.scale(1/size.y,1/size.y,1/size.y);
  (mesh.material as THREE.MeshStandardMaterial).color.set(colour);
  return mesh;
}
export function studio() {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1;
  const scene=new THREE.Scene(), pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04); room.dispose(); pmrem.dispose();
  scene.environment=env.texture; scene.environmentIntensity=.35;
  scene.add(new THREE.AmbientLight(0xffffff,.25));
  const light=new THREE.DirectionalLight(0xfff8ee,1.5); light.position.set(-3,6,8); scene.add(light);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30); camera.position.z=10;
  return {renderer,scene,camera,dispose(){env.dispose();renderer.dispose();renderer.domElement.remove();}};
}
/** Render each coloured glyph once; CSS can then scroll it cheaply and smoothly. */
export async function paintInflatedLetters(root:HTMLElement) {
  let source:THREE.Group|undefined,s:ReturnType<typeof studio>|undefined;
  const cache=new Map<string,string>();
  try {
    for(const el of root.querySelectorAll<HTMLElement>('[data-glyph]')) {
      const char=el.dataset.glyph!, colour=el.dataset.colour!, key=char+colour;
      const prepared=new Image();prepared.alt='';
      prepared.src=import.meta.env.BASE_URL+cfg.spriteUrl+(char==='!'?'Exclamation':char)+'-'+colour.slice(1)+'.png';
      try{await prepared.decode();el.append(prepared);el.classList.add('has-model');continue;}catch{/* New colour/letter: render from the full alphabet below. */}
      source??=await loadAlphabet();s??=studio();
      if(!cache.has(key)) {
        const mesh=glyph(source,char,colour); s.scene.add(mesh);
        s.camera.left=-.46;s.camera.right=.46;s.camera.top=.66;s.camera.bottom=-.66;s.camera.updateProjectionMatrix();
        s.renderer.setSize(192,276,false);s.renderer.render(s.scene,s.camera);
        cache.set(key,s.renderer.domElement.toDataURL('image/png'));
        s.scene.remove(mesh); mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
      }
      const img=new Image(); img.alt='';img.src=cache.get(key)!;
      await img.decode();el.append(img);el.classList.add('has-model');
    }
  } finally { s?.dispose(); }
}
export { loader };
