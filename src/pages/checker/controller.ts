import {playSound} from '../../ui/sounds';
import {checkerQuestions, type Question} from './questions';
import {createCheckerMotion} from './motion';
import {checkerResultArt} from './result-art';
import {createSquishyNavigation} from '../../three/squishy-navigation';
import {colourCycle,textColourCycle} from '../../config/palette';
import '../../styles/pages/checker.css';

export function mountChecker(root:HTMLElement){
 const stage=root.querySelector<HTMLElement>('#page-stage')!;
 const panel=document.createElement('section');panel.className='checker-panel';panel.hidden=true;panel.dataset.nativeControl='';panel.setAttribute('aria-label','Section comprehension checker');
 const notice=document.createElement('p');notice.className='wheel-status checker-notice';notice.hidden=true;notice.setAttribute('role','status');notice.textContent='Click a section to start Checker.';
 root.append(panel,notice);
 const motion=createCheckerMotion(panel);
 let active=false,supported=false,count=1,index=0,questions:Question[]=[],version=0;
 let disposeButtons:(()=>void)[]=[];
 function position(){const b=stage.getBoundingClientRect();for(const el of [panel,notice]){el.style.left=`${b.left}px`;el.style.width=`${b.width}px`;}panel.style.top=`${b.top}px`;panel.style.height=`${b.height}px`;notice.style.bottom=`${Math.max(0,innerHeight-b.bottom)+16}px`;}
 new ResizeObserver(position).observe(stage);window.addEventListener('resize',position);
 function clear(){motion.cancel();version++;disposeButtons.forEach(fn=>fn());disposeButtons=[];panel.replaceChildren();}
 function hide(){clear();panel.hidden=true;notice.hidden=true;questions=[];}
 function reset(){active=false;hide();document.body.classList.remove('checker-active');}
 function finish(){const input=root.querySelector<HTMLInputElement>('.reading-tool[data-tool="2"] input');if(input?.checked){input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));}else{root.dispatchEvent(new CustomEvent('reader:tool-toggle',{detail:{tool:'Checker',selected:false}}));}reset();}
 function button(text:string,colourIndex:number,action:()=>void|Promise<void>,plain=false){
  const b=document.createElement('button');b.type='button';b.className=`checker-answer${plain?' checker-next':''}`;
  const host=document.createElement('span'),label=document.createElement('span');host.className='checker-model';host.setAttribute('aria-hidden','true');label.className='checker-label';label.textContent=text;b.append(host,label);
  const colour=colourCycle[colourIndex%8],ink=textColourCycle[colourIndex%8];b.style.setProperty('--choice-ink',ink);
  let hover=false,pressing=false,dead=false,view:Awaited<ReturnType<typeof createSquishyNavigation>>|undefined,ready:Promise<void>|undefined;
  function visual(){if(dead)return;b.classList.toggle('is-squishy',hover||pressing);view?.show(!dead&&(hover||pressing));}
  function prepare(){return ready??=createSquishyNavigation(host,label,{text,colour,letterColour:ink,sectionLabel:true}).then(v=>{if(dead){v.dispose();return;}view=v;visual();});}
  b.onpointerenter=()=>{hover=true;visual();void prepare();};b.onpointerleave=()=>{hover=false;visual();};b.onfocus=()=>{hover=true;visual();void prepare();};b.onblur=()=>{hover=false;visual();};
  b.onclick=async(event)=>{if(pressing||panel.dataset.busy==='true')return;panel.dataset.busy='true';pressing=true;const token=version;visual();try{await prepare();await view?.press(event.detail?event:undefined);if(!dead&&token===version)await action();}catch(error){console.warn(error);if(!dead&&token===version)await action();}finally{pressing=false;if(!dead)panel.dataset.busy='false';visual();}};
  disposeButtons.push(()=>{dead=true;view?.dispose();});return b;
 }
 function tracker(){const p=document.createElement('span');p.className='checker-tracker';p.textContent=`${index+1}/${questions.length}`;p.setAttribute('aria-label',`Question ${index+1} of ${questions.length}`);return p;}
 function showQuestion(){clear();panel.dataset.busy='false';const q=questions[index];const heading=document.createElement('h2');heading.className='checker-question';heading.tabIndex=-1;heading.textContent=q.prompt;const answers=document.createElement('div');answers.className='checker-answers';q.options.forEach((option,i)=>answers.append(button(`${String.fromCharCode(65+i)}. ${option}`,i,()=>transition(()=>showResult(i)))));const footer=document.createElement('footer');footer.append(tracker());panel.append(heading,answers,footer);heading.focus({preventScroll:true});motion.enterQuestion(answers);}
 function showResult(answer:number){clear();const q=questions[index],correct=answer===q.answer;playSound(correct?'correct':'wrong');const result=document.createElement('div');result.className='checker-result';result.setAttribute('role','status');const image=document.createElement('img');image.alt=correct?'Correct':'Incorrect';image.src=checkerResultArt(correct,colourCycle[answer]);const heading=document.createElement('h2');heading.textContent=correct?'Correct':'Not quite';const explanation=document.createElement('p');explanation.textContent=`Correct answer: ${String.fromCharCode(65+q.answer)}. ${q.options[q.answer]}`;result.append(image,heading,explanation);const footer=document.createElement('footer');footer.append(tracker(),button(index===questions.length-1?'Close':'Next',answer,()=>transition(()=>{if(index===questions.length-1)finish();else{index++;showQuestion();}}),true));panel.append(result,footer);panel.dataset.busy='false';motion.enterResult(image,correct);}
 async function transition(next:()=>void){const token=version;await motion.exit();if(token===version&&active)next();}
 function start(section:number){const bank=checkerQuestions[section];if(!bank)return;questions=[bank[0],bank[2],bank[1],bank[3]].slice(0,count);index=0;notice.hidden=true;panel.hidden=false;position();showQuestion();}
 root.addEventListener('reader:tool-settings',event=>{const d=(event as CustomEvent).detail;if(d.tool==='Checker'&&d.questionCount)count=Math.max(1,Math.min(4,d.questionCount));});
 root.addEventListener('reader:active-tool-change',event=>{active=(event as CustomEvent).detail.tool==='Checker';document.body.classList.toggle('checker-active',active);if(!active)hide();else{position();notice.textContent=supported?'Click a section to start Checker.':'Checker questions are available for Draft 1.';notice.hidden=false;}});
 root.addEventListener('reader:tool-toggle',event=>{const d=(event as CustomEvent).detail;if(d.tool==='Checker'&&!d.selected)reset();});
 // Capture only pane interaction: tool controls remain usable, text selection/menu gestures do not compete.
 for(const name of ['pointerdown','pointerup','contextmenu'] as const)root.addEventListener(name,event=>{if(active&&(event.target as Element).closest('.section-reading-pane')){event.preventDefault();event.stopImmediatePropagation();}},true);
 root.addEventListener('click',event=>{if(!active||!panel.hidden)return;const pane=(event.target as Element).closest<HTMLElement>('.section-reading-pane');if(!pane)return;event.preventDefault();event.stopImmediatePropagation();if(supported)start(Number(pane.dataset.section));},true);
 return {reset,setDocument(fingerprint:string){reset();supported=fingerprint==='0d5f305beab8478595f91b12b525e4f1';}};
}
