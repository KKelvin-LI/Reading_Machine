# About page — copy and paste guide

This kit belongs to **Reading_Machine_Test**. The live `src` folder has not been changed. The files under this guide's `src` folder are prepared copies; they do not run until you copy them into the project's real `src` folder.

## 1. Open the correct project

In VS Code use **File → Open Folder**, then choose:

`/Users/kelvinli/Desktop/Honour/Physical_Product/Reading_Machine_Test`

Do not open the kit folder as a separate project. Do not use Go Live: this project uses Vite and TypeScript.

## 2. Check the prepared models

The following must exist in `public/models/about` before the 3D parts can work:

- `inflated-alphabet.glb` — A–Z and !, with an existing baked foam normal texture and recolourable materials.
- `squishy-navigation.glb` — the rounded block with `Finger_Press` morph.
- `about-button-letters.glb` — just the five ABOUT letters for faster loading.
- `sprites/` — 23 transparent PNG letter/colour combinations, already prepared.

About stays inside the existing Home DOM. It is not a separate route or window. The mailbox remains in place.

No new `.blend` was saved: Blender input was unavailable, and background startup crashed before Python ran. The GLBs were prepared from the saved domed mesh data used by the original Blender alphabet, with one Catmull–Clark subdivision. The foam normal texture was reused from the existing exported block, with rebuilt letter UVs. This is not an exact fresh bake of every original procedural shader. The original editable source remains `/Users/kelvinli/Desktop/Honour/Physical_Product/Squishy_Alphabet.blend`.

If models are missing, the page uses readable coloured text and a plain button, and reports the missing assets in the browser console. That is a fallback, not the finished 3D result.

## 3. Add five new files

In VS Code's Explorer, create these folders/files inside the real `src` folder. For each file, open its matching copy under `docs/about-page-kit/src`, press **Command+A**, **Command+C**, switch to the new destination file, then **Command+V** and **Command+S**.

1. `src/config/about.ts` — words, colours, speed and model URLs.
2. `src/styles/pages/about.css` — grid position, font, line spacing, LS and layer order.
3. `src/three/about-assets.ts` — loads the alphabet and makes transparent images from your actual meshes for smooth scrolling.
4. `src/three/squishy-navigation.ts` — live 3D button; makes the letters deform with its finger dent.
5. `src/pages/about/controller.ts` — builds the text, toggles About, controls hover/click and pause.

These files are separate so you can change the design without searching through the whole reader.

## 4. Connect it to Home

Back up your current `src/pages/home/controller.ts` by copying it somewhere outside `src`, such as `docs/backups/home-controller-before-about.txt`.

Replace its contents with the complete matching file in this kit. Only two additions connect About: the `mountAbout` import at the top and `mountAbout(home)` after the home element is found. The existing mailbox upload logic is retained.

Do not replace `main.ts`, your HTML template, your existing home CSS, or your reader code. The new About controller imports its CSS automatically.

## 5. Preview

Keep the existing Vite development server running and open its displayed localhost address. Saving changes updates the page automatically. If the server is stopped, use VS Code's **NPM Scripts → dev → Run** (in Explorer; enable NPM Scripts from the Explorer menu if hidden). The page must be served through Vite; opening the HTML directly or using Go Live will not compile TypeScript.

Test these in order:

1. Hover About: the sky-blue block and pink inflated ABOUT label appear.
2. Click About: the label moves right/down by one LS; Reading History moves down one LS; the block dents with the letters.
3. The words roll upward behind the mailbox and disappear beneath the white top band.
4. Click About again: words disappear and About returns to ordinary text. Move away and hover again to preview the button.
5. Use Tab and Enter to toggle; Escape closes About. Pause Words stops movement; reduced-motion preferences show static text.
6. Click or drop a PDF on the mailbox: the existing delivery animation and reader still work.

## 6. Where to adjust the design

