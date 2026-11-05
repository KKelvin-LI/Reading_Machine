import {mountScrollSounds} from './ui/scroll-sounds';
import {mountSounds,playSound} from './ui/sounds';
import {mountCompletion} from './pages/completion/controller';
import {mountEatyBrand} from './three/eaty-art';
import {mountFingerCursor} from './three/finger-cursor';
import {syncSidebarSpacing} from './pages/sidebar-spacing';
import {readerSettings} from './config/reader';
import {readerTemplate} from './pages/reader/template';
import {mountReader} from './pages/reader/controller';
import {mountHistory} from './pages/history/controller';
import {historyArt,pressCross} from './three/history-art';
import {rememberPdf,getHistory} from './pages/history/store';
import 'pdfjs-dist/web/pdf_viewer.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/layout.css';
import './styles/typography.css';
import './styles/pages/home.css';
import './styles/button-labels.css';
import { homeTemplate } from './pages/home/template';
import { mountHome } from './pages/home/controller';
import { icon } from './lib/icons';
import { openPdf } from './lib/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <input id="file-input" type="file" accept="application/pdf,.pdf" hidden />
  ${homeTemplate}
  ${readerTemplate}
  <div id="error" class="toast" hidden role="alert"><span id="error-message"></span><button id="dismiss-error" class="icon-button" aria-label="Dismiss error">${icon('close')}</button></div>
`;

mountSounds();mountScrollSounds();
mountEatyBrand();

// Add ?grid=1 to the address to show the reference grid.
document.documentElement.classList.toggle('show-design-grid', new URLSearchParams(location.search).get('grid') === '1');

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = el<HTMLInputElement>('file-input');
const stage = el('page-stage');
mountCompletion();
const readerController=mountReader(el('reader'));

type DocumentEntry = { id: number; file: File; page: number; pages: number; historyId?:string };
const library: DocumentEntry[] = [];
let active: DocumentEntry | null = null;
let pdf: PDFDocumentProxy | null = null;
let documentVersion = 0;
let onHome = true;

function showError(message: string) { el('error-message').textContent = message; el('error').hidden = false; }
function loading(value: boolean) {
  const status=el('home-upload-status');
  el('home').classList.toggle('is-delivering',value);
  if(value)status.textContent='Delivering your document…';
  else if(status.textContent==='Delivering your document…')status.textContent='';
}
function size(bytes: number) { return bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`; }

function updateLibrary() {
  el('session-library').hidden = true;
  el('document-list').replaceChildren(...library.map(entry => {
    const button = document.createElement('button');
    button.className = 'document-card';
    button.innerHTML = `<span class="document-symbol">${icon('file')}</span><span class="document-card-copy"><strong></strong><span></span></span>${icon('right')}`;
    button.querySelector('strong')!.textContent = entry.file.name;
    button.querySelector('.document-card-copy > span')!.textContent = `${entry.pages} pages · ${size(entry.file.size)} · Page ${entry.page}`;
    button.addEventListener('click', () => void open(entry.file, entry));
    return button;
  }));
}

// Keep the complete reader above Home while it moves, without changing either layout.
function stageReaderTransition(reader:HTMLElement,frame:DOMRect){
  reader.style.setProperty('--transition-left',`${frame.left}px`);
  reader.style.setProperty('--transition-top',`${frame.top}px`);
  reader.style.setProperty('--transition-width',`${frame.width}px`);
  reader.classList.add('reader-transition');reader.inert=true;
}
function finishReaderTransition(reader:HTMLElement){
  reader.classList.remove('reader-transition');
  for(const name of ['--transition-left','--transition-top','--transition-width'])reader.style.removeProperty(name);
  reader.style.visibility='';reader.style.transform='';
}

async function open(file: File, existing?: DocumentEntry, savedId?:string, savedPage=1, restored?:ReturnType<typeof readerController.snapshot>) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') return showError('Please choose a PDF document.');
  if (file.size > 100 * 1024 * 1024) return showError('This prototype supports PDFs up to 100 MB. Please choose a smaller file.');
  const version = ++documentVersion;
  loading(true);
  el('error').hidden = true;
  try {
    const nextPdf = await openPdf(file);
    if (version !== documentVersion) { await nextPdf.destroy(); return; }
    await readerController.close();
    if (version !== documentVersion) { await nextPdf.destroy(); return; }
    const oldPdf = pdf;
    pdf = nextPdf;
    if (oldPdf) await oldPdf.destroy();
    active = existing ?? { id: Date.now(), file, page: 1, pages: pdf.numPages };
    if (!existing) library.unshift(active);
    if(savedId)active.page=savedPage;
    let progress=0;
    try{const record=await rememberPdf(file,savedId||existing?.historyId);active.historyId=record.id;progress=record.progress;active.page=record.page;}
    catch(error){showError('PDF opened, but browser storage could not save it to history.');console.warn(error);}
    if(version!==documentVersion)return;
    active.page = Math.min(active.page, pdf.numPages);
    el('home').dispatchEvent(new Event('home:reset'));
    const home=el('home');home.hidden=false;home.inert=true;
    onHome = false;
    const reader=el('reader');
    reader.inert = true;
    stageReaderTransition(reader,home.getBoundingClientRect());
    reader.style.visibility='hidden';
    await readerController.show(pdf,active.historyId,active.page,progress,false);
    if(version!==documentVersion)return;
    if(restored)await readerController.restore(restored);
    loading(false);
    if(!restored)await homeController.transition(reader);
    if(version!==documentVersion)return;
    home.hidden=true;home.inert=false;
    finishReaderTransition(reader);reader.inert = false;
    document.dispatchEvent(new Event('reader:page-rendered'));
    loading(false);
    el('back-home').focus();
  } catch (error) {
    if (version !== documentVersion) return;
    const failedReader=el('reader');failedReader.hidden=true;finishReaderTransition(failedReader);
    el('home').hidden=false;el('home').inert=false;onHome=true;
    loading(false);
    const name = (error as Error).name;
    showError(name === 'PasswordException' ? 'This PDF needs a password. Please open an unlocked copy for this prototype.' : 'This file could not be opened. Please try a valid PDF.');
  }
}

