/** Only selected text-node rectangles count. Container rectangles and PDF.js
 * end-of-content sentinels can cover unrelated lines and must never be highlighted.
 */
export function selectionLines(range:Range){
  const rects:DOMRect[]=[];
  const root=range.commonAncestorContainer;
  const nodes:Node[]=[];
  if(root.nodeType===Node.TEXT_NODE)nodes.push(root);
  else {const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walker.nextNode()))nodes.push(node);}
  for(const node of nodes){
    if(!node.textContent?.trim()||!node.parentElement?.closest('.textLayer span')||!range.intersectsNode(node))continue;
    const part=document.createRange();
    const start=node===range.startContainer?range.startOffset:0;
    const end=node===range.endContainer?range.endOffset:node.textContent.length;
    if(end<=start)continue;
    part.setStart(node,start);part.setEnd(node,end);
    rects.push(...Array.from(part.getClientRects()).filter(r=>r.width>0.5&&r.height>3));
  }
  rects.sort((a,b)=>a.top-b.top||a.left-b.left);
  const lines:{left:number;top:number;width:number;height:number}[]=[];
  for(const r of rects){
    const last=lines.at(-1);
    if(last&&Math.abs(last.top-r.top)<Math.min(last.height,r.height)*.45){
      const right=Math.max(last.left+last.width,r.right);last.left=Math.min(last.left,r.left);last.width=right-last.left;last.height=Math.max(last.height,r.height);
    }else lines.push({left:r.left,top:r.top,width:r.width,height:r.height});
  }
  return lines;
}
