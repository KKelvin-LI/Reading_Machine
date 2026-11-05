import type {PDFDocumentProxy} from 'pdfjs-dist';
import type {ReadingSection} from '../sections/detection';
export type TermAnchor={section:number;page:number;item:number;start:number;end:number;endItem?:number};
type Token={word:string;anchor:TermAnchor};
const cache=new WeakMap<PDFDocumentProxy,Promise<Token[][]>>();
const normal=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[’']/g,'');
export async function termIndex(pdf:PDFDocumentProxy,sections:ReadingSection[]){
 let pending=cache.get(pdf);if(pending)return pending;
 pending=(async()=>{const result:Token[][]=sections.map(()=>[]);
 for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
 const page=await pdf.getPage(pageNo),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
 const items=content.items.filter((i):i is Extract<typeof i,{str:string}>=>'str' in i);
 sections.forEach((section,sectionNo)=>{const regions=section.regions?.[pageNo];const next=sections[sectionNo+1];
 if(section.regions&&!regions)return;
 if(!regions&&(pageNo<section.page||pageNo>(section.endPage??next?.page??pdf.numPages)))return;
 const ordered=items.map((item,i)=>{const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);return {item,i,x:x/viewport.width,y:y/viewport.height};}).filter(p=>regions?regions.some(r=>p.x>=r.left&&p.x<r.right&&p.y>=r.start&&p.y<r.end):((pageNo!==section.page||p.y>=section.position)&&(!next||pageNo!==next.page||p.y<next.position)));
 // PDF item order is retained within each manually verified reading column.
 if(regions)ordered.sort((a,b)=>regions.findIndex(r=>a.x>=r.left&&a.x<r.right)-regions.findIndex(r=>b.x>=r.left&&b.x<r.right)||a.i-b.i);
 for(const {item,i} of ordered)for(const m of item.str.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)?/gu))result[sectionNo].push({word:normal(m[0]),anchor:{section:sectionNo,page:pageNo,item:i,start:m.index!,end:m.index!+m[0].length}});
 });
 }return result;})();cache.set(pdf,pending);pending.catch(()=>cache.delete(pdf));return pending;
}
export function findTerms(index:Token[][],query:string,mode:string,source?:TermAnchor){
 if(mode==='definition')return randomPassages(index,source);
 const words=Array.from(query.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)?/gu),m=>normal(m[0]));
 const found=new Map<number,TermAnchor[]>();if(!words.length)return found;
 index.forEach((tokens,section)=>{const hits:TermAnchor[]=[];
 for(let i=0;i<=tokens.length-words.length;i++){
 if(!words.every((w,j)=>tokens[i+j].word===w))continue;
 const first=tokens[i].anchor,last=tokens[i+words.length-1].anchor;
 if(source&&first.section===source.section&&first.page===source.page&&first.item===source.item&&first.start===source.start)continue;
 if(first.page!==last.page)continue;
 hits.push({...first,end:last.end,endItem:last.item});
 }found.set(section,hits);
 });return found;
}

/** Pick distinct PDF text passages once per trace, without semantic matching. */
export function randomPassages(index:Token[][],source?:TermAnchor,random= Math.random){
 const found=new Map<number,TermAnchor[]>();
 index.forEach((tokens,section)=>{
  const passages=new Map<string,TermAnchor>();
  for(const {anchor:a} of tokens){
   // Do not select the mother passage as one of its own children.
   if(source&&a.section===source.section&&a.page===source.page&&a.item>=source.item&&a.item<=(source.endItem??source.item))continue;
   const key=`${a.page}:${a.item}`,existing=passages.get(key);
   if(existing){existing.start=Math.min(existing.start,a.start);existing.end=Math.max(existing.end,a.end);}
   else passages.set(key,{...a});
  }
  const candidates=[...passages.values()],count=Math.min(candidates.length,1+Math.floor(random()*3));
  for(let i=0;i<count;i++){const j=i+Math.floor(random()*(candidates.length-i));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  found.set(section,candidates.slice(0,count).sort((a,b)=>a.page-b.page||a.item-b.item||a.start-b.start));
 });return found;
}
