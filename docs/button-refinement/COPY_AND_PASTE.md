# Installed update — 27 October

The live source now contains the compact spacing, font-outline controls, shared nine-fold dent, and animation-before-close behaviour. No pasting is needed. TypeScript validation passed and opening/closing was checked in the browser.

Blender background startup still crashes in Metal GPU detection before Python executes. No new Blender model was generated. The installed code therefore uses the existing Blender-exported button and letters with position/normal morphs calculated in Three.js. This is an authored visual deformation, not a PU physics simulation.

Edit `src/styles/pages/about.css`: line 4 controls the LS gap, lines 6–7 control font outlines. Edit `src/config/about.ts` for colours and press duration. Backups are in `docs/button-refinement/backup-before-install`.

The material/model rebuild script remains available as `build_blender.py`, but is unverified. Do not install the older replacement runtime until its corresponding GLB has been generated and checked.

---

## Earlier proposed Blender workflow (not installed)

# About button refinement — copy-and-paste guide

STATUS: Replacement TypeScript passed a compile check. The Blender script has not run because automated input into Blender was unresponsive. The new GLB does not exist yet. Do step 1 before replacing the website code. No live website source files were changed for this kit.

## 1. Generate the model in Blender

Save your current Blender work first. Move the pointer over an editor and press Shift+F4 to open the Python Console. Paste this single command and press Enter:

```python
exec(compile(open('/Users/kelvinli/Desktop/Honour/Physical_Product/Reading_Machine_Test/docs/button-refinement/build_blender.py').read(), 'pu_button', 'exec'))
```

Run it once. It creates a new scene, imports the existing mouse foam material, makes a rounded cushion and matching ABOUT letters, bakes a normal texture, and adds a Finger_Press shape key to both. Nine radial folds accompany the dent. This is an authored deformation, not a physical PU simulation.

Expected files under `public/models/about`:
- `pu-navigation-v2.glb` — website asset, with morph animation and baked texture.
- `PU_Navigation_Button_v2.blend` — editable Blender copy.

Progress/errors are recorded in `/Users/kelvinli/Documents/Codex/2026-09-29/i-wi/work/about/refinement/status.txt`. Do not proceed if the GLB is missing. The generated result still needs visual checking in Blender and the browser.

## 2. Replace three website files in VS Code

Open `/Users/kelvinli/Desktop/Honour/Physical_Product/Reading_Machine_Test`.
Back up these three files. Replace their ENTIRE contents using the corresponding files in `docs/button-refinement/replacement-src`:

| Destination in project | Replacement file in this kit |
|---|---|
| `src/styles/pages/about.css` | `replacement-src/styles/pages/about.css` |
| `src/three/squishy-navigation.ts` | `replacement-src/three/squishy-navigation.ts` |
| `src/pages/about/controller.ts` | `replacement-src/pages/about/controller.ts` |

The full copyable code is also included below. Do not append it to the old code. Existing imports in your project stay in place.

## 3. Controls you can edit

At the top of `src/styles/pages/about.css`:

```css
--nav-line-height: 1.25em; /* ordinary text line box */
--nav-gap: 0.65em;        /* your LS: small empty gap, also button padding */
--about-ls: var(--nav-gap);
--ui-outline: 0em;       /* logo name and ordinary navigation text */
--about-outline: 0em;    /* large scrolling ordinary text */
```

0.65em is a starting approximation of the reference gap, not an exact measured value. Reduce `--nav-gap` to make all four padding sides and the space below the active button smaller. `em` scales with the navigation font; it is preferable to CSS percentage padding, which would depend on container width. The About cushion sizes to the measured visible text plus two LS. Reading History stays in normal flow below the cushion.

The controller waits for the complete press/recovery animation on the second click before closing About. Opening still happens in the home window. Repeated clicks during animation are ignored. Reduced-motion users get an immediate state change.

## 4. Add outlines to fonts

For a slightly heavier ordinary font, change either outline variable above:

```css
--ui-outline: 0.012em;
--about-outline: 0.008em;
```

