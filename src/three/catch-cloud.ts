import * as THREE from 'three';
import {loader,studio} from './about-assets';
/** Shared palm-compression field keeps the expression attached to the foam. */
export async function createCatchCloud(host:HTMLElement){
  const gltf=await loader.loadAsync(import.meta.env.BASE_URL+'models/catch/cloud.glb');
  const source=gltf.scene;source.rotation.x=Math.PI/2;source.updateMatrixWorld(true);
  const s=studio(),group=new THREE.Group();s.scene.add(group);
  const bounds=new THREE.Box3().setFromObject(source,true),centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const meshes:THREE.Mesh[]=[];
  source.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;
    const g=o.geometry.clone();g.morphAttributes={};g.applyMatrix4(o.matrixWorld);g.translate(-centre.x,-centre.y,-centre.z);
    const target=g.clone(),p=target.getAttribute('position');
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=x/(size.x/2),ny=y/(size.y/2);
      // Compress the entire body, including its outer lobes, without a narrow waist.
      const nz=z/(size.z/2),theta=Math.atan2(nz,nx);
      const foldPhase=theta*14+ny*1.8+.7*Math.sin(ny*4+theta*3);
      const fold=(.5+.5*Math.cos(foldPhase))**5;
      const envelope=.55+.45*Math.cos(Math.min(1,Math.abs(ny))*Math.PI/2);
      const gathering=fold*envelope;
      // Inward gathered wrinkles continue over the front, sides and back.
      const radial=1-.14*gathering;
      const bulge=.04*Math.sin(ny*4+theta*2)*(1-Math.min(1,Math.abs(ny)));
      p.setXYZ(i,x*.60*radial,y*.76+size.y*.012*Math.sin(theta*9+ny*3)*envelope,z*(.88+bulge)*radial);

    }
    target.computeVertexNormals();g.morphTargetsRelative=false;
    g.morphAttributes.position=[target.getAttribute('position').clone()];g.morphAttributes.normal=[target.getAttribute('normal').clone()];target.dispose();
    const mesh=new THREE.Mesh(g,Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone());mesh.updateMorphTargets();meshes.push(mesh);group.add(mesh);
  });
  s.camera.left=-size.x*.62;s.camera.right=size.x*.62;s.camera.top=size.y*.7;s.camera.bottom=-size.y*.7;s.camera.position.z=Math.max(size.x,size.y)*3;s.camera.far=s.camera.position.z*3;s.camera.updateProjectionMatrix();
  host.append(s.renderer.domElement);
  function resize(){if(host.clientWidth&&host.clientHeight){s.renderer.setSize(host.clientWidth,host.clientHeight,false);render(0);}}
  function render(weight:number){for(const mesh of meshes)mesh.morphTargetInfluences![0]=weight;s.renderer.render(s.scene,s.camera);}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {render,resize,snapshot:()=>s.renderer.domElement.toDataURL('image/png'),attach(next:HTMLElement){observer.unobserve(host);host=next;host.append(s.renderer.domElement);observer.observe(host);resize();},dispose(){observer.disconnect();for(const mesh of meshes){mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();}s.dispose();}};
}
