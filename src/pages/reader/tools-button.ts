import {expandableMotion} from '../../ui/expand-motion';
import {createSquishyNavigation} from '../../three/squishy-navigation';
export function mountToolsButton(root:HTMLElement){
 const panel=root.querySelector<HTMLElement>('.reading-tools')!,button=root.querySelector<HTMLButtonElement>('#reading-tools-toggle')!,list=root.querySelector<HTMLElement>('#reading-tool-list')!;
 panel.querySelector('.reading-tools-model')?.remove();
 const motion=expandableMotion(list);
 let expanded=false,version=0;const resets:(()=>void)[]=[],refresh:(()=>void)[]=[],bound=new WeakSet<HTMLElement>();
 button.setAttribute('aria-controls',list.id);button.setAttribute('aria-expanded','false');list.hidden=true;
 function bind(el:HTMLElement,label:HTMLElement,action:()=>void|Promise<void>,heading=false){
  const host=document.createElement('span');host.className='tool-button-model';host.setAttribute('aria-hidden','true');el.append(host);el.dataset.nativeControl='';
  let hover=false,pressing=false,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined,ready:Promise<void>|undefined;
  function visual(){const on=!heading||expanded||hover||pressing;el.classList.toggle('is-squishy',on);if(heading)panel.classList.toggle('is-visual',on);view?.show(on&&!list.hidden||heading&&on);}
  refresh.push(visual);
  function prepare(){return ready??=createSquishyNavigation(host,label,{text:label.textContent??'',colour:'#f89823',letterColour:'#326eb3',sectionLabel:true}).then(v=>{view=v;el.classList.add('model-ready');visual();});}
  el.addEventListener('pointerenter',()=>{hover=true;visual();void prepare();});el.addEventListener('pointerleave',()=>{hover=false;visual();});
  el.addEventListener('focusin',()=>{hover=true;visual();void prepare();});el.addEventListener('focusout',()=>{hover=false;visual();});
  el.addEventListener('click',async event=>{event.preventDefault();if(pressing)return;const token=version;pressing=true;visual();try{await prepare();await view?.press();if(token===version)await action();}finally{pressing=false;visual();}});
  resets.push(()=>{hover=pressing=false;visual();view?.show(false);});
  if(!heading){visual();void prepare();}
 }
 bind(button,button.querySelector<HTMLElement>('.reading-tools-label')!,async()=>{const token=version;expanded=!expanded;button.setAttribute('aria-expanded',String(expanded));if(expanded){list.hidden=false;panel.classList.add('is-expanded');refresh.forEach(fn=>fn());}await motion.play(expanded);if(token!==version)return;if(!expanded){list.hidden=true;panel.classList.remove('is-expanded');refresh.forEach(fn=>fn());motion.cancel();}},true);
 function rows(){for(const el of list.querySelectorAll<HTMLElement>('.reading-tool')){if(bound.has(el))continue;bound.add(el);const box=el.querySelector<HTMLInputElement>('input')!;bind(el,el.querySelector<HTMLElement>('.reading-tool-text')!,()=>{box.checked=!box.checked;box.dispatchEvent(new Event('change',{bubbles:true}));});}}
 new MutationObserver(rows).observe(list,{childList:true});rows();
 return {reset(){version++;motion.cancel();expanded=false;list.hidden=true;panel.classList.remove('is-expanded');button.setAttribute('aria-expanded','false');resets.forEach(fn=>fn());}};
}
