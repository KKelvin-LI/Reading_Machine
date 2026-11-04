export type ReadingSection={index:number;title:string;page:number;position:number;source:'manual'|'fallback';endPage?:number;regions?:Record<number,{left:number;right:number;start:number;end:number}[]>};
export function sectionAt(sections:ReadingSection[],page:number,position:number){return [...sections].reverse().find(s=>s.page<page||s.page===page&&s.position<=position+.005)??sections[0];}
