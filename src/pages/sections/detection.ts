export type ReadingRegion={left:number;right:number;start:number;end:number};
export type ReadingSection={
  index:number;title:string;page:number;position:number;source:'manual'|'heading'|'fallback';
  endPage?:number;regions?:Record<number,ReadingRegion[]>;planId?:string;
};

export function sectionAt(sections:ReadingSection[],page:number,position:number,x?:number){
  if(x!==undefined){
    const match=sections.find(s=>s.regions?.[page]?.some(r=>
      x>=r.left&&(x<r.right||r.right===1)&&position>=r.start&&(position<r.end||r.end===1)));
    if(match)return match;
  }
  return [...sections].reverse().find(s=>s.page<page||s.page===page&&s.position<=position+.005)??sections[0];
}
