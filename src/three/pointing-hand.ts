import * as THREE from 'three';
/** Rounded, bevelled pointing hand. Fingertip is the local origin/hit point. */
export function createPointingHand(){
 const shape=new THREE.Shape();
 shape.moveTo(-.07,0);shape.bezierCurveTo(-.07,.09,.07,.09,.07,0);
 shape.lineTo(.07,-.36);shape.bezierCurveTo(.14,-.26,.24,-.30,.24,-.42);
 shape.bezierCurveTo(.32,-.32,.41,-.36,.41,-.48);
 shape.bezierCurveTo(.49,-.39,.57,-.45,.55,-.60);
 shape.bezierCurveTo(.54,-.76,.46,-.86,.43,-1.02);
 shape.quadraticCurveTo(.18,-1.10,-.02,-1.02);
 shape.lineTo(-.04,-.82);shape.bezierCurveTo(-.12,-.72,-.29,-.51,-.30,-.44);
 shape.bezierCurveTo(-.33,-.32,-.21,-.30,-.15,-.40);
 shape.lineTo(-.07,-.51);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelThickness:.085,bevelSize:.045,bevelSegments:8,steps:1,curveSegments:24});

 // Bend only the raised index finger; the palm and curled fingers remain still.
 const position=geometry.getAttribute('position');const pressed=position.clone();
 for(let i=0;i<position.count;i++){
  const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
  const weight=THREE.MathUtils.smoothstep(y,-.4,.06)*(1-THREE.MathUtils.smoothstep(Math.abs(x),.09,.17));
  pressed.setXYZ(i,x,y-.14*weight,z-.21*weight);
 }
 geometry.morphAttributes.position=[pressed];geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:'#efbb91',roughness:.48,metalness:0});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!;const data=ctx.createImageData(64,64);for(let i=0;i<data.data.length;i+=4){const n=150+Math.random()*35;data.data.set([n,n,n,255],i);}ctx.putImageData(data,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,5);material.bumpMap=texture;material.bumpScale=.003;
 const group=new THREE.Group();group.add(new THREE.Mesh(geometry,material));return group;
}
