import {textInk} from './text-ink';
import { type Band } from './squishy-transition';
import { settings } from './settings';

/** White-paper prototype: mask originals and restore their raster ink above WebGL. */
export class SelectedText {
  private masks = document.createElement('div');
  private ink = document.createElement('div');
  constructor(private stage: HTMLElement) {
    for (const [layer, z] of [[this.masks, 39], [this.ink, 42]] as const) {
      layer.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${z}`;
      layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
    }
  }
  setClip(clip:string){this.masks.style.clipPath=clip;this.ink.style.clipPath=clip;}
  clear() { this.masks.replaceChildren(); this.ink.replaceChildren(); }
  update(rows: Band[]) {
    this.clear();
    for(const row of rows){
      const placement=`position:absolute;left:${row.left}px;top:${row.top}px;width:${row.width}px;height:${row.height}px;pointer-events:none;`;
      const mask=document.createElement('div');mask.style.cssText=placement+'background:white';
      const ink=document.createElement('div');ink.style.cssText=placement;ink.append(textInk(this.stage,row));
      this.masks.append(mask);this.ink.append(ink);
    }
  }
}
