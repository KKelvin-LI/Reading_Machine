import {playSound} from '../../ui/sounds';
import { mountAbout } from '../about/controller';
import { createFrog, type FrogView } from '../../three/home-frog';
import { homeSettings } from '../../config/home';

export function mountHome(input: HTMLInputElement, openReader: (file: File) => Promise<void>) {
  const button = document.getElementById('choose-file') as HTMLButtonElement;
  const home = document.getElementById('home')!;
  mountAbout(home);
  const status = document.getElementById('home-upload-status')!;
  let view: FrogView | undefined, busy = false, dragDepth = 0;
  function syncFrog(){view?.setVisible(!home.hidden&&!home.classList.contains('history-open')&&!document.body.classList.contains('catch-open'));}
  document.addEventListener('catch:visibility',syncFrog);
  new MutationObserver(syncFrog).observe(home,{attributes:true,attributeFilter:['hidden','class']});
  const ready = createFrog(document.getElementById('frog-scene')!).then(v => {
    view = v; syncFrog(); button.classList.add('model-ready'); status.textContent = ''; return v;
  }).catch(error => { console.error(error); status.textContent = '3D preview unavailable. Click to choose a PDF.'; return undefined; });
  let choosing=false;
  button.addEventListener('click', async () => {
    if (busy||choosing) return;
    choosing=true;
    playSound('bubble');
    try { await view?.click(); input.click(); }
    finally { choosing=false; }
  });
  async function accept(file: File, dropped=false) {
    if (busy) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') { status.textContent = 'Please choose a PDF file.'; return; }
    if (file.size > homeSettings.maxFileBytes) { status.textContent = 'Please choose a PDF smaller than 100 MB.'; return; }
    busy = true; button.setAttribute('aria-busy', 'true');
    if(dropped)playSound('bubble');
    try {
      const model = await ready;
      status.textContent = 'Delivering your document…';
      if (model) { if(dropped)await model.click(); await model.deliver(); }
      await openReader(file);
    } catch (error) { console.error(error); status.textContent = 'Please try uploading your PDF again.'; }
    finally { busy = false; button.removeAttribute('aria-busy'); view?.reset(); if (home.hidden) status.textContent = ''; }
  }
  button.addEventListener('dragenter', e => { if (!e.dataTransfer?.types.includes('Files')) return; e.preventDefault(); dragDepth++; button.classList.add('dragging'); });
  button.addEventListener('dragover', e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = busy ? 'none' : 'copy'; });
  button.addEventListener('dragleave', () => { if (--dragDepth <= 0) button.classList.remove('dragging'); });
  button.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dragDepth = 0; button.classList.remove('dragging'); const file = e.dataTransfer?.files[0]; if (file) { void accept(file,true); } });
  document.addEventListener('eaty:release-hold',()=>{view?.releaseHold();home.inert=false;});
  let sceneMotion=Promise.resolve();
  document.addEventListener('eaty:window',event=>{
    const {panel,reverse,holdAtBottom,resolve,reject}=(event as CustomEvent<{panel:HTMLElement;reverse:boolean;holdAtBottom?:boolean;resolve:()=>void;reject:(error:unknown)=>void}>).detail;
    sceneMotion=sceneMotion.then(async()=>{
      const model=await ready;if(!model)return;
      const wasHidden=home.hidden;home.hidden=false;home.inert=true;
      // History must share the reader's stacking plane, above the body-level frog canvas.
      const parent=panel.parentElement!,next=panel.nextSibling,original=panel.getAttribute('style');
      const rect=panel.getBoundingClientRect(),computed=getComputedStyle(panel);
      const inherited=[...computed].filter(name=>name.startsWith('--')).map(name=>[name,computed.getPropertyValue(name)]);
      const font=computed.font,spacing=computed.letterSpacing;
      for(const [name,value] of inherited)panel.style.setProperty(name,value);
      Object.assign(panel.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,bottom:'auto',right:'auto',margin:'0',zIndex:'1',font,letterSpacing:spacing});
      document.body.append(panel);
      try{await model.lift(panel,reverse,holdAtBottom);}finally{parent.insertBefore(panel,next);if(original===null)panel.removeAttribute('style');else panel.setAttribute('style',original);home.hidden=wasHidden;home.inert=!!holdAtBottom;}

    }).then(resolve,reject);
  });
  return { accept, async transition(panel:HTMLElement,reverse=false){ const model=await ready;if(model)await model.lift(panel,reverse); } };
}