The stylesheet already applies `-webkit-text-stroke` and `paint-order: stroke fill`. Set the variables back to `0em` to remove the outline. These strokes affect HTML text only. Inflated Three.js letters and PNG letter images are not fonts; they need a geometry/render outline or an edited image, respectively. CSS text stroke will not outline those assets.

## 5. Verify after saving

On your running development website, hover About: check compact padding and History below it. Click once: check the letters dent with the cushion. Click again: the press and recovery must finish before the scrolling words and cushion disappear. Check a second browser width. If the model fails to load, look for a missing `pu-navigation-v2.glb` in the browser console.


## Full replacement: src/styles/pages/about.css

```css
/* EDIT HERE: layout and typography. LS is the empty gap between visible text lines. */
.refined-home.about-enabled {
  --nav-line-height: 1.25em;
  --nav-gap: 0.65em; /* LS = empty space, not the full line height. */
  --about-ls: var(--nav-gap);
  --ui-outline: 0em;
  --about-outline: 0em;
  --about-left: 26.175%; /* Start of column 3 in the eight-column grid. */
  --about-right: 1.6%;
  --about-top: 5.7%;
  --about-font: 5.45cqw;
  --about-leading: 1;
  --about-tracking: 0em;
  overflow: hidden;
}
.about-enabled .home-identity, .about-enabled .home-account { z-index: 5; }
.about-enabled .home-upload { z-index: 2; }
.about-top-mask { position:absolute; inset:0 0 auto; height:var(--about-top); background:#fff; z-index:3; pointer-events:none; }
.about-reel { position:absolute; left:var(--about-left); right:var(--about-right); top:var(--about-top); bottom:0; overflow:hidden; z-index:0; pointer-events:none; }
.about-reel[hidden] { display:none; }
.about-track { animation:about-roll var(--about-duration,38s) linear infinite; will-change:transform; }
.about-track.is-paused { animation-play-state:paused; }
.about-copy { padding-bottom:1em; font:400 var(--about-font)/var(--about-leading) 'Courier New',Courier,monospace; letter-spacing:var(--about-tracking); color:#151410; }
.about-line { white-space:pre; display:block; height:calc(1em * var(--about-leading)); line-height:var(--about-leading); }
.about-letter { position:relative; display:inline-block; width:1ch; }
.about-letter img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.about-letter.has-model { color:transparent !important; }
@keyframes about-roll { to { transform:translateY(-50%); } }
/* One LS is shared by the cushion padding and the gap below it. */
.about-enabled .home-navigation { gap: 0; justify-items: start; }
.about-enabled .home-navigation button { line-height: var(--nav-line-height); }
.about-enabled .about-toggle,
.about-enabled .about-toggle[aria-pressed="true"] {
  position: relative; display: block; padding: 0; margin: 0;
  border: 0; background: transparent; overflow: visible;
}
.about-toggle .about-button-label {
  position: relative; display: block; font: inherit; letter-spacing: inherit;
  line-height: var(--nav-line-height); transform: none;
}
/* Size to visible capitals, not a three-line-tall canvas. */
.about-enabled .about-toggle.is-visual {
  padding: var(--about-ls);
}
.about-toggle.is-visual .about-button-label {
  width: var(--about-text-width, auto);
  height: var(--about-cap-height, 0.65em);
  line-height: var(--about-cap-height, 0.65em);
}
.about-toggle .about-button-model,
.about-toggle[aria-pressed="true"] .about-button-model {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: none; pointer-events: none;
}
.about-toggle.is-visual .about-button-model { display: block; }
.about-button-model canvas { display: block; width: 100%; height: 100%; }
.about-toggle.is-visual.model-ready .about-button-label { visibility: hidden; }
.about-toggle.is-visual:not(.model-ready) { background: #bae4ee; border-radius: 0.7em; }
/* Normal document flow places History one LS below the whole block. */
.about-enabled .home-navigation:has(.about-toggle.is-visual) { row-gap: var(--about-ls); }
.about-enabled .home-navigation > button:not(.about-toggle) { transform: none; }
.about-sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
@media(prefers-reduced-motion:reduce) { .about-track { animation:none; } }

/* OUTLINES: ordinary DOM text only. 0.012em adds a subtle same-colour stroke. */
.about-enabled .home-wordmark,
.about-enabled .home-navigation button {
  -webkit-text-stroke: var(--ui-outline) currentColor;
  paint-order: stroke fill;
}
.about-copy {
  -webkit-text-stroke: var(--about-outline) currentColor;
  paint-order: stroke fill;
}

```

