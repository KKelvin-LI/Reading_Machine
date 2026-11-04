/** Shared start-only buffer, measured in the reader's font em units. */
export const TEXT_SELECTION_BUFFER_EM=2;
export function textSelectionPadding(stage:HTMLElement){
  return TEXT_SELECTION_BUFFER_EM*parseFloat(getComputedStyle(stage.closest<HTMLElement>('#reader')??stage).fontSize);
}
export function nearPdfText(stage:HTMLElement,x:number,y:number,padding=textSelectionPadding(stage)){
  const viewport=stage.getBoundingClientRect();
  return [...stage.querySelectorAll<HTMLElement>('.textLayer span')].some(span=>{
    if(!span.textContent?.trim())return false;
    const r=span.getBoundingClientRect();
    const clip=span.closest('.section-page-window')?.getBoundingClientRect();
    if(clip&&(r.bottom<=clip.top||r.top>=clip.bottom))return false;
    if(!r.width||!r.height||r.bottom<viewport.top||r.top>viewport.bottom)return false;
    return x>=r.left-padding&&x<=r.right+padding&&y>=r.top-padding&&y<=r.bottom+padding;
  });
}