const homeController = mountHome(input, file => open(file));
mountHistory(el('home'),(file,id,page)=>open(file,library.find(e=>e.historyId===id),id,page));
window.addEventListener('history:deleted',event=>{const id=(event as CustomEvent<string>).detail;for(let i=library.length-1;i>=0;i--)if(library[i].historyId===id)library.splice(i,1);updateLibrary();});
input.addEventListener('change', () => { const file = input.files?.[0]; input.value = ''; if (file) void (onHome ? homeController.accept(file) : open(file)); });
let returningHome=false;
async function returnHome(){
  if(returningHome)return;
  returningHome=true;
  try{
  const version=++documentVersion;
  onHome=true;loading(false);
  const reader=el('reader');
  if(!reader.hidden){
    reader.inert = true;
    stageReaderTransition(reader,reader.getBoundingClientRect());
    el('home').hidden=false;el('home').inert=true;
    await homeController.transition(reader,true);
    if(version!==documentVersion)return;
    await readerController.close();
    if(version!==documentVersion)return;

  }
  el('home').dispatchEvent(new Event('home:reset'));
  reader.hidden=true;finishReaderTransition(reader);el('home').hidden=false;el('home').inert=false;
  updateLibrary();
  }finally{returningHome=false;}
}
const readerClose=el<HTMLButtonElement>('reader-close'),closeImage=readerClose.querySelector('img')!;
readerClose.hidden=true;readerClose.style.display='none';
readerClose.addEventListener('click',async()=>{if(readerClose.disabled)return;readerClose.disabled=true;try{await pressCross(closeImage,'#151410',.65);await returnHome();el('choose-file').focus();}finally{readerClose.disabled=false;}});
el('back-home').addEventListener('click',()=>{if(!returningHome)playSound('bubble');void returnHome().then(()=>el('choose-file').focus());});
document.querySelector<HTMLAnchorElement>('.home-wordmark')!.addEventListener('click',event=>{
  event.preventDefault();if(!returningHome)playSound('bubble');returnHome();
});
el('dismiss-error').addEventListener('click', () => { el('error').hidden = true; });
// Prevent the browser navigating away when files are dropped outside the upload area.
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
// Selection is kept native. Future squishy effects subscribe without owning PDF loading.
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (onHome || !selection?.rangeCount || !stage.contains(selection.anchorNode)) return;
  const range = selection.getRangeAt(0);
  document.dispatchEvent(new CustomEvent('reader:selection-changed', { detail: { text: selection.toString(), rects: Array.from(range.getClientRects()).map(r => ({ x:r.x, y:r.y, width:r.width, height:r.height })) } }));
});

// Interaction layer is isolated from PDF loading and navigation.
import { startLab } from './interactions/lab';
void startLab();


import {mountCatch} from './pages/catch/controller';
mountCatch();

// Dedicated local prototype entry, using the same reader/import pipeline.
import {prototypePaper} from './config/prototype';
// Reload restores the visible document and its column positions from this tab.
const viewKey='reading-machine-visible-window-v1';
window.addEventListener('pagehide',()=>{
 const home=el('home'),reader=el('reader');
 try{sessionStorage.setItem(viewKey,JSON.stringify({window:!reader.hidden?(reader.classList.contains('highlights-open')?'highlights':'reader'):home.classList.contains('history-open')?'history':home.classList.contains('about-open')?'about':'home',id:active?.historyId,reader:readerController.snapshot()}));}catch{}
});
async function restoreWindow(){
 const reload=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='reload';
 let saved:{window:string;id?:string;reader?:ReturnType<typeof readerController.snapshot>}|undefined;
 try{if(reload)saved=JSON.parse(sessionStorage.getItem(viewKey)??'null')??undefined;}catch{}
 if(saved){
  if(saved.window==='reader'||saved.window==='highlights'){
   if(!saved.id)throw new Error('No saved document to restore');
   const entry=await getHistory(saved.id);if(!entry)throw new Error('Saved document unavailable');
   // Keep the home screen out of the loading frame during a reader refresh.
   el('home').style.visibility='hidden';
   try{
    await open(entry.file,undefined,entry.id,entry.page,saved.reader??{panes:[],rotated:[]});
    if(saved.window==='highlights')el<HTMLButtonElement>('highlights-toggle').click();
   }finally{el('home').style.visibility='';}
   return;
  }else if(saved.window==='history')document.querySelector<HTMLButtonElement>('.history-toggle')?.click();
  else if(saved.window==='about')document.querySelector<HTMLButtonElement>('.about-toggle')?.click();
  return;
 }
 if(!reload&&new URLSearchParams(location.search).get('prototype')==='draft-1'){
  const response=await fetch(prototypePaper.url);if(!response.ok)throw new Error('Prototype PDF unavailable');
  await open(new File([await response.blob()],prototypePaper.name,{type:'application/pdf'}));
 }
}
void restoreWindow().catch(()=>showError('Could not restore this window. Please open the PDF from Reading History.'));

syncSidebarSpacing();

mountFingerCursor();
