import {expandableMotion} from '../../ui/expand-motion';

/** Checker-only timings, in milliseconds. */
export const checkerMotion={exit:180,enter:260,tick:600,cross:540};
export function createCheckerMotion(panel:HTMLElement){
 let animations:Animation[]=[],list:ReturnType<typeof expandableMotion>|undefined;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function cancel(){list?.cancel();list=undefined;animations.forEach(a=>a.cancel());animations=[];}
 function animate(el:Element,frames:Keyframe[],duration:number,delay=0){
  if(reduced())return;
  const a=el.animate(frames,{duration,delay,fill:'backwards',easing:'cubic-bezier(.22,.75,.25,1)'});animations.push(a);return a;
 }
 function enterQuestion(answers:HTMLElement){
  animate(panel.querySelector('.checker-question')!,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],checkerMotion.enter);
  list=expandableMotion(answers);void list.play(true);
  animate(panel.querySelector('footer')!,[{opacity:0},{opacity:1}],checkerMotion.enter,120);
 }
 function enterResult(image:HTMLImageElement,correct:boolean){
  const frames:Keyframe[]=correct?[
   {opacity:0,transform:'translateY(18px) rotate(-12deg) scale(.55,.75)'},
   {opacity:1,transform:'translateY(-5px) rotate(3deg) scale(1.08,.94)',offset:.5},
   {transform:'translateY(2px) rotate(-1deg) scale(.98,1.04)',offset:.75},
   {opacity:1,transform:'translateY(0) rotate(0) scale(1)'}
  ]:[
   {opacity:0,transform:'scale(.65,.8) rotate(-9deg)'},
   {opacity:1,transform:'scale(1.07,.96) rotate(5deg)',offset:.45},
   {transform:'scale(.99,1.02) rotate(-3deg)',offset:.7},
   {opacity:1,transform:'scale(1) rotate(0)'}
  ];
  animate(image,frames,correct?checkerMotion.tick:checkerMotion.cross);
  panel.querySelectorAll('.checker-result h2,.checker-result p,footer').forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],checkerMotion.enter,140+i*45));
 }
 async function exit(){
  cancel();
  const runs=Array.from(panel.children).map(el=>animate(el,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-8px) scale(.985)'}],checkerMotion.exit));
  await Promise.all(runs.map(a=>a?.finished.catch(()=>undefined)));
 }
 return {cancel,enterQuestion,enterResult,exit};
}
