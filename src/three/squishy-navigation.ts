import * as THREE from 'three';
import {longCushionGeometry} from './long-cushion';
import { aboutSettings as cfg } from '../config/about';
import { studio } from './about-assets';
import {cushionGeometry,cushionMaterial,cushionWeights} from './cushion';

// All navigation cushions share one GPU context. Each keeps a 2D snapshot so
// opening many reader controls cannot evict the home buttons' WebGL contexts.
let navigationStudio:ReturnType<typeof studio>|undefined;

/** Foamy cushion with a lightweight Helvetica DOM label. */
export async function createSquishyNavigation(host: HTMLElement, label: HTMLElement, options:{text?:string;colour?:string;letterColour?:string;sectionLabel?:boolean;expandy?:boolean}={}) {
  const textLabel=options.text??'ABOUT';
  const shared=navigationStudio??=studio();
  const s={...shared,scene:shared.scene.clone(),camera:shared.camera.clone()};
  const canvas=document.createElement('canvas'),paint=canvas.getContext('2d')!;
  host.append(canvas);
  const material=cushionMaterial(options.colour??cfg.buttonColour);
  label.style.setProperty('--button-label-colour',options.letterColour??cfg.buttonLetterColour);
  await document.fonts.load('16px Reading Helvetica');
  const button = new THREE.Mesh(new THREE.BufferGeometry(), material);
  s.scene.add(button);
  const measure = document.createElement('canvas').getContext('2d')!;
  const control = host.parentElement!;
  let visible = false, disposed = false, raf = 0, elapsed = 0, lastFrame = 0, duration = 1;
  let builtWidth = 0, builtHeight = 0, builtCap = 0, layoutFrame = 0;
  let completion: (()=>void)|undefined;
  let pending: Promise<void>|undefined;
  let expandy:Animation|undefined;
  let pressPoint:{x:number;y:number}|undefined;
  const isLong=()=>host.clientWidth>host.clientHeight*3;
  function rememberPress(event:PointerEvent){const b=host.getBoundingClientRect();pressPoint={x:(event.clientX-b.left)/b.width,y:(event.clientY-b.top)/b.height};}
  control.addEventListener('pointerdown',rememberPress);
  function expand(){if(isLong()||options.expandy===false||!visible||pending||matchMedia('(prefers-reduced-motion: reduce)').matches)return;expandy?.cancel();expandy=control.animate([{transform:'scale(1)'},{transform:'scale(.97,.94)',offset:.22},{transform:'scale(1.04,1.08)',offset:.58},{transform:'scale(1)'}],{duration:430,easing:'cubic-bezier(.22,.7,.2,1)'});}
  control.addEventListener('pointerenter',expand);
  function settle(){const done=completion;completion=undefined;pending=undefined;done?.();}

  function measureLabel() {
    const style = getComputedStyle(label);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const metrics = measure.measureText(textLabel);
    const cap = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const history=control.parentElement?.querySelector<HTMLElement>('button:not(.about-toggle)');
    if(history){
      const hs=getComputedStyle(history);measure.font=`${hs.fontWeight} ${hs.fontSize} ${hs.fontFamily}`;
      const hm=measure.measureText(history.textContent||'READING HISTORY');
      const fa=hm.fontBoundingBoxAscent,fd=hm.fontBoundingBoxDescent;
      const inset=(parseFloat(hs.lineHeight)-fa-fd)/2+fa-hm.actualBoundingBoxAscent;
      control.parentElement!.style.setProperty('--history-ink-inset',`${Math.max(0,inset)}px`);
    }
    const tracking = parseFloat(style.letterSpacing) || 0;
    const width = metrics.width + tracking * Math.max(0,textLabel.length-1);
    control.style.setProperty('--about-cap-height', `${cap}px`);
    control.style.setProperty('--about-text-width', `${width}px`);
    return { cap, width };
  }

  function resize() {
    if(disposed)return;
    const text=measureLabel();
    if(!visible || !host.getClientRects().length)return;
    const width=host.clientWidth, height=host.clientHeight;
    if(!width||!height)return;
    if(Math.abs(width-builtWidth)<.1&&Math.abs(height-builtHeight)<.1&&Math.abs(text.cap-builtCap)<.1){render(performance.now());return;}
    builtWidth=width;builtHeight=height;builtCap=text.cap;
    s.renderer.setSize(width,height,false);
    // World units equal CSS pixels: no hidden camera margin enlarges the padding.
    s.camera.left=-width/2;s.camera.right=width/2;s.camera.top=height/2;s.camera.bottom=-height/2;
    s.camera.position.set(0,0,Math.max(width,height)*3);s.camera.far=Math.max(width,height)*6;s.camera.updateProjectionMatrix();
    s.scene.updateMatrixWorld(true);
    button.geometry.dispose();button.geometry=isLong()?longCushionGeometry(width,height):cushionGeometry(width,height,!options.sectionLabel);button.updateMorphTargets();
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
    label.style.transform=isLong()?'':`translateY(${weights.pressure*.06}em) scale(${1-weights.pressure*.035})`;
    if(!document.hidden){
      if(s.renderer.getContext().isContextLost()){s.renderer.forceContextRestore();return;}
      s.renderer.setSize(builtWidth,builtHeight,false);
      s.renderer.render(s.scene,s.camera);
      const source=s.renderer.domElement;
      if(canvas.width!==source.width||canvas.height!==source.height){canvas.width=source.width;canvas.height=source.height;}
      paint.clearRect(0,0,canvas.width,canvas.height);paint.drawImage(source,0,0);
    }
  }
  function animate(now:number){
    raf=0;if(disposed||!pending)return;
    if(document.body.classList.contains('catch-open')){lastFrame=now;raf=requestAnimationFrame(animate);return;}
    // Pause when the tab is hidden; don't skip the entire visible dent on resume.
    if(!document.hidden)elapsed+=Math.min(Math.max(0,now-lastFrame),100)/1000;
    lastFrame=now;render(now);
    if(elapsed>=duration)settle();else raf=requestAnimationFrame(animate);
  }
  // A hover changes font metrics and reveals the canvas in the same event.
  // Draw once more after layout; do not run a permanent animation loop.
  function scheduleLayout(){cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;if(!disposed&&visible)resize();});}
  function restored(){builtWidth=0;builtHeight=0;scheduleLayout();}
  s.renderer.domElement.addEventListener('webglcontextrestored',restored);
  document.fonts.ready.then(()=>{if(!disposed)scheduleLayout();});
  const observer=new ResizeObserver(resize);observer.observe(host);observer.observe(control);
  measureLabel();
  return {
    show(value:boolean){const entering=value&&!visible;visible=value;if(entering)expand();if(value){resize();scheduleLayout();}else{cancelAnimationFrame(layoutFrame);cancelAnimationFrame(raf);settle();}},
    setColour(colour:string){material.color.set(colour);render(performance.now());},
    press(point?:{clientX:number;clientY:number}):Promise<void>{
      if(point){const b=host.getBoundingClientRect();pressPoint={x:(point.clientX-b.left)/b.width,y:(point.clientY-b.top)/b.height};}
      if(disposed||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
      expandy?.cancel();if(pending)return pending;
      if(isLong()){
        const point=pressPoint??{x:.5,y:.5};
        const x=s.camera.left+THREE.MathUtils.clamp(point.x,0,1)*(s.camera.right-s.camera.left);
        const y=s.camera.top-THREE.MathUtils.clamp(point.y,0,1)*(s.camera.top-s.camera.bottom);
        button.geometry.dispose();button.geometry=longCushionGeometry(builtWidth,builtHeight,x,y);button.updateMorphTargets();
      }
      pressPoint=undefined;
      duration=Math.max(.1,cfg.pressSeconds);elapsed=0;lastFrame=performance.now();
      pending=new Promise<void>(resolve=>{completion=resolve;});
      render(lastFrame);cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);return pending;
    },
    dispose(){control.removeEventListener('pointerdown',rememberPress);control.removeEventListener('pointerenter',expand);expandy?.cancel();settle();disposed=true;cancelAnimationFrame(layoutFrame);cancelAnimationFrame(raf);s.renderer.domElement.removeEventListener('webglcontextrestored',restored);observer.disconnect();button.geometry.dispose();material.dispose();label.style.transform='';canvas.remove();},
  };
}
