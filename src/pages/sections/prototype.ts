import type {PDFDocumentProxy} from 'pdfjs-dist';
import type {ReadingSection} from './detection';
import {prototypePaper} from '../../config/prototype';
import {draftSections} from './draft-sections';
export async function prototypeSections(pdf:PDFDocumentProxy,cancelled:()=>boolean):Promise<ReadingSection[]>{
 if(cancelled())throw new DOMException('Cancelled','AbortError');
 return pdf.fingerprints[0]===prototypePaper.fingerprint?draftSections():[{index:1,title:'Full document',page:1,position:0,source:'fallback'}];
}