| Change | File | Search for |
|---|---|---|
| Copy and coloured letters | `src/config/about.ts` | `lines` |
| Colour palette | `src/config/about.ts` | `palette` |
| Button and label colours | `src/config/about.ts` | `buttonColour`, `buttonLetterColour` |
| Scroll speed | `src/config/about.ts` | `secondsPerLoop` — larger is slower |
| Press/release duration | `src/config/about.ts` | `pressSeconds` |
| Font size | `src/styles/pages/about.css` | `--about-font` |
| Letter spacing | `src/styles/pages/about.css` | `--about-tracking` |
| Line spacing | `src/styles/pages/about.css` | `--about-leading` |
| Grid alignment | `src/styles/pages/about.css` | `--about-left`, `--about-right` |
| Header masking height | `src/styles/pages/about.css` | `--about-top` |
| Sidebar LS | `src/styles/pages/about.css` | `--about-ls` |

In VS Code press **Command+F** to find these names. Search names are more reliable than line numbers after you edit. Use **Control+G** to jump to a line number when needed. **Option+Z** turns on word wrap without changing the code.

A token such as `[O:pink]` means use the inflated O in pink. Ordinary characters remain Courier New Regular. Keep the brackets and colon. You can use A–Z and ! in these tokens. Each array item is one deliberate line; adjust font size if you make a line substantially longer.

The button padding is one LS. When active, its text gets one LS of padding on every side. A negative bottom margin of one LS makes Reading History move only one LS rather than two. The initial one-LS gap prevents overlap. The header mask is white because this design has a white page; it is intentionally not yellow.

## Rendering notes

The supplied PNGs were rendered from the saved 3D letter geometry, not a substitute font. The page uses them directly. A new letter/colour combination without a prepared PNG is rendered locally from the full alphabet as a fallback. This avoids animating dozens of separate WebGL scenes every frame. The interactive button uses live geometry, including a shared dent profile for its letters. Its button mesh changes the centre width while preserving rounded end caps.

Baked normal textures preserve fine foam surface detail that Blender's procedural nodes alone cannot transfer to glTF. Blender and Three.js still use different lighting/shading pipelines, so an identical offline-render match is not guaranteed.

## Blender startup crash diagnosis

The observed background-launch crash occurs in `supports_barycentric_whitelist` / `MTLBackend::metal_is_supported`, before Python executes. It is a graphics-startup failure in this execution environment, not evidence that the alphabet geometry is corrupt. Repeated background launches were stopped. The runtime assets were prepared from saved geometry and the existing baked material instead. This diagnosis does not establish the cause of every earlier crash or guarantee that Blender can never crash.

## Validation and limits

The kit was checked in an isolated copy of the existing project. TypeScript compilation and the production build pass. Browser checks covered same-URL toggling, inflated-letter and button loading, one-LS Reading History movement and the white header mask. The existing mailbox controller is retained; an end-to-end PDF upload was not repeated this turn.

The dent is an authored deformation, not a live physics solver. The existing foam map, rounded geometry and computed press normals are used; matching a Blender render exactly is not guaranteed.

## Complete file contents

Copy the code inside each block into the matching destination under the real project root. Do not copy the backtick markers.

### src/config/about.ts

