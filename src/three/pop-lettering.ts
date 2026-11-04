import * as THREE from 'three';
/** Rounded inflated letter strokes, rendered once with the same palette as Eaty. */
export function createPopLettering(text='POP IT!',colour='#e7484d'){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(1200,420);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.7,9.1,2.65,-.78,.1,100);camera.position.set(0,0,15);
 const material=new THREE.MeshPhysicalMaterial({color:colour,roughness:.22,metalness:0,clearcoat:1,clearcoatRoughness:.13});
 scene.add(new THREE.HemisphereLight(0xffffff,0x713c43,2));const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(-3,5,8);scene.add(light);const rim=new THREE.DirectionalLight(0xffccd5,2);rim.position.set(5,1,4);scene.add(rim);
 const group=new THREE.Group();scene.add(group);
 let letter=new THREE.Group();
 function start(x:number,y:number,scale:number,tilt:number,z:number){letter=new THREE.Group();letter.position.set(x,y,z);letter.scale.setScalar(scale);letter.rotation.z=tilt;group.add(letter);}
 function stroke(points:number[][],radius=.34){
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0)));
  const geometry=new THREE.TubeGeometry(curve,80,radius,24,false),positions=geometry.getAttribute('position') as THREE.BufferAttribute;
  geometry.computeVertexNormals();letter.add(new THREE.Mesh(geometry,material));
  for(const point of [points[0],points[points.length-1]]){const end=new THREE.Mesh(new THREE.SphereGeometry(radius,24,20),material);end.position.set(point[0],point[1],0);letter.add(end);}

 }
 function p(){stroke([[0,0],[0,.8],[0,1.65]],.36);stroke([[.12,1.62],[.7,1.78],[1.02,1.35],[.75,.86],[.05,.82]],.34);}
 start(.1,.05,1.13,-.16,.05);p();
 start(1.75,-.05,.98,.14,.22);stroke([[.5,.05],[-.03,.35],[-.08,1],[.23,1.63],[.8,1.64],[1.07,1.05],[.98,.4],[.5,.05]],.38);
 start(3.25,.12,1.05,-.18,.05);p();
 start(4.95,-.08,.9,-.12,.3);stroke([[.15,0],[.15,.85],[.15,1.7]],.4);
 start(5.65,.08,1.03,.14,.12);stroke([[0,1.65],[.6,1.73],[1.28,1.58]],.35);stroke([[.65,1.6],[.65,.8],[.65,0]],.38);
 start(7.4,.03,1.05,-.19,.2);stroke([[.15,1.75],[.15,1.2],[.15,.7]],.32);stroke([[.12,.02],[.15,.08]],.3);
 if(text!=='POP IT!'){
  for(const child of [...group.children]){child.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});group.remove(child);}
  const shapes:Record<string,number[][][]>={Y:[[[0,1.7],[.5,.9],[1,1.7]],[[.5,.9],[.5,0]]],M:[[[0,0],[0,1.7],[.6,.95],[1.2,1.7],[1.2,0]]],H:[[[0,0],[0,1.7]],[[1,0],[1,1.7]],[[0,.85],[1,.85]]],C:[[[1,1.5],[.5,1.7],[0,1.3],[0,.4],[.5,0],[1,.2]]],L:[[[0,1.7],[0,0],[1,0]]],I:[[[.5,1.7],[.5,0]]],K:[[[0,1.7],[0,0]],[[1,1.7],[0,.8],[1,0]]],T:[[[0,1.7],[1.2,1.7]],[[.6,1.7],[.6,0]]],O:[[[.5,0],[0,.3],[0,1.4],[.5,1.7],[1,1.4],[1,.3],[.5,0]]],N:[[[0,0],[0,1.7],[1,0],[1,1.7]]],U:[[[0,1.7],[0,.3],[.5,0],[1,.3],[1,1.7]]],E:[[[1,1.7],[0,1.7],[0,0],[1,0]],[[0,.85],[.8,.85]]],'!':[[[.2,1.85],[.2,1.25],[.2,.85]],[[.2,0],[.2,.02]]],'.':[[[.2,0],[.2,.02]]]};
  for(const character of text){if(character===' ')continue;start(0,0,1,0,0);for(const points of shapes[character]??[])stroke(points,.34);}
 }
 const breaks=text==='POP IT!'?[3]:[5,7];
 // A single arch carries the word; strokes themselves remain smooth and steady.
 let right=0;
 group.children.forEach((glyph,i)=>{
  const t=i/(group.children.length-1);glyph.position.set(0,.36*Math.sin(Math.PI*t),0);glyph.rotation.z=.14*(1-2*t);
  glyph.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(glyph);
  if(breaks.includes(i))right+=.6;
  glyph.position.x=right-box.min.x;
  // Match silhouettes at shared heights, rather than spacing their bounding boxes.
  if(i>0&&!breaks.includes(i)){
   const previous=group.children[i-1];previous.updateMatrixWorld(true);glyph.updateMatrixWorld(true);
   const leftEdges=new Map<number,number>(),rightEdges=new Map<number,number>();
   function edges(object:THREE.Object3D,map:Map<number,number>,max:boolean){object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;const positions=node.geometry.getAttribute('position');for(let j=0;j<positions.count;j++){const v=new THREE.Vector3().fromBufferAttribute(positions,j).applyMatrix4(node.matrixWorld),row=Math.round(v.y*100);map.set(row,max?Math.max(map.get(row)??-Infinity,v.x):Math.min(map.get(row)??Infinity,v.x));}});}
   edges(previous,rightEdges,true);edges(glyph,leftEdges,false);let gap=Infinity;
   leftEdges.forEach((x,row)=>{const edge=rightEdges.get(row);if(edge!==undefined)gap=Math.min(gap,x-edge);});
   if(Number.isFinite(gap))glyph.position.x-=gap;
  }
  glyph.updateMatrixWorld(true);right=new THREE.Box3().setFromObject(glyph).max.x;
 });
 group.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(group),centre=bounds.getCenter(new THREE.Vector3());
 const span=Math.max(bounds.max.x-bounds.min.x+.4,(bounds.max.y-bounds.min.y+.4)*1200/420);
 camera.left=centre.x-span/2;camera.right=centre.x+span/2;camera.top=centre.y+span*420/2400;camera.bottom=centre.y-span*420/2400;camera.updateProjectionMatrix();
 if(text!=='POP IT!'){const width=bounds.max.x-bounds.min.x+.4;const height=3.43;renderer.setSize(Math.ceil(width/height*420),420);camera.left=bounds.min.x-.2;camera.right=bounds.max.x+.2;camera.top=bounds.max.y+.2;camera.bottom=camera.top-height;camera.updateProjectionMatrix();}
 renderer.render(scene,camera);
 const image=document.createElement('img');image.src=renderer.domElement.toDataURL();image.alt=text;image.className='pop-lettering';
 group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});material.dispose();renderer.dispose();renderer.forceContextLoss();return image;
}
