import type {PDFDocumentProxy} from 'pdfjs-dist';
import type {ReadingSection} from './detection';
import {draftFingerprint} from '../../config/prototype';
import {draftSections} from './draft-sections';
import {thesisSections} from './thesis-sections';

export async function prototypeSections(pdf:PDFDocumentProxy,cancelled:()=>boolean):Promise<ReadingSection[]>{
  if(cancelled())throw new DOMException('Cancelled','AbortError');
  if(pdf.fingerprints[0]===draftFingerprint)return draftSections();
  return await thesisSections(pdf,cancelled)??[{index:1,title:'Full document',page:1,position:0,source:'fallback'}];
}
