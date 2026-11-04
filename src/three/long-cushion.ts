import * as THREE from 'three';
import {cushionSettings as cfg} from '../config/cushion';

/** Constant-radius end caps; additional width is inserted only into the body. */
export function longCushionGeometry(width:number,height:number,pressX=0,pressY=0){
 const radius=height*.49,halfBody=Math.max(0,width*.49-radius),depth=height*cfg.depth;
 const capSteps=24,bodySteps=Math.min(384,Math.max(24,Math.ceil(halfBody*2/height*18))),around=64;
 const sections:{x:number;r:number}[]=[];
 for(let i=0;i<=capSteps;i++){const a=-Math.PI/2+i/capSteps*Math.PI/2;sections.push({x:-halfBody+radius*Math.sin(a),r:Math.cos(a)});}
 for(let i=1;i<bodySteps;i++)sections.push({x:-halfBody+2*halfBody*i/bodySteps,r:1});
 for(let i=0;i<=capSteps;i++){const a=i/capSteps*Math.PI/2;sections.push({x:halfBody+radius*Math.sin(a),r:Math.cos(a)});}
 const vertices:number[]=[],uv:number[]=[],indices:number[]=[];
 for(const row of sections)for(let j=0;j<=around;j++){const a=j/around*Math.PI*2;vertices.push(row.x,radius*row.r*Math.cos(a),depth*row.r*Math.sin(a));uv.push(row.x/64+.5,radius*row.r*Math.cos(a)/64+.5);}
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<around;j++){const a=i*(around+1)+j,b=a+around+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.morphTargetsRelative=true;
 const base=g.getAttribute('position'),normal=g.getAttribute('normal');
 // All deformation distances use height, never the button's total width.
 for(const gathered of [false,true]){
  const target=g.clone(),p=target.getAttribute('position') as THREE.BufferAttribute;
  for(let i=0;i<p.count;i++){
   const x=base.getX(i),y=base.getY(i),z=base.getZ(i),dx=x-pressX,dy=y-pressY;
   const u=dx/height,v=dy/height,r=Math.hypot(u,v),angle=Math.atan2(v,u);
   const local=Math.exp(-r*r*7),front=THREE.MathUtils.smoothstep(z,-depth*.1,depth*.6);
   const centre=Math.exp(-r*r*14);
   const fold=Math.pow(.5+.5*Math.cos(4*angle+.2*Math.sin(3*angle)),14);
   const fine=.035*Math.pow(.5+.5*Math.cos(19*angle+r*5),14);
   const crease=(fold+fine)*Math.exp(-(((r-.28)/.22)**2))*THREE.MathUtils.smoothstep(r,.04,.15);
   const dent=height*cfg.dentDepth*centre*(gathered?1:.65);
   const shrink=gathered?cfg.sidePull*.35*local:0;
   p.setXYZ(i,x-dx*shrink*.3,y-dy*shrink,z-front*(dent+(gathered?height*cfg.creaseDepth*crease:0)));
  }
  target.computeVertexNormals();const tn=target.getAttribute('normal'),dp=new Float32Array(p.count*3),dn=new Float32Array(p.count*3);
  for(let i=0;i<dp.length;i++){dp[i]=p.array[i]-base.array[i];dn[i]=tn.array[i]-normal.array[i];}
  (g.morphAttributes.position??=[]).push(new THREE.Float32BufferAttribute(dp,3));(g.morphAttributes.normal??=[]).push(new THREE.Float32BufferAttribute(dn,3));target.dispose();
 }
 g.computeBoundingSphere();return g;
}
