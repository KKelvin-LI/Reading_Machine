import type {ReadingSection} from '../sections/detection';
/** Page-area weights respect cropped columns and exclude the appendix. */
export function sectionProgressPlan(sections:ReadingSection[],pages:number){
 const weights=sections.map((s,i)=>Math.max(.001,s.regions
  ?Object.values(s.regions).flat().reduce((sum,r)=>sum+(r.right-r.left)*(r.end-r.start),0)
  :(sections[i+1]?sections[i+1].page-1+sections[i+1].position:s.endPage??pages)-(s.page-1+s.position)));
 const total=weights.reduce((a,b)=>a+b,0);let sum=0;
 const ends=weights.map(w=>(sum+=w)/total*100);
 const checkpoints=[25,50,75].map(target=>ends.reduce((best,end,i)=>Math.abs(end-target)<Math.abs(ends[best]-target)?i:best,0));
 return {weights,total,ends,checkpoints};
}
