import '../../styles/pages/sidebar-toggle.css';
export function mountSidebarToggle(root:HTMLElement,onResize:()=>Promise<void>){
 const sidebar=root.querySelector<HTMLElement>('.reading-sidebar')!;sidebar.id='reader-sidebar';
 const button=document.createElement('button');button.type='button';button.className='sidebar-toggle';button.dataset.nativeControl='';button.setAttribute('aria-controls',sidebar.id);button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Collapse reading sidebar');button.innerHTML='<span class="sidebar-toggle-lines" aria-hidden="true"><i></i><i></i><i></i></span>';
 root.querySelector('.reading-window')!.append(button);
 let busy=false;
 const label=root.querySelector<HTMLElement>('.reading-tools-label')!;
 const context=document.createElement('canvas').getContext('2d')!;
 function measure(){
  if(root.hidden)return;
  const brand=root.querySelector('.reading-brand span')!.getBoundingClientRect();root.style.setProperty('--reader-wide-left',`${brand.left-root.getBoundingClientRect().left}px`);
  // Align to visible capital-letter ink, rather than the larger CSS line box.
  if(label.closest('.is-visual,.is-squishy'))return;
  const style=getComputedStyle(label),rect=label.getBoundingClientRect(),frame=root.querySelector('.reading-window')!.getBoundingClientRect();
  context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics=context.measureText('UNLOCKED TOOLS'),size=parseFloat(style.fontSize);
  const ascent=metrics.fontBoundingBoxAscent??size*.8,descent=metrics.fontBoundingBoxDescent??size*.2;
  const line=parseFloat(style.lineHeight)||rect.height;
  const height=metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent;
  root.style.setProperty('--sidebar-icon-size',`${height}px`);
  root.style.setProperty('--sidebar-label-ink-top',`${(line-ascent-descent)/2+ascent-metrics.actualBoundingBoxAscent}px`);
 }
 const observer=new ResizeObserver(measure);observer.observe(root);observer.observe(label);
 new MutationObserver(measure).observe(root,{attributes:true,attributeFilter:['hidden']});
 document.fonts.ready.then(measure);measure();
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;measure();const collapsed=!root.classList.contains('sidebar-collapsed');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{
   if(!reduced)await button.querySelector('.sidebar-toggle-lines')!.animate([{scale:'1'},{scale:'.86 .72',offset:.45},{scale:'1'}],{duration:220,easing:'ease-in-out'}).finished;
   sidebar.inert=collapsed;root.classList.toggle('sidebar-collapsed',collapsed);button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'Expand reading sidebar':'Collapse reading sidebar');
   if(!reduced)await new Promise(resolve=>setTimeout(resolve,420));
   await onResize();
  }finally{busy=false;}
 });
}
