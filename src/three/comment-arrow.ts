import * as THREE from 'three';
import {loader,studio} from './about-assets';
const cache=new Map<string,Promise<string[]>>();
/** Bake the arrow with the cursor's exported foam material, plus a genuine creased dent. */
export function commentArrowArt(colour='#fcf068'){const old=cache.get(colour);if(old)return old;const result=(async()=>{
 const asset=await loader.loadAsync(import.meta.env.BASE_URL+'models/round-button-click.glb');
 let material:THREE.MeshStandardMaterial|undefined;
 asset.scene.traverse(o=>{if(!material&&o instanceof THREE.Mesh){const m=Array.isArray(o.material)?o.material[0]:o.material;if(m instanceof THREE.MeshStandardMaterial)material=m.clone();}});
 if(!material)throw new Error('Cursor foam material missing');material.color.set(colour);material.envMapIntensity=.8;
 const shape=new THREE.Shape();shape.moveTo(-1,0);shape.quadraticCurveTo(-1.04,.08,-.86,.2);shape.lineTo(-.32,.64);shape.quadraticCurveTo(-.12,.78,.05,.6);shape.lineTo(.78,.6);shape.quadraticCurveTo(1,.6,1,.36);shape.lineTo(1,-.36);shape.quadraticCurveTo(1,-.6,.78,-.6);shape.lineTo(.05,-.6);shape.quadraticCurveTo(-.12,-.78,-.32,-.64);shape.lineTo(-.86,-.2);shape.quadraticCurveTo(-1.04,-.08,-1,0);
 const outline=shape.getPoints(24);
 function radius(dx:number,dy:number){let nearest=Infinity;for(let i=0;i<outline.length-1;i++){const a=outline[i],b=outline[i+1],ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-8)continue;const t=(a.x*ey-a.y*ex)/den,u=(a.x*dy-a.y*dx)/den;if(t>0&&u>=0&&u<=1)nearest=Math.min(nearest,t);}return Number.isFinite(nearest)?nearest:1;}
 const geometry=new THREE.SphereGeometry(1,128,64),p=geometry.getAttribute('position');
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y),edge=radius(x/(r||1),y/(r||1));p.setXYZ(i,x*edge,y*edge,z*.34);}
 geometry.computeVertexNormals();const base=new Float32Array(p.array),s=studio(),mesh=new THREE.Mesh(geometry,material);s.scene.add(mesh);
 s.camera.left=-1.12;s.camera.right=1.12;s.camera.top=.84;s.camera.bottom=-.84;s.camera.position.z=5;s.camera.updateProjectionMatrix();s.renderer.setPixelRatio(1);s.renderer.setSize(224,168,false);
 const frames:string[]=[];
 for(let frame=0;frame<=12;frame++){const weight=frame/12;for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],r=Math.hypot(x,y)/.7,theta=Math.atan2(y,x),front=THREE.MathUtils.smoothstep(z,0,.18);const dent=.24*Math.exp(-r*r*2),fold=.085*Math.exp(-(((r-.65)/.45)**2))*Math.pow(.5+.5*Math.cos(theta*9+r),5);p.setXYZ(i,x,y,z-weight*front*(dent+fold));}p.needsUpdate=true;geometry.computeVertexNormals();s.renderer.render(s.scene,s.camera);frames.push(s.renderer.domElement.toDataURL('image/png'));}
 geometry.dispose();material.dispose();s.dispose();return frames;
})();cache.set(colour,result);return result;}
export async function pressCommentArrow(img:HTMLImageElement){const frames=await commentArrowArt();if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;await new Promise<void>(resolve=>{const start=performance.now();function tick(now:number){const t=Math.min(1,(now-start)/650),weight=Math.sin(Math.PI*t)**2;img.src=frames[Math.round(weight*12)];if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});}
