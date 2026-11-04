import * as THREE from 'three';
import { aboutSettings as cfg } from '../config/about';
import { glyph, loadAlphabet, loader, studio } from './about-assets';

/** Exact CSS-sized cushion with a shared dent/crease field for body and lettering. */
export async function createSquishyNavigation(host: HTMLElement, label: HTMLElement) {
  const [source, gltf] = await Promise.all([
    loadAlphabet(cfg.buttonAlphabetUrl),
    loader.loadAsync(import.meta.env.BASE_URL + cfg.buttonUrl),
  ]);
  const original = gltf.scene.getObjectByName('About_Squishy_Button') as THREE.Mesh;
  if (!original) throw new Error('About_Squishy_Button is missing');
  const s = studio(); host.append(s.renderer.domElement);
  const material = (original.material as THREE.MeshStandardMaterial).clone();
  material.color.set(cfg.buttonColour);
  const button = new THREE.Mesh(new THREE.BufferGeometry(), material);
  s.scene.add(button);
  const letters = [...'ABOUT'].map(char => {
    const mesh = glyph(source, char, cfg.buttonLetterColour);
    const base = mesh.geometry.clone();
    s.scene.add(mesh);
    return { mesh, base };
  });
  const measure = document.createElement('canvas').getContext('2d')!;
  const control = label.closest('button')!;
  let visible = false, disposed = false, pressedAt = -Infinity, raf = 0;
  let builtWidth = 0, builtHeight = 0, builtCap = 0;

  function measureLabel() {
    const style = getComputedStyle(label);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = measure.measureText('ABOUT');
    const cap = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const tracking = parseFloat(style.letterSpacing) || 0;
    const width = metrics.width + tracking * 4;
    control.style.setProperty('--about-cap-height', `${cap}px`);
    control.style.setProperty('--about-text-width', `${width}px`);
    return { cap, width };
  }

  // Compute a position AND normal morph once. Animation only changes its weight.
  function addPress(mesh: THREE.Mesh, deform: (x:number,y:number,z:number)=>number[]) {
    const geometry = mesh.geometry;
    const p = geometry.getAttribute('position') as THREE.BufferAttribute;
    const target = geometry.clone();
    const tp = target.getAttribute('position') as THREE.BufferAttribute;
    for (let i=0; i<p.count; i++) {
      const v=deform(p.getX(i),p.getY(i),p.getZ(i));tp.setXYZ(i,v[0],v[1],v[2]);
    }
    target.computeVertexNormals();
    const n=geometry.getAttribute('normal'), tn=target.getAttribute('normal');
    const dp=new Float32Array(p.count*3), dn=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++) {
      dp[i*3]=tp.getX(i)-p.getX(i);dp[i*3+1]=tp.getY(i)-p.getY(i);dp[i*3+2]=tp.getZ(i)-p.getZ(i);
      dn[i*3]=tn.getX(i)-n.getX(i);dn[i*3+1]=tn.getY(i)-n.getY(i);dn[i*3+2]=tn.getZ(i)-n.getZ(i);
    }
    geometry.morphTargetsRelative=true;
    geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(dp,3)];
    geometry.morphAttributes.normal=[new THREE.Float32BufferAttribute(dn,3)];
    mesh.updateMorphTargets();target.dispose();
  }

  function resize() {
    if(disposed)return;
    const text=measureLabel();
    if(!visible || !host.getClientRects().length)return;
    const box=host.getBoundingClientRect(), width=box.width, height=box.height;
    if(!width||!height)return;
    if(Math.abs(width-builtWidth)<.1&&Math.abs(height-builtHeight)<.1&&Math.abs(text.cap-builtCap)<.1){render(performance.now());return;}
    builtWidth=width;builtHeight=height;builtCap=text.cap;
    s.renderer.setSize(width,height,false);
    // World units equal CSS pixels: no hidden camera margin enlarges the padding.
    s.camera.left=-width/2;s.camera.right=width/2;s.camera.top=height/2;s.camera.bottom=-height/2;
    s.camera.position.set(0,0,Math.max(width,height)*3);s.camera.far=Math.max(width,height)*6;s.camera.updateProjectionMatrix();
    s.scene.updateMatrixWorld(true);
    const geometry=original.geometry.clone();
    geometry.morphAttributes={};geometry.rotateX(Math.PI/2);geometry.computeBoundingBox();
    const bounds=geometry.boundingBox!,size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    const radius=Math.min(height*.22,width*.22), depth=height*.16;
    // Nine-slice style remapping keeps the end corners round at every text size.
    const axis=(v:number,half:number,target:number,cap:number)=>{
      const oldCap=Math.min(size.y*.25,half*.8),mid=half-oldCap;
      return Math.abs(v)>mid?Math.sign(v)*(target-cap+(Math.abs(v)-mid)*cap/oldCap):v*(target-cap)/mid;
    };
    const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
    for(let i=0;i<positions.count;i++){
      positions.setXYZ(i,axis(positions.getX(i)-centre.x,size.x/2,width/2,radius),axis(positions.getY(i)-centre.y,size.y/2,height/2,radius),(positions.getZ(i)-centre.z)/size.z*depth*2);
    }
    geometry.computeVertexNormals();button.geometry.dispose();button.geometry=geometry;

    // Local compression with narrow folds surrounding the fingertip depression.
    const displace=(x:number,y:number,z:number,surface:boolean)=>{
      const nx=x/(width*.33),ny=y/(height*.32),r=Math.hypot(nx,ny),angle=Math.atan2(ny,nx);
      const front=surface?1:THREE.MathUtils.smoothstep(z,-depth,depth*.65);
      const dent=height*.14*Math.exp(-2.2*r*r);
      const ring=Math.exp(-(((r-.9)/.28)**2));
      const folds=height*.024*ring*(Math.sin(angle*7+.35)+.35*Math.sin(angle*11-1));
      const rim=height*.015*Math.exp(-(((r-1.15)/.24)**2));
      return [x,y,z+front*(-dent+folds+rim)];
    };
    // Sample the actual surface so the lettering sits on the cushion, not in it.
    button.updateMatrixWorld(true);
    const ray=new THREE.Raycaster();
    const surfaceZ=(x:number,y:number)=>{
      ray.set(new THREE.Vector3(x,y,depth*4),new THREE.Vector3(0,0,-1));
      return ray.intersectObject(button,false)[0]?.point.z ?? depth;
    };
    let total=0;
    const gap=text.cap*.12;
    const dims=letters.map(item=>{
      item.base.computeBoundingBox();const dim=item.base.boundingBox!.getSize(new THREE.Vector3());
      const w=dim.x*text.cap;total+=w;return w;
    });
    total+=gap*4;const fitX=text.width/total;let cursor=-text.width/2;
    letters.forEach((item,j)=>{
      item.mesh.geometry.dispose();item.mesh.geometry=item.base.clone();
      const w=dims[j]*fitX;
      item.mesh.geometry.scale(text.cap*fitX,text.cap,text.cap);
      item.mesh.geometry.translate(cursor+w/2,0,0);
      const p=item.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const z=surfaceZ(cursor+w/2,0);
      // Keep the base of each inflated glyph just above the sampled surface.
      item.mesh.geometry.computeBoundingBox();const bottom=item.mesh.geometry.boundingBox!.min.z;
      for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)-bottom+z+.15);
      item.mesh.geometry.computeVertexNormals();addPress(item.mesh,(x,y,z)=>displace(x,y,z,true));
      cursor+=w+gap*fitX;
    });
    addPress(button,(x,y,z)=>displace(x,y,z,false));render(performance.now());
  }

  function render(now:number) {
    cancelAnimationFrame(raf);
    if(disposed||!visible)return;
    const t=(now-pressedAt)/(cfg.pressSeconds*1000);
    const weight=t<0||t>=1?0:t<.25?Math.sin(t/.25*Math.PI/2):Math.cos((t-.25)/.75*Math.PI/2)**2;
    button.morphTargetInfluences![0]=weight;
    for(const {mesh} of letters)mesh.morphTargetInfluences![0]=weight;
    if(!document.hidden)s.renderer.render(s.scene,s.camera);
    if(t>=0&&t<1)raf=requestAnimationFrame(render);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);observer.observe(control);
  measureLabel();
  return {
    show(value:boolean){visible=value;cancelAnimationFrame(raf);if(value)resize();},
    press(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;pressedAt=performance.now();render(pressedAt);},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();button.geometry.dispose();material.dispose();for(const item of letters){item.base.dispose();item.mesh.geometry.dispose();(item.mesh.material as THREE.Material).dispose();}s.dispose();},
  };
}
