import {textSelectionPadding} from './text-hit';
/** Text selection uses glyph positions, never PDF.js container hit-testing. */
type Caret={node:Text;offset:number};
type Line={top:number;bottom:number;left:number;right:number;nodes:Text[]};
export class TextSelection {
  private lines:Line[]=[];
  private scope:HTMLElement|undefined;
  private start:Caret|null=null;
  private startY=0;
  private activeLine=0;
  active=false;
  constructor(private stage:HTMLElement){}
  private measure(){
    this.lines=[];
    const nodes: {node:Text;rect:DOMRect}[]=[];
    const walker=document.createTreeWalker(this.scope??this.stage,NodeFilter.SHOW_TEXT);let n:Node|null;
    while((n=walker.nextNode())){
      if(!n.textContent?.trim()||!n.parentElement?.closest('.textLayer span'))continue;
      const r=document.createRange();r.selectNodeContents(n);const rect=r.getBoundingClientRect();
      const clip=n.parentElement?.closest('.section-page-window')?.getBoundingClientRect();
      if(clip&&(rect.bottom<=clip.top||rect.top>=clip.bottom))continue;
      if(rect.width&&rect.height)nodes.push({node:n as Text,rect});
    }
    nodes.sort((a,b)=>a.rect.top-b.rect.top||a.rect.left-b.rect.left);
    for(const {node,rect:r} of nodes){
      const line=this.lines.at(-1);
      if(line&&Math.abs(line.top-r.top)<Math.min(line.bottom-line.top,r.height)*.4){line.nodes.push(node);line.left=Math.min(line.left,r.left);line.right=Math.max(line.right,r.right);line.bottom=Math.max(line.bottom,r.bottom);}
      else this.lines.push({top:r.top,bottom:r.bottom,left:r.left,right:r.right,nodes:[node]});
    }
  }
  private caret(line:Line,x:number):Caret {
    let best:Caret={node:line.nodes[0],offset:0},distance=Infinity;
    for(const node of line.nodes){
      for(let i=0;i<node.length;i++){
        const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);const b=r.getBoundingClientRect();
        for(const [edge,offset] of [[b.left,i],[b.right,i+1]]){const d=Math.abs(x-edge);if(d<distance){distance=d;best={node,offset};}}
      }
    }
    return best;
  }
  begin(x:number,y:number){
    this.scope=Array.from(this.stage.querySelectorAll<HTMLElement>('.section-reading-pane')).find(p=>{const r=p.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
    this.measure();
    const pad=textSelectionPadding(this.stage),viewport=this.stage.getBoundingClientRect();
    let i=-1,best=Infinity;
    this.lines.forEach((l,index)=>{
      if(l.bottom<viewport.top||l.top>viewport.bottom)return;
      const dx=Math.max(l.left-x,0,x-l.right),dy=Math.max(l.top-y,0,y-l.bottom);
      const distance=Math.hypot(dx,dy);
      if(dx<=pad&&dy<=pad&&distance<best){best=distance;i=index;}
    });
    if(i<0)return false;
    this.start=this.caret(this.lines[i],x);this.startY=y;this.activeLine=i;this.active=true;
    this.updateSelection(this.start);return true;
  }
  move(x:number,y:number){
    if(!this.active)return;
    this.measure();
    if(!this.lines.length)return;
    this.activeLine=Math.min(this.activeLine,this.lines.length-1);
    const current=this.lines[this.activeLine];
    // A little vertical drift must not select the next line. Cross into its glyph band first.
    if(y<current.top-3||y>current.bottom+3){
      const i=this.lines.findIndex(l=>y>=l.top&&y<=l.bottom);
      if(i>=0&&Math.abs(y-this.startY)>Math.max(8,(current.bottom-current.top)*.65))this.activeLine=i;
    }
    this.updateSelection(this.caret(this.lines[this.activeLine],x));
  }
  private updateSelection(end:Caret){
    if(this.start)window.getSelection()?.setBaseAndExtent(this.start.node,this.start.offset,end.node,end.offset);
  }
  end(){this.active=false;}
}