```ts
/** EDIT HERE: colours, copy and motion. [letter:colour] uses your inflated mesh. */
export const aboutSettings = {
  secondsPerLoop: 38,
  buttonColour: '#bae4ee',
  buttonLetterColour: '#f7c9de',
  pressSeconds: .7,
  alphabetUrl: 'models/about/inflated-alphabet.glb',
  buttonUrl: 'models/about/squishy-navigation.glb',
  buttonAlphabetUrl: 'models/about/about-button-letters.glb',
  spriteUrl: 'models/about/sprites/',
  palette: { pink:'#f7c9de', lilac:'#bda7d0', green:'#69bf64', orange:'#f89823', sky:'#bae4ee', yellow:'#fcf068', blue:'#326eb3', red:'#e7484d' },
  lines: [
    'WELC[O:pink]ME TO A LI[T:yellow]TLE',
    'WORLD O[F:sky] LES[S:green] STRESS',
    '[A:lilac]ND MORE [R:orange]EADING JO[Y:blue].',
    'OUR [P:red]HILOSOPHY [I:pink]S IF',
    'R[E:yellow]ADING FEE[L:sky]S BORI[N:green]G',
    'OR [D:lilac]IFFI[C:orange]ULT, [W:blue]HY NO[T:red]',
    '[M:pink]AKE I[T:yellow] PLAY[F:sky]UL?',
    'SQ[U:green]ISH, ST[R:lilac]ETCH A[N:orange]D',
    'JUST [S:blue]IMPLY H[A:red]VE FUN[!:pink]',
  ],
};
```

### src/styles/pages/about.css

```css
/* EDIT HERE: layout and typography. LS is the sidebar line-height. */
.refined-home.about-enabled {
  --about-ls: 1.25em;
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
.about-enabled .home-navigation { gap:var(--about-ls); justify-items:start; }
.about-enabled .about-toggle { position:relative; line-height:var(--about-ls); overflow:visible; }
.about-toggle .about-button-label { position:relative; }
.about-button-model { position:absolute; left:calc(-1 * var(--about-ls)); top:calc(-1 * var(--about-ls)); width:calc(100% + 2 * var(--about-ls)); height:calc(100% + 2 * var(--about-ls)); pointer-events:none; display:none; }
.about-button-model canvas { display:block; width:100%; height:100%; }
.about-toggle.is-visual .about-button-model { display:block; }
.about-toggle.is-visual.model-ready .about-button-label { visibility:hidden; }
.about-enabled .about-toggle[aria-pressed="true"] { padding:var(--about-ls); margin-bottom:calc(-1 * var(--about-ls)); }
.about-toggle[aria-pressed="true"] .about-button-model { inset:0; width:100%; height:100%; }
.about-toggle.is-visual:not(.model-ready) { background:#bae4ee; border-radius:.7em; color:#f7c9de; }
.about-motion-toggle { position:absolute; left:var(--grid-inset); bottom:2%; z-index:4; font:inherit; color:inherit; background:#fff; border:0; padding:.4em; }
.about-motion-toggle[hidden] { display:none; }
.about-sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
@media(prefers-reduced-motion:reduce) { .about-track { animation:none; } }
```

### src/three/about-assets.ts

```ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { aboutSettings as cfg } from '../config/about';
const loader = new GLTFLoader();
const alphabets = new Map<string,Promise<THREE.Group>>();
export function loadAlphabet(url=cfg.alphabetUrl) {
  if(!alphabets.has(url))alphabets.set(url,loader.loadAsync(import.meta.env.BASE_URL+url).then(g=>g.scene).catch(e=>{alphabets.delete(url);throw e;}));
  return alphabets.get(url)!;
}
export function glyph(source:THREE.Group, char:string, colour:string) {
  const original=source.getObjectByName('AboutGlyph_'+(char==='!'?'Exclamation':char)) as THREE.Mesh;
  if (!original) throw new Error('Inflated letter missing: '+char);
  const mesh=new THREE.Mesh(original.geometry.clone(),(original.material as THREE.MeshStandardMaterial).clone());
  // Blender XY face becomes XZ in glTF. Restore a face-on XY mesh.
  mesh.geometry.rotateX(Math.PI/2); mesh.geometry.computeBoundingBox();
  const box=mesh.geometry.boundingBox!, size=box.getSize(new THREE.Vector3()), mid=box.getCenter(new THREE.Vector3());
  mesh.geometry.translate(-mid.x,-mid.y,-mid.z); mesh.geometry.scale(1/size.y,1/size.y,1/size.y);
  (mesh.material as THREE.MeshStandardMaterial).color.set(colour);
  return mesh;
}
export function studio() {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1;
  const scene=new THREE.Scene(), pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04); room.dispose(); pmrem.dispose();
  scene.environment=env.texture; scene.environmentIntensity=.35;
  scene.add(new THREE.AmbientLight(0xffffff,.25));
  const light=new THREE.DirectionalLight(0xfff8ee,1.5); light.position.set(-3,6,8); scene.add(light);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30); camera.position.z=10;
  return {renderer,scene,camera,dispose(){env.dispose();renderer.dispose();renderer.domElement.remove();}};
}
/** Render each coloured glyph once; CSS can then scroll it cheaply and smoothly. */
export async function paintInflatedLetters(root:HTMLElement) {
  let source:THREE.Group|undefined,s:ReturnType<typeof studio>|undefined;
  const cache=new Map<string,string>();
  try {
    for(const el of root.querySelectorAll<HTMLElement>('[data-glyph]')) {
      const char=el.dataset.glyph!, colour=el.dataset.colour!, key=char+colour;
      const prepared=new Image();prepared.alt='';
      prepared.src=import.meta.env.BASE_URL+cfg.spriteUrl+(char==='!'?'Exclamation':char)+'-'+colour.slice(1)+'.png';
      try{await prepared.decode();el.append(prepared);el.classList.add('has-model');continue;}catch{/* New colour/letter: render from the full alphabet below. */}
      source??=await loadAlphabet();s??=studio();
      if(!cache.has(key)) {
        const mesh=glyph(source,char,colour); s.scene.add(mesh);
        s.camera.left=-.46;s.camera.right=.46;s.camera.top=.66;s.camera.bottom=-.66;s.camera.updateProjectionMatrix();
        s.renderer.setSize(192,276,false);s.renderer.render(s.scene,s.camera);
        cache.set(key,s.renderer.domElement.toDataURL('image/png'));
        s.scene.remove(mesh); mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
      }
      const img=new Image(); img.alt='';img.src=cache.get(key)!;
      await img.decode();el.append(img);el.classList.add('has-model');
    }
  } finally { s?.dispose(); }
}
export { loader };
```

### src/three/squishy-navigation.ts