## Full replacement: src/three/squishy-navigation.ts

```typescript
import * as THREE from 'three';
import { loader, studio } from './about-assets';
import { aboutSettings as cfg } from '../config/about';

/* Blender owns the dent and creases. This code only fits and plays the exported model. */
export async function createSquishyNavigation(host:HTMLElement,label:HTMLElement) {
  const gltf=await loader.loadAsync(import.meta.env.BASE_URL+'models/about/pu-navigation-v2.glb');
  const s=studio();host.append(s.renderer.domElement);
  const root=gltf.scene;s.scene.add(root);
  const body=root.getObjectByName('PU_Navigation_Body') as THREE.Mesh;
  const letters=[...'ABOUT'].map(c=>root.getObjectByName('PU_Label_'+c) as THREE.Mesh);
  if(!body||letters.some(x=>!x)) {s.dispose();throw new Error('New Blender button or ABOUT letters are missing');}
  const meshes=[body,...letters];
  // glTF Y-up -> the Blender model's XY front face, including its morph targets.
  const rotation=new THREE.Matrix4().makeRotationX(Math.PI/2);
  const bases=new Map<THREE.Mesh,THREE.BufferGeometry>();
  for(const mesh of meshes){
    const g=mesh.geometry.clone();g.applyMatrix4(rotation);
    for(const list of Object.values(g.morphAttributes))for(const attr of list)attr.applyMatrix4(rotation);
    g.boundingBox=new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute);bases.set(mesh,g);
    mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.setScalar(1);
    mesh.material=(mesh.material as THREE.MeshStandardMaterial).clone();
    (mesh.material as THREE.MeshStandardMaterial).color.set(mesh===body?cfg.buttonColour:cfg.buttonLetterColour);
  }
  // Blender exports one action per mesh: merge synchronized tracks into one clip.
  const tracks=gltf.animations.flatMap(clip=>clip.tracks);
  if(!tracks.length){s.dispose();throw new Error('Blender press animation is missing');}
  const clip=new THREE.AnimationClip('About_Press',-1,tracks);
  const mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
  action.timeScale=clip.duration/Math.max(.1,cfg.pressSeconds);
  const measure=document.createElement('canvas').getContext('2d')!;
  const control=label.closest('button')!;
  let visible=false,disposed=false,raf=0,last=0,playing=false;
  let completion:(()=>void)|undefined;
  let layoutKey='';

  function fitGeometry(base:THREE.BufferGeometry,scale:THREE.Vector3,offset:THREE.Vector3){
    const g=base.clone(),matrix=new THREE.Matrix4().makeScale(scale.x,scale.y,scale.z);
    matrix.setPosition(offset);g.applyMatrix4(matrix);
    const oldNormal=base.getAttribute('normal'),newNormal=g.getAttribute('normal');
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),v=new THREE.Vector3();
    for(const attr of g.morphAttributes.position??[]){
      for(let i=0;i<attr.count;i++)attr.setXYZ(i,attr.getX(i)*scale.x+(g.morphTargetsRelative?0:offset.x),attr.getY(i)*scale.y+(g.morphTargetsRelative?0:offset.y),attr.getZ(i)*scale.z+(g.morphTargetsRelative?0:offset.z));
    }
    for(const attr of g.morphAttributes.normal??[]){
      for(let i=0;i<attr.count;i++){
        v.set(attr.getX(i)+(g.morphTargetsRelative?oldNormal.getX(i):0),attr.getY(i)+(g.morphTargetsRelative?oldNormal.getY(i):0),attr.getZ(i)+(g.morphTargetsRelative?oldNormal.getZ(i):0)).applyNormalMatrix(normalMatrix);
        attr.setXYZ(i,v.x-(g.morphTargetsRelative?newNormal.getX(i):0),v.y-(g.morphTargetsRelative?newNormal.getY(i):0),v.z-(g.morphTargetsRelative?newNormal.getZ(i):0));
      }
    }
    return g;
  }
  function resize(){
    if(disposed)return;
    const style=getComputedStyle(label);measure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const m=measure.measureText('ABOUT'),cap=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    const textWidth=m.width+4*(parseFloat(style.letterSpacing)||0);
    control.style.setProperty('--about-cap-height',`${cap}px`);control.style.setProperty('--about-text-width',`${textWidth}px`);
    if(!visible||!host.getClientRects().length)return;
    const box=host.getBoundingClientRect(),w=box.width,h=box.height;if(!w||!h)return;
    const key=[w,h,cap,textWidth].join('/');
    if(key!==layoutKey){
      layoutKey=key;s.renderer.setSize(w,h,false);
      s.camera.left=-w/2;s.camera.right=w/2;s.camera.top=h/2;s.camera.bottom=-h/2;s.camera.position.z=w*3;s.camera.far=w*6;s.camera.updateProjectionMatrix();
      const bb=bases.get(body)!.boundingBox!,bs=bb.getSize(new THREE.Vector3()),bc=bb.getCenter(new THREE.Vector3());
      const labelBox=new THREE.Box3();for(const mesh of letters)labelBox.union(bases.get(mesh)!.boundingBox!);
      const ls=labelBox.getSize(new THREE.Vector3()),lc=labelBox.getCenter(new THREE.Vector3());
      for(const mesh of meshes){
        const isBody=mesh===body,scale=new THREE.Vector3(isBody?w/bs.x:textWidth/ls.x,isBody?h/bs.y:cap/ls.y,h/bs.y);
        const center=isBody?bc:lc;
        const offset=new THREE.Vector3(-center.x*scale.x,-center.y*scale.y,-bc.z*scale.z);
        const old=mesh.geometry;mesh.geometry=fitGeometry(bases.get(mesh)!,scale,offset);old.dispose();
      }
    }
    if(!playing)s.renderer.render(s.scene,s.camera);
  }
  function settle(){playing=false;const done=completion;completion=undefined;done?.();}
  mixer.addEventListener('finished',event=>{if(event.action===action)settle();});
  function tick(now:number){
    if(disposed)return;
    const dt=Math.min((now-last)/1000,.05);last=now;mixer.update(dt);
    if(visible&&!document.hidden)s.renderer.render(s.scene,s.camera);
    if(playing)raf=requestAnimationFrame(tick);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);observer.observe(control);resize();
  return {
    show(value:boolean){visible=value;if(value)resize();},
    press():Promise<void>{
      if(disposed||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
      if(playing)return Promise.resolve();
      return new Promise(resolve=>{completion=resolve;playing=true;action.reset().play();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);});
    },
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();mixer.stopAllAction();settle();for(const mesh of meshes){bases.get(mesh)!.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}s.dispose();},
  };
}

```

