import type {ReadingSection} from './detection';
export function sectionRange(sections:ReadingSection[],index:number,pages:number){
 const start=sections[index]??sections[0],end=sections[index+1];
 return {startPage:start?.page??1,startPosition:Math.max(0,start?.position??0),endPage:start?.endPage??end?.page??pages,endPosition:start?.regions?1:end?Math.max(0,end.position):1};
}
export function pageCrop(range:ReturnType<typeof sectionRange>,page:number){
 if(page<range.startPage||page>range.endPage)return null;
 const start=page===range.startPage?range.startPosition:0,end=page===range.endPage?range.endPosition:1;
 return end>start?{start,end}:null;
}
