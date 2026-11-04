import type {ReadingSection} from './detection';
// Verified boundaries for this exact PDF. Column 0 = left, 1 = right.
const starts=[
 ['Abstract',1,0,.219],
 ['Introduction',1,1,.293],
 ['Theories of Habit Loop',2,1,.165],
 ['Methodology',4,1,.546],
 ['Initial Idealisation',5,0,.544],
 ['Precedent Review',9,0,.553],
 ['Experiments',13,0,.837],
] as const;
export function draftSections():ReadingSection[]{
 return starts.map(([title,page,column,position],i)=>{
  const next=starts[i+1];const endPage=next?.[1]??18;
  const regions:NonNullable<ReadingSection['regions']>={};
  for(let n=page;n<=endPage;n++){
   const pieces=[];
   for(let c=0;c<2;c++){
    if(n===page&&c<column||next&&n===next[1]&&c>next[2])continue;
    const start=n===page&&c===column?position:n===1?.219:0;
    const end=next&&n===next[1]&&c===next[2]?next[3]:1;
    if(end>start)pieces.push({left:c/2,right:(c+1)/2,start,end});
   }
   if(pieces.length)regions[n]=pieces;
  }
  return {index:i+1,title,page,position,source:'manual',endPage,regions};
 });
}