## Full replacement: src/pages/about/controller.ts

```typescript
import { aboutSettings as cfg } from '../../config/about';
import { paintInflatedLetters } from '../../three/about-assets';
import { createSquishyNavigation } from '../../three/squishy-navigation';
import '../../styles/pages/about.css';

export function mountAbout(home:HTMLElement) {
  if(home.classList.contains('about-enabled'))return;
  const button=[...home.querySelectorAll<HTMLButtonElement>('.home-navigation button')].find(b=>b.textContent?.trim()==='ABOUT');
  if(!button)throw new Error('ABOUT navigation button not found');
  home.classList.add('about-enabled');button.classList.add('about-toggle');button.removeAttribute('aria-disabled');
  button.setAttribute('aria-pressed','false');button.setAttribute('aria-controls','about-reel');button.setAttribute('aria-label','About');
  const label=document.createElement('span');label.className='about-button-label';label.textContent='ABOUT';
  const model=document.createElement('span');model.className='about-button-model';model.setAttribute('aria-hidden','true');button.replaceChildren(label,model);
  const mask=document.createElement('div');mask.className='about-top-mask';mask.setAttribute('aria-hidden','true');home.append(mask);
  const reel=document.createElement('section');reel.id='about-reel';reel.className='about-reel';reel.hidden=true;reel.setAttribute('aria-label','About The Reading Machine');
  const accessible=document.createElement('p');accessible.className='about-sr-only';accessible.textContent=cfg.lines.map(l=>l.replace(/\[([^:]+):[^\]]+\]/g,'$1')).join(' ');reel.append(accessible);
  const track=document.createElement('div');track.className='about-track';track.setAttribute('aria-hidden','true');track.style.setProperty('--about-duration',`${cfg.secondsPerLoop}s`);
  const copy=document.createElement('div');copy.className='about-copy';
  for(const text of cfg.lines){
    const row=document.createElement('div');row.className='about-line';let end=0;
    for(const match of text.matchAll(/\[([^:]+):([^\]]+)\]/g)){
      row.append(text.slice(end,match.index));const span=document.createElement('span');span.className='about-letter';span.textContent=match[1];
      const colour=cfg.palette[match[2] as keyof typeof cfg.palette];if(!colour)throw new Error('Unknown About colour '+match[2]);
      span.dataset.glyph=match[1];span.dataset.colour=colour;span.style.color=colour;row.append(span);end=match.index!+match[0].length;
    }
    row.append(text.slice(end));copy.append(row);
  }
  track.append(copy,copy.cloneNode(true));reel.append(track);home.append(reel);
  let active=false,hover=false,suppress=false,busy=false;
  let view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function visual(){
    const on=busy||active||(hover&&!suppress);
    button!.classList.toggle('is-visual',on);view?.show(on&&!home.hidden);
  }
  function syncPause(){track.classList.toggle('is-paused',document.hidden||home.hidden);}
  function setOpen(value:boolean){
    active=value;button!.setAttribute('aria-pressed',String(value));reel.hidden=!value;
    home.classList.toggle('about-open',value);if(value)fillReel();syncPause();
  }
  const ready=createSquishyNavigation(model,label).then(v=>{
    view=v;button!.classList.add('model-ready');visual();return v;
  }).catch(error=>{console.warn('About button unavailable',error);return undefined;});
  async function clickAbout(){
    if(busy)return;
    const closing=active;busy=true;suppress=false;
    if(!closing)setOpen(true);
    visual();
    try{
      const modelView=await ready;
      // Resolves on the actual Blender animation-finished event, not a timeout.
      await modelView?.press();
    }finally{
      if(closing){setOpen(false);suppress=true;}
      busy=false;visual();
    }
  }
  button.addEventListener('pointerenter',()=>{hover=true;visual();});
  button.addEventListener('pointerleave',()=>{hover=false;suppress=false;visual();});
  button.addEventListener('focus',()=>{hover=true;visual();});
  button.addEventListener('blur',()=>{hover=false;suppress=false;visual();});
  button.addEventListener('click',()=>{void clickAbout();});
  home.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!busy)void clickAbout();});
  document.addEventListener('visibilitychange',syncPause);reduced.addEventListener('change',syncPause);
  new MutationObserver(()=>{syncPause();visual();}).observe(home,{attributes:true,attributeFilter:['hidden']});
  // Each identical half is at least as tall as the viewport, even on narrow screens.
  let repeats=0;
  function fillReel(){
    if(reel.hidden)return;
    const count=Math.max(1,Math.ceil(reel.clientHeight/copy.getBoundingClientRect().height));
    if(!Number.isFinite(count)||count===repeats)return;
    repeats=count;const half=document.createElement('div');half.append(copy);
    for(let i=1;i<count;i++)half.append(copy.cloneNode(true));
    track.replaceChildren(half,half.cloneNode(true));track.style.setProperty('--about-duration',`${cfg.secondsPerLoop*count}s`);
  }
  new ResizeObserver(fillReel).observe(reel);
  // Plain coloured letters remain readable if WebGL or an asset fails.
  void paintInflatedLetters(copy).then(()=>{repeats=0;fillReel();}).catch(e=>console.warn('About letters unavailable',e));
}

```
