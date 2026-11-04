/** Copy visible PDF text without changing its source or selection ranges. */
export function textInk(scope:HTMLElement,rect:{left:number;top:number;width:number;height:number}){
 const layer=document.createElement('span');layer.setAttribute('aria-hidden','true');layer.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;';
 for(const span of scope.querySelectorAll<HTMLElement>('.textLayer span')){
  const b=span.getBoundingClientRect();if(b.right<=rect.left||b.left>=rect.left+rect.width||b.bottom<=rect.top||b.top>=rect.top+rect.height||!span.textContent)continue;
  const style=getComputedStyle(span);const copy=document.createElement('span');copy.textContent=span.textContent;
  for(const key of Array.from(style))copy.style.setProperty(key,style.getPropertyValue(key));
  Object.assign(copy.style,{position:'absolute',left:`${b.left-rect.left}px`,top:`${b.top-rect.top}px`,margin:'0',width:`${span.offsetWidth}px`,height:`${span.offsetHeight}px`,transformOrigin:'0 0',transform:`scale(${b.width/Math.max(1,span.offsetWidth)},${b.height/Math.max(1,span.offsetHeight)})`,color:style.color==='rgba(0, 0, 0, 0)'?'#292b31':style.color,visibility:'visible',opacity:'1',pointerEvents:'none'});
  layer.append(copy);
 }
 return layer;
}
