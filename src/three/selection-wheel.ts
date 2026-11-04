import * as THREE from 'three';
import {cushionGeometry,cushionMaterial,cushionWeights} from './cushion';
import {studio} from './about-assets';
import {selectionMenuSettings as cfg} from '../config/selection-menu';
const inner=108,outer=184;
export function wheelPoint(a:number,u:number,v:number){
  const r=inner+(outer-inner)*v;
  const round=.055*(1-Math.sqrt(Math.max(0,Math.sin(Math.PI*v))));
  const theta=a+.065+round+u*(Math.PI/2-.13-2*round);
  return {x:r*Math.cos(theta),y:r*Math.sin(theta)};
}
/** Equator of the same capsule used by cushionGeometry, bent into the ring. */
export function wheelOutline(a:number){
 const radius=76*.495,straight=(146*(Math.PI/2-.13)-76)*.495;
 return Array.from({length:193},(_,i)=>{
  const theta=i/192*Math.PI*2,c=Math.cos(theta),s=Math.sin(theta),along=Math.abs(c),across=Math.abs(s);
  const side=across>1e-8?radius/across:Infinity;
  const edge=side*along<=straight?side:straight*along+Math.sqrt(Math.max(0,radius*radius-straight*straight*across*across));
  const angle=a+Math.PI/4+edge*c/146,r=146+edge*s;
  return {x:r*Math.cos(angle),y:r*Math.sin(angle)};
 });
}
export function wheelPath(a:number){return wheelOutline(a).map((p,i)=>`${i?'L':'M'}${p.x+200},${p.y+200}`).join(' ')+'Z';}
export async function createSelectionWheel(host:HTMLElement){
  const s=studio();host.append(s.renderer.domElement);
  s.camera.left=-200;s.camera.right=200;s.camera.top=200;s.camera.bottom=-200;s.camera.position.z=600;s.camera.far=1200;s.camera.updateProjectionMatrix();
  const groups:THREE.Group[]=[],meshes:THREE.Mesh[][]=[];
  for(const action of cfg.actions){
    const group=new THREE.Group();s.scene.add(group);groups.push(group);const parts:THREE.Mesh[]=[];meshes.push(parts);
    // Bend the shared inflated capsule around the wheel, retaining both squeeze poses.
    const width=146*(Math.PI/2-.13),geometry=cushionGeometry(width,76,false);
    const base=geometry.getAttribute('position').clone();
    const originalMorphs=geometry.morphAttributes.position!.map(a=>a.clone());
    function bend(x:number,y:number,z:number){const angle=action.angle+Math.PI/4+x/146,r=146+y;return new THREE.Vector3(r*Math.cos(angle),-r*Math.sin(angle),z);}
    const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
    for(let i=0;i<base.count;i++){const p=bend(base.getX(i),base.getY(i),base.getZ(i));positions.setXYZ(i,p.x,p.y,p.z);}
    // Tangential/radial mapping plus screen-Y reflection preserves winding.
    // Reversing it exposes the back shell and hides dents on the front face.
    geometry.computeVertexNormals();const normals=geometry.getAttribute('normal');
    geometry.morphAttributes.position=[];geometry.morphAttributes.normal=[];
    for(const delta of originalMorphs){
      const pose=geometry.clone(),p=pose.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<base.count;i++){const v=bend(base.getX(i)+delta.getX(i),base.getY(i)+delta.getY(i),base.getZ(i)+delta.getZ(i));p.setXYZ(i,v.x,v.y,v.z);}
      pose.computeVertexNormals();const n=pose.getAttribute('normal'),dp=new Float32Array(base.count*3),dn=new Float32Array(base.count*3);
      for(let i=0;i<dp.length;i++){dp[i]=p.array[i]-positions.array[i];dn[i]=n.array[i]-normals.array[i];}
      geometry.morphAttributes.position.push(new THREE.Float32BufferAttribute(dp,3));geometry.morphAttributes.normal.push(new THREE.Float32BufferAttribute(dn,3));pose.dispose();
    }
    geometry.computeBoundingSphere();
    const body=new THREE.Mesh(geometry,cushionMaterial(action.colour));group.add(body);parts.push(body);
    group.visible=false;
  }
  let current=-1,raf=0,finish:(()=>void)|undefined;
  function render(){s.renderer.render(s.scene,s.camera);}
  function resize(){const size=host.clientWidth;if(size){s.renderer.setSize(size,size,false);render();}}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {
    hover(index:number){if(current===index)return;current=index;groups.forEach((g,i)=>g.visible=i===index);render();},
    dent(index:number){this.hover(index);meshes.forEach((parts,i)=>parts.forEach(m=>{m.morphTargetInfluences![0]=i===index?1:0;m.morphTargetInfluences![1]=0;}));render();},
    async press(index:number,point?:{x:number;y:number}){
      this.hover(index);
      if(s.renderer.getContext().isContextLost()){
        await new Promise<void>(resolve=>{
          s.renderer.domElement.addEventListener('webglcontextrestored',()=>resolve(),{once:true});
          s.renderer.forceContextRestore();
        });
      }
      const angle=cfg.actions[index].angle+Math.PI/4;
      const hit=point??{x:146*Math.cos(angle),y:-146*Math.sin(angle)};
      // Update the actual surface, avoiding stale GPU morph textures entirely.
      const poses=meshes[index].map(mesh=>{
        mesh.morphTargetInfluences!.fill(0);
        const geometry=mesh.geometry,position=geometry.getAttribute('position') as THREE.BufferAttribute;
        const normal=geometry.getAttribute('normal') as THREE.BufferAttribute;
        const base=position.array.slice(),baseNormal=normal.array.slice();
        const target=geometry.clone(),p=target.getAttribute('position') as THREE.BufferAttribute;
        for(let i=0;i<p.count;i++){
          const dx=position.getX(i)-hit.x,dy=position.getY(i)-hit.y,r=Math.hypot(dx,dy)/76;
          const front=THREE.MathUtils.smoothstep(position.getZ(i),-3,18);
          const dent=38*Math.exp(-r*r*14);
          const fold=Math.pow(.5+.5*Math.cos(4*Math.atan2(dy,dx)),10);
          const crease=8*fold*Math.exp(-(((r-.28)/.22)**2))*THREE.MathUtils.smoothstep(r,.04,.15);
          p.setZ(i,position.getZ(i)-front*(dent+crease));
        }
        target.computeVertexNormals();const targetNormal=target.getAttribute('normal');
        const delta=Float32Array.from(base,(v,i)=>p.array[i]-v);
        const deltaNormal=Float32Array.from(baseNormal,(v,i)=>targetNormal.array[i]-v);
        target.dispose();
        return {position,normal,base,baseNormal,delta,deltaNormal};
      });
      function deform(weight:number){for(const p of poses){
        for(let i=0;i<p.base.length;i++){
          p.position.array[i]=p.base[i]+p.delta[i]*weight;
          p.normal.array[i]=p.baseNormal[i]+p.deltaNormal[i]*weight;
        }
        p.position.needsUpdate=true;p.normal.needsUpdate=true;
      }render();}
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){deform(0);return;}
      return new Promise<void>(resolve=>{
        finish=()=>{deform(0);resolve();};let elapsed=0,last=performance.now();
        function tick(now:number){
          if(!document.hidden)elapsed+=Math.min(40,Math.max(0,now-last));last=now;
          const t=Math.min(1,elapsed/(cfg.pressSeconds*1000));deform(cushionWeights(t).pressure);
          if(t<1)raf=requestAnimationFrame(tick);else{finish=undefined;resolve();}
        }
        raf=requestAnimationFrame(tick);
      });
    },
    hide(){cancelAnimationFrame(raf);finish?.();finish=undefined;meshes.flat().forEach(m=>m.morphTargetInfluences!.fill(0));groups.forEach(g=>g.visible=false);current=-1;render();},
  };
}
