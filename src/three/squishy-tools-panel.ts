import * as THREE from 'three';
import { aboutSettings as cfg } from '../config/about';
import { studio } from './about-assets';
import {cushionGeometry,cushionMaterial,cushionWeights} from './cushion';

/** Exact CSS-sized cushion with a shared dent/crease field for body and lettering. */
export async function createSquishyToolsPanel(host: HTMLElement, panel: HTMLElement) {
  const options={colour:'#f89823',letterColour:'#326eb3'};
  const s=studio();host.append(s.renderer.domElement);
  const material=cushionMaterial(options.colour);
  const button = new THREE.Mesh(new THREE.BufferGeometry(), material);
  s.scene.add(button);
  const control=panel;
  let visible = false, disposed = false, raf = 0, elapsed = 0, lastFrame = 0, duration = 1;
  
  let builtKey='';
  let completion: (()=>void)|undefined;
  let pending: Promise<void>|undefined;
  function settle(){const done=completion;completion=undefined;pending=undefined;done?.();}

  function resize() {
    if(disposed)return;

    if(!visible || !host.getClientRects().length)return;
    const box=host.getBoundingClientRect(), width=host.clientWidth, height=host.clientHeight;
    const scaleX=box.width/width||1,scaleY=box.height/height||1;
    if(!width||!height)return;
    const labels=[...panel.querySelectorAll<HTMLElement>('.reading-tools-label,.reading-tool-text')].filter(label=>label.getClientRects().length);
    const key=[width.toFixed(2),height.toFixed(2),...labels.map(label=>label.textContent+getComputedStyle(label).font+getComputedStyle(label).letterSpacing)].join('|');
    if(key===builtKey){render(performance.now());return;}builtKey=key;


    s.renderer.setSize(width,height,false);
    // World units equal CSS pixels: no hidden camera margin enlarges the padding.
    s.camera.left=-width/2;s.camera.right=width/2;s.camera.top=height/2;s.camera.bottom=-height/2;
    s.camera.position.set(0,0,Math.max(width,height)*3);s.camera.far=Math.max(width,height)*6;s.camera.updateProjectionMatrix();
    s.scene.updateMatrixWorld(true);
    button.geometry.dispose();button.geometry=cushionGeometry(width,height);button.updateMorphTargets();
    // Frame the REST mesh, not the larger combined morph bounds or an assumed rectangle.
    // The projected silhouette now fills the CSS box, whose padding is exactly 1LS.
    const positions=button.geometry.getAttribute('position');
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
    for(let i=0;i<positions.count;i++){left=Math.min(left,positions.getX(i));right=Math.max(right,positions.getX(i));bottom=Math.min(bottom,positions.getY(i));top=Math.max(top,positions.getY(i));}
    s.camera.left=left;s.camera.right=right;s.camera.top=top;s.camera.bottom=bottom;s.camera.updateProjectionMatrix();
    button.frustumCulled=false;
    render(performance.now());
  }

  function render(_now:number) {
    if(disposed||!visible||document.body.classList.contains('catch-open'))return;
    const t=pending?Math.min(1,elapsed/duration):0;
    const weights=cushionWeights(pending?t:1);
    button.morphTargetInfluences![0]=weights.dent;button.morphTargetInfluences![1]=weights.gather;
    panel.style.setProperty('--label-press',String(weights.pressure));
    if(!document.hidden)s.renderer.render(s.scene,s.camera);
  }
  function animate(now:number){
    raf=0;if(disposed||!pending)return;
    if(document.body.classList.contains('catch-open')){lastFrame=now;raf=requestAnimationFrame(animate);return;}
    // Pause when the tab is hidden; don't skip the entire visible dent on resume.
    if(!document.hidden)elapsed+=Math.min(Math.max(0,now-lastFrame),100)/1000;
    lastFrame=now;render(now);
    if(elapsed>=duration)settle();else raf=requestAnimationFrame(animate);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);observer.observe(control);
  return {
    show(value:boolean){visible=value;if(value)resize();else{cancelAnimationFrame(raf);settle();}},
    press():Promise<void>{
      if(disposed||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
      if(pending)return pending;
      duration=Math.max(.1,cfg.pressSeconds);elapsed=0;lastFrame=performance.now();
      pending=new Promise<void>(resolve=>{completion=resolve;});
      render(lastFrame);cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);return pending;
    },
    dispose(){settle();disposed=true;cancelAnimationFrame(raf);observer.disconnect();button.geometry.dispose();material.dispose();s.dispose();},
  };
}
