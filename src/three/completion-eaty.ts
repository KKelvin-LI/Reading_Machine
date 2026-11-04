import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
/** Use Home's intact face, opening lip ring, and recessed mouth bowl. */
export async function createCompletionEaty(host:HTMLElement){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,innerWidth,innerHeight,0,.1,5000);camera.position.z=2000;
 scene.add(new THREE.HemisphereLight(0xffffff,0x807b78,1.25));const light=new THREE.DirectionalLight(0xffffff,1.8);light.position.set(-300,500,1000);scene.add(light);
 const asset=await new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/home/frog-completion.glb');const frog=new THREE.Group();scene.add(frog);asset.scene.updateMatrixWorld(true);
 const foam=document.createElement('canvas');foam.width=foam.height=128;const ctx=foam.getContext('2d')!;const pixels=ctx.createImageData(128,128);for(let i=0;i<pixels.data.length;i+=4){const n=100+Math.random()*90;pixels.data.set([n,n,n,255],i);}ctx.putImageData(pixels,0,0);const bump=new THREE.CanvasTexture(foam);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(8,8);
 // Cut the opening in the surface shader instead of tearing connected triangles.
 const opening={value:0},mouthPose={value:0};let oldTongue:THREE.Mesh|undefined,oldLips:THREE.Mesh|undefined,face:THREE.Mesh|undefined;
 asset.scene.traverse(o=>{if(!(o instanceof THREE.Mesh)||/studio[ _]floor|^cube$/i.test(o.name))return;
  const mesh=new THREE.Mesh(o.geometry.clone().applyMatrix4(o.matrixWorld),(o.material as THREE.MeshStandardMaterial).clone());mesh.name=o.name;
  const mat=mesh.material as THREE.MeshStandardMaterial;
  if(/rigid[ _]head[ _]skin/i.test(o.name)){
   face=mesh;mat.color.set('#fcf068');mat.roughness=.62;mat.bumpMap=bump;mat.bumpScale=.018;
   mat.onBeforeCompile=shader=>{
    shader.uniforms.mouthOpen=opening;shader.uniforms.mouthPose=mouthPose;
    shader.vertexShader='varying vec3 mouthPosition; uniform float mouthOpen; uniform float mouthPose;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     mouthPosition=position;
     float centreY=1.04+mouthPose*0.20;
     float seam=centreY+0.23*(1.0-mouthPose)*pow(position.x/1.62,2.0);
     float radius=length(vec2(position.x/1.57,(position.y-seam)/0.452));
     float blend=mouthPose*(1.0-smoothstep(1.0,1.65,radius))*smoothstep(0.0,0.25,position.z);
     transformed.z=mix(transformed.z,0.84+0.7*(position.y-centreY),blend);
`);
    shader.fragmentShader='varying vec3 mouthPosition; uniform float mouthOpen; uniform float mouthPose;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
     float mx=mouthPosition.x/1.57;
     float seam=1.04+mouthPose*0.20+0.23*(1.0-mouthPose)*pow(mouthPosition.x/1.62,2.0);
     float halfHeight=0.052+mouthOpen*0.40;
     float my=(mouthPosition.y-seam)/halfHeight;
     if(mouthOpen>0.001 && mouthPosition.z>0.0 && mx*mx+my*my<1.0) discard;`);
   };mat.customProgramCacheKey=()=> 'frog-mouth-opening-v4';
  }
  if(/lip/i.test(o.name))oldLips=mesh;
  if(/tongue/i.test(o.name)){oldTongue=mesh;mat.color.set('#f7c9de');mat.roughness=.18;}
  frog.add(mesh);
 });
 // Sample the face so both lip corners sit on the actual skin surface.
 frog.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),sampleSurface=(x:number,y:number)=>{
  if(!face)return .9;
  const origin=face.localToWorld(new THREE.Vector3(x,y,5));ray.set(origin,new THREE.Vector3(0,0,-1));
  const hit=ray.intersectObject(face,false)[0];return hit?face.worldToLocal(hit.point.clone()).z:.9;
 };
 // Cache the skin depth once; animation frames only interpolate this small grid.
 const gridX=16,gridY=12,depths:number[]=[];
 for(let j=0;j<=gridY;j++)for(let i=0;i<=gridX;i++)depths.push(sampleSurface(-1.65+3.3*i/gridX,.4+1.6*j/gridY));
 const surface=(x:number,y:number)=>{
  const u=THREE.MathUtils.clamp((x+1.65)/3.3*gridX,0,gridX-.00001),v=THREE.MathUtils.clamp((y-.4)/1.6*gridY,0,gridY-.00001);
  const i=Math.floor(u),j=Math.floor(v),k=j*(gridX+1)+i;
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(depths[k],depths[k+1],u-i),THREE.MathUtils.lerp(depths[k+gridX+1],depths[k+gridX+2],u-i),v-j);
 };
 const restingLips=oldLips?.geometry.getAttribute('position').array.slice();
 const lip=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#e7484d',roughness:.3}));frog.add(lip);
 const mouth=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#652334',roughness:.48,side:THREE.DoubleSide}));frog.add(mouth);


 if(oldTongue)oldTongue.visible=false;
 const restingBounds=new THREE.Box3().setFromObject(frog);
 const modelWidth=restingBounds.getSize(new THREE.Vector3()).x;
 function open(amount:number){

  frog.updateMatrixWorld(true);opening.value=amount;mouth.visible=lip.visible=amount>.001||mouthPose.value>.001;if(oldLips)oldLips.visible=!lip.visible;
  if(!lip.visible)return;
  const rim:THREE.Vector3[]=[];const n=96;const centreY=1.04+mouthPose.value*.20;
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,x=1.57*Math.cos(a),y=centreY+.23*(1-mouthPose.value)*(x/1.62)**2+(.052+amount*.40)*Math.sin(a);
   rim.push(new THREE.Vector3(x,y,THREE.MathUtils.lerp(surface(x,y),.84+.7*(y-centreY),mouthPose.value)+.025));
  }
  for(let pass=0;pass<8;pass++){const z=rim.map(p=>p.z);rim.forEach((p,i)=>p.z=(z[(i+n-2)%n]+2*z[(i+n-1)%n]+3*z[i]+2*z[(i+1)%n]+z[(i+2)%n])/9);}
  const curve=new THREE.CatmullRomCurve3(rim,true,'centripetal');
  lip.geometry.dispose();lip.geometry=new THREE.TubeGeometry(curve,192,.0705,12,true);
  // A concave bowl with a shaded throat, rather than a flat disk or stretched lip faces.
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];const rings=16;
  const rimColour=new THREE.Color('#93404c'),throatColour=new THREE.Color('#29131e');
  for(let r=0;r<=rings;r++){
   const t=r/rings,k=1-t;
   for(let i=0;i<n;i++){
    const edge=rim[i];positions.push(edge.x*k,centreY+(edge.y-centreY)*k,THREE.MathUtils.lerp(edge.z-.025,THREE.MathUtils.lerp(surface(0,centreY),.84,mouthPose.value)-.62,Math.sin(t*Math.PI/2)));
    const c=rimColour.clone().lerp(throatColour,Math.min(1,t*1.4));colors.push(c.r,c.g,c.b);
    if(r<rings){const j=r*n+i,q=r*n+(i+1)%n;indices.push(j,q,j+n,q,q+n,j+n);}
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();mouth.geometry.dispose();mouth.geometry=g;
  (mouth.material as THREE.MeshStandardMaterial).vertexColors=true;(mouth.material as THREE.MeshStandardMaterial).color.set('#ffffff');
 }

 // Rotate about the original Blender face centre; never translate the head away from the torso.
 const head=new THREE.Group(),pivot=new THREE.Vector3(0,1.38,.18);head.position.copy(pivot);
 const torso=frog.children.find(part=>/stationary[ _]torso/i.test(part.name))!;
 const torsoBounds=new THREE.Box3().setFromObject(torso);
 const glasses=frog.children.filter(part=>/rim|bridge|temple/i.test(part.name));
 const headParts=[...frog.children].filter(part=>!/stationary[ _]torso/i.test(part.name));
 frog.add(head);
 for(const part of headParts){head.add(part);part.position.sub(pivot);}
 const pageMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const page=new THREE.Mesh(new THREE.PlaneGeometry(1,1),pageMaterial);page.visible=false;scene.add(page);
 renderer.localClippingEnabled=true;
 const openingValue=()=>mouthPose.value;
 let mouthWorld=new THREE.Vector3(),lastSize=1;
 const swallowPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 pageMaterial.clippingPlanes=[swallowPlane];
 const rig=new THREE.Group();scene.remove(frog);rig.add(frog);scene.add(rig);frog.position.set(0,-1.04,0);
 return {
  attach(host:HTMLElement){host.append(renderer.domElement);renderer.setSize(innerWidth,innerHeight);camera.right=innerWidth;camera.top=innerHeight;camera.updateProjectionMatrix();},
  setPaper(texture:HTMLCanvasElement,width:number,height:number){pageMaterial.map?.dispose();pageMaterial.map=new THREE.CanvasTexture(texture);pageMaterial.map.colorSpace=THREE.SRGBColorSpace;pageMaterial.needsUpdate=true;page.scale.set(width,height,1);},
  paper(x:number,top:number,rotation:number){page.visible=true;page.position.set(x,innerHeight-top-page.scale.y/2,mouthWorld.z-.12*lastSize);page.rotation.z=-rotation;// Let the front lip and recessed bowl occlude the sheet in depth.
   // The safety clip sits below the lip, never across the visible mouth.
   swallowPlane.constant=-(mouthWorld.y-lastSize*.42);renderer.render(scene,camera);},
  smile(amount:number){
   if(!oldLips||!restingLips)return;
   const positions=oldLips.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<positions.count;i++){
    const x=restingLips[i*3],baseY=restingLips[i*3+1];
    const y=baseY+amount*(.14*(x/1.57)**2-.025);
    positions.setXYZ(i,x,y,restingLips[i*3+2]+surface(x,y)-surface(x,baseY));
   }
   positions.needsUpdate=true;oldLips.geometry.computeVertexNormals();
  },
  hidePaper(){page.visible=false;renderer.render(scene,camera);},
  width:modelWidth,
  mouthWidth:3.14,
  topOffset:restingBounds.max.y-1.04,
  pose(x:number,y:number,size:number,turn:number,opening:number,squash=1,tilt=0,bodySquash=1,roll=0){
   rig.position.set(x,innerHeight-y,0);rig.scale.set(size/squash,size*squash,size);rig.rotation.set(0,turn,roll);
   torso.scale.set(1+(1-bodySquash)*.25,bodySquash,1);
   torso.position.y=torsoBounds.min.y*(1-bodySquash);
   head.position.y=pivot.y-(torsoBounds.max.y-torsoBounds.min.y)*(1-bodySquash);
   head.rotation.x=-tilt;mouthPose.value=Math.sin(tilt);
   // Keep the lower frames above the open lip; head rotation then places them behind it.
   for(const frame of glasses)frame.position.y=-pivot.y+.55*Math.sin(tilt);
   open(THREE.MathUtils.clamp(opening/(Math.PI/2),0,1));renderer.render(scene,camera);
   const centre=head.localToWorld(new THREE.Vector3(0,1.04+openingValue()*.20,THREE.MathUtils.lerp(surface(0,1.04+openingValue()*.20),.84,openingValue())).sub(pivot));mouthWorld.copy(centre);lastSize=size;
   return {x:centre.x,y:innerHeight-centre.y,width:3.14*size};
  },
  dispose(){page.geometry.dispose();pageMaterial.map?.dispose();pageMaterial.dispose();frog.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});bump.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
 };
}