```ts
import * as THREE from 'three';
import { aboutSettings as cfg } from '../config/about';
import { glyph,loadAlphabet,loader,studio } from './about-assets';
function turnFront(geometry:THREE.BufferGeometry){
  const rotation=new THREE.Matrix4().makeRotationX(Math.PI/2);
  geometry.applyMatrix4(rotation);
  for(const attributes of Object.values(geometry.morphAttributes))for(const attr of attributes)attr.applyMatrix4(rotation);
}
export async function createSquishyNavigation(host:HTMLElement,label:HTMLElement) {
  const [source,gltf]=await Promise.all([loadAlphabet(cfg.buttonAlphabetUrl),loader.loadAsync(import.meta.env.BASE_URL+cfg.buttonUrl)]);
  const original=gltf.scene.getObjectByName('About_Squishy_Button') as THREE.Mesh;
  if(!original) throw new Error('About_Squishy_Button is missing');
  const s=studio(); host.append(s.renderer.domElement);
  const button=original.clone();button.geometry=original.geometry.clone();turnFront(button.geometry);
  button.position.set(0,0,0);button.rotation.set(0,0,0);button.scale.setScalar(1);
  button.material=(original.material as THREE.MeshStandardMaterial).clone();(button.material as THREE.MeshStandardMaterial).color.set(cfg.buttonColour);
  const index=button.morphTargetDictionary?.Finger_Press;
  if(index===undefined) {s.dispose();throw new Error('Finger_Press morph is missing');}
  s.scene.add(button);
  const letters=[...'ABOUT'].map(char=>{
    const mesh=glyph(source,char,cfg.buttonLetterColour);s.scene.add(mesh);
    return {mesh,base:mesh.geometry.clone(),rest:new Float32Array(),delta:new Float32Array()};
  });
  // The press profile matches the Blender target in prepare.py.
  let visible=false,pressedAt=-Infinity,raf=0,disposed=false;
  function resize() {
    cancelAnimationFrame(raf);
    const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
    s.renderer.setSize(width,height,false);
    const viewH=1.10,viewW=viewH*width/height;
    s.camera.left=-viewW/2;s.camera.right=viewW/2;s.camera.top=viewH/2;s.camera.bottom=-viewH/2;s.camera.updateProjectionMatrix();
    // Preserve rounded end geometry: only the centre is resized horizontally.
    const rest=original.geometry.clone();turnFront(rest);
    const targetHalf=viewW*.48,cap=.34,centre=Math.max(.02,targetHalf-cap);
    const reshape=(x:number)=>Math.abs(x)>.9?Math.sign(x)*(centre+(Math.abs(x)-.9)*cap/.5):x*centre/.9;
    const p=rest.getAttribute('position');const morph=rest.morphAttributes.position ?? [];
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i);p.setX(i,reshape(x));
      for(const a of morph) a.setX(i,rest.morphTargetsRelative?reshape(x+a.getX(i))-reshape(x):reshape(a.getX(i)));
    }
    rest.computeVertexNormals();button.geometry.dispose();button.geometry=rest;
    const hr=host.getBoundingClientRect(),lr=label.getBoundingClientRect();
    const cell=lr.width/5/width*viewW,letterH=lr.height/height*viewH*.66;
    letters.forEach((item,j)=>{
      item.mesh.geometry.dispose();item.mesh.geometry=item.base.clone();
      item.mesh.geometry.computeBoundingBox();const bw=item.mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).x;
      const scale=Math.min(letterH,cell*.9/bw);
      const x=(lr.left-hr.left+lr.width*(j+.5)/5)/width*viewW-viewW/2;
      const y=viewH/2-(lr.top-hr.top+lr.height/2)/height*viewH;
      item.mesh.geometry.scale(scale,scale,scale);item.mesh.geometry.translate(x,y,.31+scale*.16);
      const pos=item.mesh.geometry.getAttribute('position');item.rest=new Float32Array(pos.array);item.delta=new Float32Array(pos.count);
      for(let i=0;i<pos.count;i++){
        const worldX=pos.getX(i),sourceX=worldX/centre*.9;
        item.delta[i]=.19*Math.exp(-((sourceX/.65)**2+(pos.getY(i)/.35)**2)*1.6)+.025;
      }
    });
    draw(performance.now());
  }
  function draw(now:number) {
    if(disposed)return;
    const age=(now-pressedAt)/1000/cfg.pressSeconds;
    const weight=age<0||age>=1?0:age<.24?Math.sin(age/.24*Math.PI/2):Math.pow(Math.cos((age-.24)/.76*Math.PI/2),2);
    button.morphTargetInfluences![index!]=weight;
    for(const item of letters){
      const p=item.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<p.count;i++){
        p.setXYZ(i,item.rest[i*3]*(1+.018*weight),item.rest[i*3+1]*(1+.018*weight),item.rest[i*3+2]-item.delta[i]*weight);
      }
      p.needsUpdate=true;item.mesh.geometry.computeVertexNormals();
    }
    if(visible&&!document.hidden)s.renderer.render(s.scene,s.camera);
    if(visible&&age<1&&age>=0)raf=requestAnimationFrame(draw);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);
  return {
    show(value:boolean){visible=value;cancelAnimationFrame(raf);if(value)resize();},
    press(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;pressedAt=performance.now();cancelAnimationFrame(raf);draw(pressedAt);},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();button.geometry.dispose();(button.material as THREE.Material).dispose();for(const i of letters){i.base.dispose();i.mesh.geometry.dispose();(i.mesh.material as THREE.Material).dispose();}s.dispose();},
  };
}
```

