import {playSound} from '../ui/sounds';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { homeSettings as cfg } from '../config/home';
export type FrogView={click():Promise<void>;deliver():Promise<void>;lift(panel:HTMLElement,reverse?:boolean,holdAtBottom?:boolean):Promise<void>;releaseHold():void;reset():void;setVisible(v:boolean):void};
/** One timeline drives the tongue and document, so their contact never drifts. */
export async function createFrog(host:HTMLElement):Promise<FrogView>{
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera();camera.position.z=2000;
 scene.add(new THREE.HemisphereLight(0xffffff,0x807b78,1.25));const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(-300,500,1000);scene.add(key);
 const asset=await new GLTFLoader().loadAsync(cfg.frogUrl);const frog=new THREE.Group();scene.add(frog);asset.scene.updateMatrixWorld(true);
 const foam=document.createElement('canvas');foam.width=foam.height=128;const ctx=foam.getContext('2d')!;const pixels=ctx.createImageData(128,128);for(let i=0;i<pixels.data.length;i+=4){const n=100+Math.random()*90;pixels.data.set([n,n,n,255],i);}ctx.putImageData(pixels,0,0);const bump=new THREE.CanvasTexture(foam);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(8,8);
 // Cut the opening in the surface shader instead of tearing connected triangles.
 const opening={value:0};let oldTongue:THREE.Mesh|undefined,oldLips:THREE.Mesh|undefined,face:THREE.Mesh|undefined;
 asset.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
  const mesh=new THREE.Mesh(o.geometry.clone().applyMatrix4(o.matrixWorld),(o.material as THREE.MeshStandardMaterial).clone());mesh.name=o.name;
  const mat=mesh.material as THREE.MeshStandardMaterial;
  if(/torso|face/i.test(o.name)&&!/cheek/i.test(o.name)){
   face=mesh;mat.color.set('#fcf068');mat.roughness=.62;mat.bumpMap=bump;mat.bumpScale=.018;
   mat.onBeforeCompile=shader=>{
    shader.uniforms.mouthOpen=opening;
    shader.vertexShader='varying vec3 mouthPosition; uniform float mouthOpen;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     mouthPosition=position;
     float upperFace=max(0.0,position.y-(1.04+0.23*pow(position.x/1.62,2.0)));
     transformed.y+=mouthOpen*upperFace*0.2;`);
    shader.fragmentShader='varying vec3 mouthPosition; uniform float mouthOpen;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
     float mx=mouthPosition.x/1.57;
     float seam=1.04+0.23*pow(mouthPosition.x/1.62,2.0);
     float halfHeight=0.052+mouthOpen*0.53;
     float my=(mouthPosition.y-seam)/halfHeight;
     if(mouthOpen>0.001 && mouthPosition.z>0.0 && mx*mx+my*my<1.0) discard;`);
   };mat.customProgramCacheKey=()=> 'frog-mouth-opening-v2';
  }
  if(/lip/i.test(o.name))oldLips=mesh;
  if(/tongue/i.test(o.name)){oldTongue=mesh;mat.color.set('#f7c9de');mat.roughness=.18;}
  frog.add(mesh);
 });
 // These rigid details were left behind while the face shader lifted the skin.
 const upperFeatures=frog.children.filter((part):part is THREE.Mesh=>part instanceof THREE.Mesh&&/eye|pupil|rim|bridge|temple|cheek/i.test(part.name));
 const eyeBounds=new THREE.Box3();
 for(const part of upperFeatures)if(/ivory eye/i.test(part.name)){part.geometry.computeBoundingBox();eyeBounds.union(part.geometry.boundingBox!);}
 const eyeCentre=eyeBounds.isEmpty()?new THREE.Vector3(0,2.2,0):eyeBounds.getCenter(new THREE.Vector3());
 const featureLift=Math.max(0,eyeCentre.y-(1.04+.23*(eyeCentre.x/1.62)**2))*.2;
 const feetBounds=new THREE.Box3();
 frog.children.forEach(part=>{if(part instanceof THREE.Mesh&&/leg|foot|paw/i.test(part.name)){part.geometry.computeBoundingBox();feetBounds.union(part.geometry.boundingBox!);}});
 const feetY=(feetBounds.isEmpty()?new THREE.Box3().setFromObject(frog):feetBounds).min.y;
 let expanding:Promise<void>|undefined;
 // Sample the face so both lip corners sit on the actual skin surface.
 frog.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),sampleSurface=(x:number,y:number)=>{
  if(!face)return .9;
  const origin=face.localToWorld(new THREE.Vector3(x,y,5));ray.set(origin,new THREE.Vector3(0,0,-1));
  const hit=ray.intersectObject(face,false)[0];return hit?face.worldToLocal(hit.point.clone()).z:.9;
 };
 // Cache the skin depth once; animation frames only interpolate this small grid.
 const gridX=32,gridY=24,depths:number[]=[];
 for(let j=0;j<=gridY;j++)for(let i=0;i<=gridX;i++)depths.push(sampleSurface(-1.65+3.3*i/gridX,.4+1.6*j/gridY));
 const surface=(x:number,y:number)=>{
  const u=THREE.MathUtils.clamp((x+1.65)/3.3*gridX,0,gridX-.00001),v=THREE.MathUtils.clamp((y-.4)/1.6*gridY,0,gridY-.00001);
  const i=Math.floor(u),j=Math.floor(v),k=j*(gridX+1)+i;
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(depths[k],depths[k+1],u-i),THREE.MathUtils.lerp(depths[k+gridX+1],depths[k+gridX+2],u-i),v-j);
 };
 const lip=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#e7484d',roughness:.3}));frog.add(lip);
 const mouth=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#652334',roughness:.48,side:THREE.DoubleSide}));frog.add(mouth);
 const tongue=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:'#f7c9de',roughness:.18,metalness:0,side:THREE.DoubleSide}));scene.add(tongue);tongue.visible=false;
 let mouthAmount=0;
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(100,135,12,12),new THREE.MeshStandardMaterial({color:'#fff9ec',side:THREE.DoubleSide,roughness:.9}));scene.add(paper);paper.visible=false;
 let visible=true,running=false,scale=1,cx=0,cy=0,rect:DOMRect;
 function layout(){const next=host.getBoundingClientRect();if(next.width&&next.height)rect=next;if(!rect)rect=new DOMRect(innerWidth*.36,innerHeight*.07,innerWidth*.4,innerHeight*.76);renderer.setSize(innerWidth,innerHeight);camera.left=0;camera.right=innerWidth;camera.top=innerHeight;camera.bottom=0;camera.near=.1;camera.far=4000;camera.updateProjectionMatrix();scale=Math.min(rect.width/4.8,rect.height/3.5);cx=rect.left+rect.width/2;cy=innerHeight-rect.top-rect.height*.5;frog.scale.setScalar(scale);frog.position.set(cx,cy-1.4*scale,0);host.parentElement?.style.setProperty('--eaty-ls',`${parseFloat(getComputedStyle(host.parentElement!).fontSize)*.65}px`);host.parentElement?.style.setProperty('--eaty-feet',`${innerHeight-(frog.position.y+feetY*scale)-rect.top}px`);}
 Object.assign(renderer.domElement.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',pointerEvents:'none'});
 function open(amount:number){
  for(const part of upperFeatures)part.position.y=amount*featureLift;
  frog.updateMatrixWorld(true);mouthAmount=amount;opening.value=amount;mouth.visible=lip.visible=amount>.001;if(oldLips)oldLips.visible=amount<=.001;
  if(amount<=.001)return;
  const rim:THREE.Vector3[]=[];const n=96;
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,x=1.57*Math.cos(a),y=1.04+.23*(x/1.62)**2+(.052+amount*.53)*Math.sin(a);
   rim.push(new THREE.Vector3(x,y,surface(x,y)+.025));
  }
  const curve=new THREE.CatmullRomCurve3(rim,true,'centripetal');
  lip.geometry.dispose();lip.geometry=new THREE.TubeGeometry(curve,192,.0705,12,true);
  // A concave bowl with a shaded throat, rather than a flat disk or stretched lip faces.
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];const rings=16;
  const rimColour=new THREE.Color('#93404c'),throatColour=new THREE.Color('#29131e');
  for(let r=0;r<=rings;r++){
   const t=r/rings,k=1-t;
   for(let i=0;i<n;i++){
    const edge=rim[i];positions.push(edge.x*k,1.04+(edge.y-1.04)*k,THREE.MathUtils.lerp(edge.z-.025,surface(0,1.04)-.62,Math.sin(t*Math.PI/2)));
    const c=rimColour.clone().lerp(throatColour,Math.min(1,t*1.4));colors.push(c.r,c.g,c.b);
    if(r<rings){const j=r*n+i,q=r*n+(i+1)%n;indices.push(j,q,j+n,q,q+n,j+n);}
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();mouth.geometry.dispose();mouth.geometry=g;
  (mouth.material as THREE.MeshStandardMaterial).vertexColors=true;(mouth.material as THREE.MeshStandardMaterial).color.set('#ffffff');
 }
 function rope(end:THREE.Vector3){
  // Ribbon starts inside the mouth, crosses the lower lip, and has a sealed rounded tip.
  const rootY=1.04,rootZ=surface(0,rootY);
  const start=new THREE.Vector3(cx,cy+(rootY-1.4)*scale,(rootZ-.15)*scale);
  const exit=new THREE.Vector3(cx,cy+(1.04-mouthAmount*.53-1.4)*scale,(rootZ+.16)*scale);
  const curve=new THREE.CatmullRomCurve3([start,exit,exit.clone().lerp(end,.5).add(new THREE.Vector3(.13*scale,0,.08*scale)),end]);
  const points:number[]=[],indices:number[]=[];const rings=72,sides=16;
  for(let i=0;i<=rings;i++){
   const t=i/rings,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   const side=new THREE.Vector3(tangent.y,-tangent.x,0).normalize();if(side.lengthSq()<.01)side.set(1,0,0);
   const normal=new THREE.Vector3().crossVectors(tangent,side).normalize();
   const cap=t>.9?Math.sqrt(Math.max(.00001,1-((t-.9)/.1)**2)):1;
   const width=scale*.24*cap,thickness=scale*.045*cap;
   for(let j=0;j<sides;j++){
    const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(side,Math.cos(a)*width).addScaledVector(normal,Math.sin(a)*thickness);points.push(v.x,v.y,v.z);
    if(i<rings){const k=i*sides+j,q=i*sides+(j+1)%sides;indices.push(k,q,k+sides,q,q+sides,k+sides);}
   }
  }
  for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const k=rings*sides;indices.push(k,k+j,k+j+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();tongue.geometry.dispose();tongue.geometry=geo;tongue.visible=true;if(oldTongue)oldTongue.visible=false;
 }
 function render(){renderer.render(scene,camera);}
 async function tween(ms:number,fn:(p:number)=>void){const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;await new Promise<void>(resolve=>{const start=performance.now();function frame(now:number){const p=reduced?1:Math.min(1,(now-start)/ms);fn(p);render();if(p<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});}
 function expand(){
  if(expanding)return expanding;
  if(running)return Promise.resolve();
  const poses=[[0,1,1],[.22,.97,.94],[.58,1.04,1.08],[1,1,1]];
  expanding=tween(430,p=>{let i=1;while(i<poses.length-1&&p>poses[i][0])i++;const a=poses[i-1],b=poses[i],t=(p-a[0])/(b[0]-a[0]),e=1-(1-t)**3;frog.scale.set(scale*THREE.MathUtils.lerp(a[1],b[1],e),scale*THREE.MathUtils.lerp(a[2],b[2],e),scale);}).finally(()=>{frog.scale.setScalar(scale);expanding=undefined;render();});
  return expanding;
 }
 let holdingAtBottom=false;
 function reset(){holdingAtBottom=false;open(0);tongue.visible=paper.visible=false;if(oldTongue)oldTongue.visible=true;running=false;host.append(renderer.domElement);renderer.domElement.style.zIndex='';renderer.domElement.style.display=visible?'':'none';layout();render();}
 function foreground(){layout();running=true;document.body.append(renderer.domElement);renderer.domElement.style.zIndex='0';renderer.domElement.style.display='';}
 reset();new ResizeObserver(()=>{if(!running){layout();render();}}).observe(host);
 return {setVisible(v){visible=v;if(!running)renderer.domElement.style.display=v?'':'none';},reset,releaseHold(){if(holdingAtBottom)reset();},click:expand,async deliver(){let licked=false;await expanding;foreground();paper.visible=true;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)playSound('paper',cfg.dropMs*1.1/1000);const dropY=(p:number)=>innerHeight+100-(innerHeight+200)*p*p;const crossing=(target:number)=>Math.sqrt(THREE.MathUtils.clamp((innerHeight+100-target)/(innerHeight+200),0,1));const eyesY=cy+.45*scale,legsY=cy-1.15*scale,eyesAt=crossing(eyesY),legsAt=crossing(legsY);await tween(cfg.dropMs*1.1,p=>{const y=dropY(p),mouthProgress=THREE.MathUtils.clamp((p-eyesAt)/Math.max(.001,1-eyesAt),0,1),tongueProgress=THREE.MathUtils.clamp((p-legsAt)/Math.max(.001,1-legsAt),0,1);open(Math.sin(mouthProgress*Math.PI/2));paper.position.set(cx,y,150);paper.rotation.z=Math.sin(p*Math.PI*2)*.12;if(p>=legsAt){if(!licked){licked=true;playSound('lick');}rope(new THREE.Vector3(cx,cy*(1-tongueProgress),140));}else tongue.visible=false;});/* Hold the caught pose at the canvas bottom while openReader loads the PDF. */},async lift(panel,reverse=false,holdAtBottom=false){
  let keepExtended=false;
  const needsReach=!tongue.visible;
  foreground();paper.visible=false;frog.visible=true;
  panel.getAnimations().forEach(a=>a.cancel());panel.style.willChange='transform';
  panel.style.transform='';
  const resting=panel.getBoundingClientRect(),distance=Math.max(0,innerHeight-resting.top);
  const topY=innerHeight-resting.top;
  const positionPage=(travel:number)=>{
   panel.style.transform=`translateY(${travel*distance}px)`;
   // Tip meets the page just beneath its leading edge, behind the opaque reader.
   return new THREE.Vector3(cx,topY-travel*distance-2,140);
  };
  positionPage(reverse?0:1);panel.style.visibility='';
  try{
   if(needsReach&&!reverse)playSound('lick');
   if(reverse){
    // Reach the existing page before carrying it down.
    await tween(cfg.returnMs*.15,p=>{open(p);if(p>.001)rope(positionPage(0));});
   }else if(needsReach){
    const start=new THREE.Vector3(cx,cy+(1.04-1.4)*scale,140),end=positionPage(1);
    await tween(cfg.dropMs*.7,p=>{const t=p*p*(3-2*p);open(Math.min(1,p*2));rope(start.clone().lerp(end,t));});
   }else{open(1);rope(positionPage(1));render();}
   // Moving a panel is not a tongue withdrawal. A history-to-PDF handoff
   // keeps the tongue extended, so neither half of that switch plays retract.
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)playSound(reverse?'windowDown':'windowUp',(reverse?cfg.returnMs:cfg.liftMs)*1.1/1000);
   await tween((reverse?cfg.returnMs:cfg.liftMs)*1.1,p=>{
    const t=p*p*(3-2*p),travel=reverse?t:1-t;
    open(1);rope(positionPage(travel));
   });
   if(reverse){
    panel.style.visibility='hidden';
    if(holdAtBottom){panel.hidden=true;keepExtended=holdingAtBottom=true;return;}
    const from=new THREE.Vector3(cx,-2,140);
    const to=new THREE.Vector3(cx,cy+(1.04-1.4)*scale,(surface(0,1.04)-.15)*scale);
    playSound('retract',cfg.returnMs*.35/1000);
    // Pull the entire visible ribbon back first; then close the mouth around it.
    await tween(cfg.returnMs*.35,p=>{
     const t=p*p*(3-2*p);
     open(1-THREE.MathUtils.smoothstep(p,.55,1));
     if(p<.98)rope(from.clone().lerp(to,t));else tongue.visible=false;
    });
    panel.hidden=true;
   }
  }finally{
   frog.visible=true;panel.style.transform='';panel.style.willChange='';if(!keepExtended)reset();
  }
 }};
}
