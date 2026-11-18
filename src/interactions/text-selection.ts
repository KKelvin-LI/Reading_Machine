import {textSelectionPadding} from './text-hit';
/** Text selection uses glyph positions, never PDF.js container hit-testing. */
type Caret={node:Text;offset:number};
type TextRun={node:Text;rect:DOMRect};
export class TextSelection {
  private scope:HTMLElement|undefined;
  private start:Caret|null=null;
  private current:Text|null=null;
  active=false;
  constructor(private stage:HTMLElement){}
  private measure(){
    const runs:TextRun[]=[];
    const walker=document.createTreeWalker(this.scope??this.stage,NodeFilter.SHOW_TEXT);let n:Node|null;
    while((n=walker.nextNode())){
      if(!n.textContent?.trim()||!n.parentElement?.closest('.textLayer span'))continue;
      const r=document.createRange();r.selectNodeContents(n);const rect=r.getBoundingClientRect();
      const clip=n.parentElement?.closest('.section-page-window')?.getBoundingClientRect();
      if(clip&&(rect.bottom<=clip.top||rect.top>=clip.bottom))continue;
      if(rect.width&&rect.height)runs.push({node:n as Text,rect});
    }
    return runs;
  }
  private nearest(runs:TextRun[],x:number,y:number,padX:number,padY:number){
    let best:TextRun|undefined,bestDistance=Infinity,bestCentre=Infinity;
    for(const run of runs){
      const r=run.rect,dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);
      if(dx>padX||dy>padY)continue;
      const distance=Math.hypot(dx,dy),centre=Math.abs(y-(r.top+r.height/2));
      if(distance<bestDistance||(distance===bestDistance&&centre<bestCentre)){
        best=run;bestDistance=distance;bestCentre=centre;
      }
    }
    return best;
  }
  private caret(node:Text,x:number):Caret {
    let best:Caret={node,offset:0},distance=Infinity;
    const r=document.createRange();
    for(let i=0;i<node.length;i++){
      r.setStart(node,i);r.setEnd(node,i+1);const b=r.getBoundingClientRect();
      for(const [edge,offset] of [[b.left,i],[b.right,i+1]]){const d=Math.abs(x-edge);if(d<distance){distance=d;best={node,offset};}}
    }
    return best;
  }
  begin(x:number,y:number){
    this.scope=Array.from(this.stage.querySelectorAll<HTMLElement>('.section-reading-pane')).find(p=>{const r=p.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
    const pad=textSelectionPadding(this.stage),viewport=(this.scope??this.stage).getBoundingClientRect();
    const visible=this.measure().filter(({rect})=>rect.bottom>=viewport.top&&rect.top<=viewport.bottom);
    const hit=this.nearest(visible,x,y,pad,pad);
    if(!hit)return false;
    this.current=hit.node;this.start=this.caret(hit.node,x);this.active=true;
    this.updateSelection(this.start);return true;
  }
  move(x:number,y:number){
    if(!this.active)return;
    // Cross into a run's actual glyph band. A fixed screen-pixel threshold
    // skips entire lines on fitted thesis spreads and comparison panes.
    const hit=this.nearest(this.measure(),x,y,Infinity,0);
    if(hit)this.current=hit.node;
    if(this.current?.isConnected)this.updateSelection(this.caret(this.current,x));
  }
  private updateSelection(end:Caret){
    if(this.start)window.getSelection()?.setBaseAndExtent(this.start.node,this.start.offset,end.node,end.offset);
  }
  end(){this.active=false;}
}