### src/pages/about/controller.ts

```ts
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
  const pause=document.createElement('button');pause.type='button';pause.className='about-motion-toggle';pause.dataset.nativeControl='';pause.textContent='PAUSE WORDS';pause.hidden=true;pause.setAttribute('aria-pressed','false');home.append(pause);
  let active=false,hover=false,suppress=false,paused=false,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function visual(){const on=active||(hover&&!suppress);button!.classList.toggle('is-visual',on);view?.show(on&&!home.hidden);}
  function syncPause(){track.classList.toggle('is-paused',paused||document.hidden||home.hidden);pause.hidden=!active||reduced.matches;}
  function toggle(){active=!active;suppress=!active;button!.setAttribute('aria-pressed',String(active));reel.hidden=!active;home.classList.toggle('about-open',active);visual();syncPause();if(active)fillReel();}
  button.addEventListener('pointerenter',()=>{hover=true;visual();});button.addEventListener('pointerleave',()=>{hover=false;suppress=false;visual();});
  button.addEventListener('focus',()=>{hover=true;visual();});button.addEventListener('blur',()=>{hover=false;suppress=false;visual();});
  button.addEventListener('click',()=>{toggle();if(active)view?.press();});
  home.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){toggle();button.focus();suppress=true;visual();}});
  pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'PLAY WORDS':'PAUSE WORDS';pause.setAttribute('aria-pressed',String(paused));syncPause();});
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
  void createSquishyNavigation(model,label).then(v=>{view=v;button.classList.add('model-ready');visual();}).catch(e=>console.warn('About button unavailable',e));
}
```

### src/pages/home/controller.ts

```ts
import { mountAbout } from '../about/controller';
import { createMailbox, type MailboxView } from '../../three/home-mailbox';
import { homeSettings } from '../../config/home';

export function mountHome(input: HTMLInputElement, openReader: (file: File) => Promise<void>) {
  const button = document.getElementById('choose-file') as HTMLButtonElement;
  const home = document.getElementById('home')!;
  mountAbout(home);
  const status = document.getElementById('home-upload-status')!;
  let view: MailboxView | undefined, busy = false, dragDepth = 0;
  const ready = createMailbox(document.getElementById('mailbox-scene')!).then(v => {
    view = v; button.classList.add('model-ready'); status.textContent = ''; return v;
  }).catch(error => { console.error(error); status.textContent = '3D preview unavailable. Click to choose a PDF.'; return undefined; });
  button.addEventListener('click', () => {
    if (busy) return;
    view?.click(); input.click(); // Native chooser must open inside the user click event.
  });
  async function accept(file: File) {
    if (busy) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') { status.textContent = 'Please choose a PDF file.'; return; }
    if (file.size > homeSettings.maxFileBytes) { status.textContent = 'Please choose a PDF smaller than 100 MB.'; return; }
    busy = true; button.setAttribute('aria-busy', 'true');
    try {
      const model = await ready;
      status.textContent = 'Delivering your document…';
      if (model) await model.deliver();
      await openReader(file);
    } catch (error) { console.error(error); status.textContent = 'Please try uploading your PDF again.'; }
    finally { busy = false; button.removeAttribute('aria-busy'); view?.reset(); if (home.hidden) status.textContent = ''; }
  }
  button.addEventListener('dragenter', e => { if (!e.dataTransfer?.types.includes('Files')) return; e.preventDefault(); dragDepth++; button.classList.add('dragging'); });
  button.addEventListener('dragover', e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = busy ? 'none' : 'copy'; });
  button.addEventListener('dragleave', () => { if (--dragDepth <= 0) button.classList.remove('dragging'); });
  button.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dragDepth = 0; button.classList.remove('dragging'); const file = e.dataTransfer?.files[0]; if (file) void accept(file); });
  return { accept };
}
```
