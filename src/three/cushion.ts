import * as THREE from 'three';
import {cushionSettings as cfg} from '../config/cushion';

let foam:THREE.DataTexture|undefined;
function foamNormals(){
 if(foam)return foam;
 const size=128,data=new Uint8Array(size*size*4);let seed=53;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<size*size;i++){const x=(random()-.5)*.45,y=(random()-.5)*.45;data[i*4]=Math.round((x*.5+.5)*255);data[i*4+1]=Math.round((y*.5+.5)*255);data[i*4+2]=Math.round((Math.sqrt(1-x*x-y*y)*.5+.5)*255);data[i*4+3]=255;}
 foam=new THREE.DataTexture(data,size,size);foam.wrapS=foam.wrapT=THREE.RepeatWrapping;foam.generateMipmaps=true;foam.minFilter=THREE.LinearMipmapLinearFilter;foam.magFilter=THREE.LinearFilter;foam.needsUpdate=true;return foam;
}
/** Neutral, palette-preserving light: normals still shade the dome and creases. */
export function cushionMaterial(colour:string){
 const material=new THREE.MeshStandardMaterial({color:colour,normalMap:foamNormals(),roughness:.88,metalness:0,toneMapped:false});
 material.normalScale.setScalar(cfg.grainStrength);
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
  float key = max(0.0, dot(normal, normalize(vec3(-0.35, 0.48, 1.0))));
  float rim = pow(1.0 - abs(normal.z), 2.0);
  float shade = (0.36 + 0.64 * smoothstep(0.0, 0.85, key)) * (1.0 - ${cfg.edgeShade.toFixed(3)} * rim);
  float sheen = pow(max(0.0, dot(normal, normalize(vec3(-0.24, 0.4, 1.0)))), 18.0) * ${cfg.highlightStrength.toFixed(3)};
  vec3 outgoingLight = diffuseColor.rgb * shade + (vec3(1.0) - diffuseColor.rgb) * sheen;
 `);};
 material.customProgramCacheKey=()=> 'inflatable-capsule-neutral-v4';return material;
}

/** Closed, domed pillow with two baked GPU morphs: initial dent, then edge gathering. */
export function cushionGeometry(width:number,height:number,tilted=true){
 const segments=192,rings=64,short=Math.min(width,height),depth=short*cfg.depth;
 const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let j=0;j<=rings;j++){
  const phi=Math.PI*j/rings,rad=Math.sin(phi)**.92;
  for(let i=0;i<=segments;i++){
   const theta=2*Math.PI*i/segments,c=Math.cos(theta),s=Math.sin(theta);
   // Ray intersection with a stadium: truly semicircular ends, no box corners.
   const horizontal=width>=height, radius=short*.495;
   const straight=Math.abs(width-height)*.495;
   const along=Math.abs(horizontal?c:s),across=Math.abs(horizontal?s:c);
   const side=across>1e-8?radius/across:Infinity;
   const boundary=side*along<=straight?side:
     straight*along+Math.sqrt(Math.max(0,radius*radius-straight*straight*across*across));
   const x=boundary*c*rad,y=boundary*s*rad;
   const z=depth*Math.cos(phi);
   vertices.push(x,y,z);uvs.push(x/64+.5,y/64+.5);
  }
 }
 for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.morphTargetsRelative=true;
 for(const gathered of [false,true]){
  const target=geometry.clone(),p=target.getAttribute('position') as THREE.BufferAttribute,base=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
  for(let i=0;i<p.count;i++){
   const x=base.getX(i),y=base.getY(i),z=base.getZ(i),u=x/(width/2),v=y/(height/2);
   const r=Math.hypot(u,v),angle=Math.atan2(v,u),front=THREE.MathUtils.smoothstep(z,-depth*.5,depth*.55);
   const centre=Math.exp(-((x/(short*.33))**2+(y/(short*.34))**2)*1.35);
   const surfaceRadius=Math.sin(Math.PI*Math.floor(i/(segments+1))/rings)**.92;
   // Restore the earlier radial squeeze, excluding the two horizontal side channels.
   const radialFold=Math.pow(.5+.5*Math.cos(4*angle+.24*Math.sin(3*angle)+r*.24),10);
   const horizontalMask=THREE.MathUtils.smoothstep(Math.abs(v),.10,.32);
   const folds=radialFold*horizontalMask;
   const wrinkles=.035*Math.pow(.5+.5*Math.cos(19*angle+.8*Math.sin(5*angle)+r*2),12);
   const envelope=THREE.MathUtils.smoothstep(surfaceRadius,.08,.35);
   const centralBand=Math.exp(-(((surfaceRadius-.40)/.32)**2));
   const edge=THREE.MathUtils.smoothstep(surfaceRadius,.60,1);
   // Broad inward bows at top and bottom; rounded ends retain their fullness.
   const waist=Math.exp(-((u/.62)**2));
   const pullY=gathered?cfg.sidePull*.65*waist*envelope:.018;
   const pullX=gathered?.025*envelope:.018;
   const dent=short*cfg.dentDepth*centre*(gathered?1:.65);
   const crease=gathered?short*cfg.creaseDepth*(folds+wrinkles)*envelope*(centralBand*(1-edge)+.03*edge):0;
   const puff=gathered?short*.028*(1-folds)*envelope*front:0;
   p.setXYZ(i,x*(1-pullX),y*(1-pullY),z-front*(dent+crease)+puff);
  }
  target.computeVertexNormals();const tn=target.getAttribute('normal'),dp=new Float32Array(p.count*3),dn=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++)for(let c=0;c<3;c++){dp[i*3+c]=p.array[i*3+c]-base.array[i*3+c];dn[i*3+c]=tn.array[i*3+c]-n.array[i*3+c];}
  (geometry.morphAttributes.position??=[]).push(new THREE.Float32BufferAttribute(dp,3));(geometry.morphAttributes.normal??=[]).push(new THREE.Float32BufferAttribute(dn,3));target.dispose();
 }
 // Bake the same small viewing tilt into both poses, keeping their screen bounds inside the button.
 const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilted?cfg.viewTiltX:0,tilted?cfg.viewTiltY:0,0));
 const normalRotation=new THREE.Matrix3().setFromMatrix4(rotation);
 const pos=geometry.getAttribute('position') as THREE.BufferAttribute;
 pos.applyMatrix4(rotation);
 (geometry.getAttribute('normal') as THREE.BufferAttribute).applyNormalMatrix(normalRotation);
 let extentX=0,extentY=0;
 for(let i=0;i<pos.count;i++){extentX=Math.max(extentX,Math.abs(pos.getX(i)));extentY=Math.max(extentY,Math.abs(pos.getY(i)));}
 const fit=Math.min(width*.49/extentX,height*.49/extentY);
 const scale=new THREE.Matrix4().makeScale(fit,fit,fit);pos.applyMatrix4(scale);
 for(const morph of geometry.morphAttributes.position!){(morph as THREE.BufferAttribute).applyMatrix4(rotation).applyMatrix4(scale);}
 for(const morph of geometry.morphAttributes.normal!){(morph as THREE.BufferAttribute).applyMatrix3(normalRotation);}
 geometry.computeBoundingSphere();return geometry;
}
const ease=(v:number)=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
export function cushionWeights(t:number){
 const pressure=t>=1?0:t<.38?ease(t/.38):t<.56?1:1-ease((t-.56)/.44);
 const gathering=t<.16?0:t<.43?ease((t-.16)/.27):t<.6?1:1-ease((t-.6)/.4);
 return {dent:pressure*(1-gathering),gather:pressure*gathering,pressure};
}
