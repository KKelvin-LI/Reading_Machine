import {createSquishyNavigation} from '../../three/squishy-navigation';
import {sectionSettings as palette} from '../../config/sections';

/** Button-based panels share the tool stack's single-active-tool behaviour. */
export function mountButtonToolSettings(root:HTMLElement,stack:HTMLElement,tool:string){
 const panel=document.createElement('section');panel.className='tool-settings button-tool-settings';panel.dataset.tool=tool;panel.dataset.nativeControl='';panel.hidden=true;panel.tabIndex=0;panel.setAttribute('aria-label',`${tool} settings`);panel.style.setProperty('--tool-colour',palette.colours[0]);
 const heading=document.createElement('h2');heading.textContent=`${tool.toUpperCase()} SETTING`;panel.append(heading);
 const choices=document.createElement('div');choices.className=tool==='Checker'?'checker-choices':'connection-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label',tool==='Checker'?'Number of questions':'Trace mode');panel.append(choices);stack.append(panel);
 const labels=tool==='Checker'?['1','2','3','4']:['Term Definition Trace','Same Term Usage Trace'];
 let selected=-1,version=0;
 const visuals:(()=>void)[]=[];const resets:(()=>void)[]=[];
 labels.forEach((text,index)=>{
  const button=document.createElement('button');button.type='button';button.className='setting-choice';button.dataset.nativeControl='';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',tool==='Checker'?`${text} ${index===0?'question':'questions'}`:text);
  const label=document.createElement('span');label.className='setting-choice-label';label.textContent=text;
  const host=document.createElement('span');host.className='setting-choice-model';host.setAttribute('aria-hidden','true');button.append(host,label);choices.append(button);
  const colour=palette.colours[index],letterColour=palette.textColours[index];button.style.setProperty('--choice-ink',letterColour);
  let hover=false,pressing=false,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined,ready:Promise<void>|undefined;
  function visual(){const on=hover||pressing||selected===index;button.classList.toggle('is-squishy',on);button.setAttribute('aria-pressed',String(selected===index));view?.show(on&&!panel.hidden);}
  function prepare(){return ready??=createSquishyNavigation(host,label,{text,colour,letterColour,sectionLabel:true}).then(v=>{view=v;visual();});}
  button.addEventListener('pointerenter',()=>{hover=true;visual();void prepare();});button.addEventListener('pointerleave',()=>{hover=false;visual();});
  button.addEventListener('focusin',()=>{hover=true;visual();void prepare();});button.addEventListener('focusout',()=>{hover=false;visual();});
  button.addEventListener('click',async()=>{if(pressing)return;const token=version;pressing=true;visual();try{await prepare();await view?.press();if(token!==version)return;selected=index;panel.style.setProperty('--tool-colour',colour);visuals.forEach(fn=>fn());root.dispatchEvent(new CustomEvent('reader:tool-settings',{bubbles:true,detail:{tool,colour,...(tool==='Checker'?{questionCount:index+1}:{traceMode:index===0?'definition':'usage'})}}));}finally{pressing=false;visual();}});
  visuals.push(visual);resets.push(()=>{hover=pressing=false;visual();});
 });
 if(tool==='Checker'){const caption=document.createElement('span');caption.className='checker-caption';caption.textContent='Questions';choices.append(caption);}
 panel.addEventListener('pointerdown',()=>root.dispatchEvent(new CustomEvent('reader:tool-activate',{detail:{tool}})));
 panel.addEventListener('keydown',e=>{if(e.target===panel&&(e.key==='Enter'||e.key===' ')){e.preventDefault();root.dispatchEvent(new CustomEvent('reader:tool-activate',{detail:{tool}}));}});
 panel.addEventListener('pointerenter',()=>document.body.classList.add('tool-slider-active'));panel.addEventListener('pointerleave',()=>document.body.classList.remove('tool-slider-active'));
 root.addEventListener('reader:tool-toggle',event=>{const d=(event as CustomEvent).detail;if(d.tool!==tool)return;panel.hidden=!d.selected;visuals.forEach(fn=>fn());});
 return {reset(){version++;selected=-1;panel.hidden=true;panel.style.setProperty('--tool-colour',palette.colours[0]);resets.forEach(fn=>fn());}};
}
