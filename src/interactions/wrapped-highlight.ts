import * as THREE from 'three';
import { SquishyTransition, type Band } from './squishy-transition';
import { settings } from './settings';
import { rowScale } from './highlight-layout';

/** One shared animation in normalized coordinates, uniformly scaled per row. */
export class WrappedHighlight {
  readonly root=new THREE.Group();
  private master:SquishyTransition;
  private rows:Band[]=[];
  private slices:THREE.Group[]=[];
  private total=0;
  private animateUntil=performance.now()+1500;
  get isAnimating(){return performance.now()<=this.animateUntil;}
  private feedback={padding:0,yellow:0,opacity:1};
  private originalColours=new WeakMap<THREE.Material,THREE.Color>();
  setFeedback(padding=0,yellow=0,opacity=1){this.feedback={padding,yellow,opacity};this.animateUntil=performance.now()+1500;}

  private direction=1;
  private initialScale:number;
  private origin:{x:number;y:number};
  private handover=0;
  private hasRows=false;
  constructor(template:THREE.Group,x:number,y:number,press:number,height=settings.cursorSize){
    this.origin={x,y};this.initialScale=height/settings.cursorSize;
    this.master=new SquishyTransition(template,x,y,press);
    this.root.add(this.master.root);
  }
  setRows(rows:Band[],direction:number){
    this.animateUntil=performance.now()+1500;
    this.rows=rows;this.direction=direction;this.hasRows=rows.length>0;
    this.master.root.removeFromParent();
    this.total=rows.reduce((n,row)=>n+row.width/rowScale(row.height),0);
    this.master.setTarget({left:0,top:0,width:this.total,height:settings.cursorSize},direction);
    while(this.slices.length>rows.length)this.removeSlice(this.slices.pop()!);
    while(this.slices.length<rows.length){
      const slice=this.master.model.clone(true);
      slice.traverse(o=>{
        if(!(o instanceof THREE.Mesh))return;
        const source=o.material as THREE.MeshStandardMaterial;
        const material=source.clone();material.onBeforeCompile=source.onBeforeCompile;
        material.customProgramCacheKey=source.customProgramCacheKey;
        material.clippingPlanes=[new THREE.Plane(),new THREE.Plane()];
        o.material=material;o.frustumCulled=false;
      });
      this.slices.push(slice);this.root.add(slice);
    }
  }
  tick(dt:number,now:number,reduced:boolean){
    if(now>this.animateUntil)return;
    this.master.tick(dt,now,reduced);
    if(!this.hasRows){
      this.master.root.scale.setScalar(this.initialScale);
      this.master.root.position.set(this.origin.x,innerHeight-this.origin.y,8);
      return;
    }
    this.handover=reduced?1:Math.min(1,this.handover+dt/.12);
    const blend=THREE.MathUtils.smoothstep(this.handover,0,1);
    const meshes:THREE.Mesh[]=[];
    this.master.model.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});
    const width=this.master.displayedWidth;
    // Anchor position is exact. Only width is smoothed; the starting edge never lags.
    const centre=this.direction>=0?width/2:this.total-width/2;
    let offset=0;
    this.rows.forEach((row,index)=>{
      const scale=rowScale(row.height),slice=this.slices[index];let i=0;
      slice.traverse(o=>{
        if(!(o instanceof THREE.Mesh))return;
        const source=meshes[i++];
        if(source.morphTargetInfluences)o.morphTargetInfluences=[...source.morphTargetInfluences];
        const planes=(o.material as THREE.Material).clippingPlanes!;
        planes[0].set(new THREE.Vector3(1,0,0),index===0?1e6:-row.left);
        planes[1].set(new THREE.Vector3(-1,0,0),index===this.rows.length-1?1e6:row.left+row.width);
      });
      // Scale X, Y AND Z equally: curved ends retain the same proportions.
      slice.scale.copy(this.master.model.scale).multiplyScalar(scale);
      slice.position.copy(this.master.model.position).multiplyScalar(scale);
      slice.position.x+=row.left+(centre-offset)*scale;
      slice.position.y+=innerHeight-row.top-row.height/2;
      slice.position.z+=8;
      // One brief initial handover, never restarted when more rows are added.
      const first=this.direction>=0?index===0:index===this.rows.length-1;
      if(first&&blend<1){
        const edge=this.direction>=0?row.left:row.left+row.width;
        const initialEdge=this.origin.x+(this.direction>=0?-1:1)*settings.cursorSize*this.initialScale/2;
        slice.position.x+=(initialEdge-edge)*(1-blend);
        slice.position.y-=(this.origin.y-(row.top+row.height/2))*(1-blend);
      }
      // Expand the existing foamy slice around its own row centre, including clipping.
      const {padding,yellow,opacity}=this.feedback;
      const sx=1+2*padding/Math.max(row.width,1),sy=1+2*padding/Math.max(row.height,1);
      const cx=row.left+row.width/2,cy=innerHeight-row.top-row.height/2;
      slice.position.x=cx+(slice.position.x-cx)*sx;
      slice.position.y=cy+(slice.position.y-cy)*sy;
      slice.scale.x*=sx;slice.scale.y*=sy;
      slice.traverse(o=>{
        if(!(o instanceof THREE.Mesh))return;
        const material=o.material as THREE.MeshStandardMaterial;
        if(!this.originalColours.has(material))this.originalColours.set(material,material.color.clone());
        material.color.copy(this.originalColours.get(material)!).lerp(new THREE.Color('#fcf068'),yellow);
        material.opacity=opacity;
        const planes=material.clippingPlanes!;
        if(index>0)planes[0].constant=-row.left+padding;
        if(index<this.rows.length-1)planes[1].constant=row.left+row.width+padding;
      });
      offset+=row.width/scale;
    });
  }
  get retractDuration(){return Math.max(1,this.rows.reduce((sum,row)=>sum+row.width,0)/(Math.max(1,innerWidth)*20)*1000);}
  retract(progress:number){
    const total=this.rows.reduce((sum,row)=>sum+row.width,0);
    const remaining=total*(1-THREE.MathUtils.clamp(progress,0,1));
    let offset=0;
    const indices=this.rows.map((_,i)=>i);if(this.direction<0)indices.reverse();
    for(const index of indices){const row=this.rows[index],slice=this.slices[index],visible=Math.max(0,Math.min(row.width,remaining-offset));slice.visible=visible>0;
      slice.traverse(o=>{if(o instanceof THREE.Mesh){const planes=(o.material as THREE.Material).clippingPlanes!;planes[0].constant=this.direction<0?-(row.left+row.width-visible):-row.left;planes[1].constant=this.direction<0?row.left+row.width:row.left+visible;}});
      offset+=row.width;
    }
  }
  private removeSlice(slice:THREE.Group){
    slice.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose();});
    slice.removeFromParent();
  }
  dispose(){this.slices.forEach(s=>this.removeSlice(s));this.master.dispose();this.root.removeFromParent();}
}
