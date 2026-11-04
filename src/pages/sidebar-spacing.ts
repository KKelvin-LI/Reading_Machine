/** LS measures the visible gap: text ink when plain, whole cushion when shown. */
export function syncSidebarSpacing(){
 const ctx=document.createElement('canvas').getContext('2d')!;
 let frame=0;
 function inset(block:HTMLElement,label:HTMLElement,visual:boolean){
  if(visual)return {top:0,bottom:0};
  const style=getComputedStyle(label),b=block.getBoundingClientRect(),r=label.getBoundingClientRect();
  ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const m=ctx.measureText(label.textContent?.trim()||'ABOUT');
  const ascent=m.fontBoundingBoxAscent??parseFloat(style.fontSize)*.8,descent=m.fontBoundingBoxDescent??parseFloat(style.fontSize)*.2;
  const line=parseFloat(style.lineHeight)||r.height;
  const top=r.top-b.top+(line-ascent-descent)/2+ascent-m.actualBoundingBoxAscent;
  return {top:Math.max(0,top),bottom:Math.max(0,b.height-top-m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)};
 }
 function pair(container:HTMLElement,first:HTMLElement,second:HTMLElement,a:HTMLElement,b:HTMLElement,reader=false){
  if(!container.getClientRects().length)return;
  const probe=document.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;width:var(--nav-gap);height:0';container.append(probe);const ls=probe.getBoundingClientRect().width;probe.remove();
  const x=inset(first,a,first.classList.contains('is-visual')),y=inset(second,b,second.classList.contains('is-visual'));
  const gap=Math.max(0,ls-x.bottom-y.top)+'px';
  if(reader)second.parentElement!.style.setProperty('margin-top',gap,'important');else container.style.rowGap=gap;
 }
 function update(){frame=0;
  const home=document.querySelector<HTMLElement>('.home-navigation'),about=home?.querySelector<HTMLElement>('.about-toggle'),history=home?.querySelector<HTMLElement>('.history-toggle');
  if(home&&about&&history)pair(home,about,history,about.querySelector('.about-button-label')!,history.querySelector('.about-button-label')!);
  const side=document.querySelector<HTMLElement>('.reading-sidebar'),tools=side?.querySelector<HTMLElement>('.reading-tools'),highlights=side?.querySelector<HTMLElement>('#highlights-toggle');
  if(side&&tools&&highlights)pair(side,tools,highlights,tools.querySelector('.reading-tools-label')!,highlights.querySelector('.about-button-label')!,true);
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 for(const selector of ['.home-navigation','.reading-sidebar']){const el=document.querySelector(selector);if(el){new MutationObserver(schedule).observe(el,{attributes:true,attributeFilter:['class'],subtree:true});new ResizeObserver(schedule).observe(el);}}
 window.addEventListener('resize',schedule);document.fonts.ready.then(schedule);schedule();
 new MutationObserver(schedule).observe(document.getElementById('reader')!,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(schedule).observe(document.getElementById('home')!,{attributes:true,attributeFilter:['hidden']});
}
