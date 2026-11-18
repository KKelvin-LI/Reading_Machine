import type {ReadingSection} from '../sections/detection';
/** Page-area weights respect cropped columns and exclude the appendix. */
export function sectionProgressPlan(sections:ReadingSection[],pages:number){
 const weights=sections.map((s,i)=>Math.max(.001,s.regions
  ?Object.values(s.regions).flat().reduce((sum,r)=>sum+(r.right-r.left)*(r.end-r.start),0)
  :(sections[i+1]?sections[i+1].page-1+sections[i+1].position:s.endPage??pages)-(s.page-1+s.position)));
 const total=weights.reduce((a,b)=>a+b,0);let sum=0;
 const ends=weights.map(w=>(sum+=w)/total*100);
 // Keep the three tool unlocks on separate section endings when the document
 // has enough sections. The final section then has its own completion reward.
 const checkpoints:number[]=[];
 const targets=[25,50,75];
 for(const [n,target] of targets.entries()){
  const distinct=ends.length>targets.length;
  const first=distinct&&n>0?checkpoints[n-1]+1:0;
  const last=distinct?ends.length-1-(targets.length-n):ends.length-1;
  let closest=first;
  for(let i=first+1;i<=last;i++){
   if(Math.abs(ends[i]-target)<Math.abs(ends[closest]-target))closest=i;
  }
  checkpoints.push(closest);
 }
 return {weights,total,ends,checkpoints};
}
