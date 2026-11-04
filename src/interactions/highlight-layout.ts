import { settings } from './settings';
export const HIGHLIGHT_HEIGHT_RATIO = 1.10;
export const CURSOR_RESIZE_SPEED = 18;
export function textHighlightHeight(textHeight:number) {
  return Math.max(1,textHeight*HIGHLIGHT_HEIGHT_RATIO);
}
export function hoverHeight(stage:HTMLElement,x:number,y:number) {
  const span=document.elementFromPoint(x,y)?.closest<HTMLElement>('.textLayer span');
  if(span&&stage.contains(span))return textHighlightHeight(span.getBoundingClientRect().height);
  return settings.cursorSize;
}
/** Virtual length is measured in cursor-height units, not screen pixels. */
export function rowScale(height:number) {return textHighlightHeight(height)/settings.cursorSize;}
