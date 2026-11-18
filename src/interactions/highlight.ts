/** Only selected text-node rectangles count. Container rectangles and PDF.js
 * end-of-content sentinels can cover unrelated lines and must never be highlighted.
 */
export function selectionLines(range:Range){
  const lines:{left:number;top:number;width:number;height:number}[]=[];
  let previousLayer:Element|null=null;
  const root=range.commonAncestorContainer;
  const nodes:Node[]=[];
  if(root.nodeType===Node.TEXT_NODE)nodes.push(root);
  else {const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walker.nextNode()))nodes.push(node);}
  for(const node of nodes){
    const layer=node.parentElement?.closest('.textLayer span')?.closest('.textLayer');
    if(!node.textContent?.trim()||!layer||!range.intersectsNode(node))continue;
    const part=document.createRange();
    const start=node===range.startContainer?range.startOffset:0;
    const end=node===range.endContainer?range.endOffset:node.textContent.length;
    if(end<=start)continue;
    part.setStart(node,start);part.setEnd(node,end);
    // Preserve PDF reading order. Boxes on the same baseline can belong to
    // different columns, even when their text is adjacent in the PDF stream.
    for(const r of part.getClientRects()){
      if(r.width<=0||r.height<=0)continue;
      const last=lines.at(-1);
      const height=last?Math.min(last.height,r.height):0;
      if(last&&previousLayer===layer&&Math.abs(last.top-r.top)<height*.45&&
         Math.max(last.left-r.right,r.left-(last.left+last.width))<=height){
        const right=Math.max(last.left+last.width,r.right);
        const bottom=Math.max(last.top+last.height,r.bottom);
        last.left=Math.min(last.left,r.left);last.top=Math.min(last.top,r.top);
        last.width=right-last.left;last.height=bottom-last.top;
      }else{
        lines.push({left:r.left,top:r.top,width:r.width,height:r.height});
      }
      previousLayer=layer;
    }
  }
  return lines;
}
