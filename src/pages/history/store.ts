import {listHighlights,deleteHighlight} from '../highlights/store';
import {listComments,removeComment} from '../comments/store';
export type HistoryEntry={id:string;name:string;openedAt:number;progress:number;page:number;file:File};
export type HistorySummary=Omit<HistoryEntry,'file'>;
const database=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('reading-machine-history',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('pdfs',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
async function transaction<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await database;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('pdfs',mode),request=run(tx.objectStore('pdfs'));
    tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('History storage unavailable'));
  });
}
const changed=()=>window.dispatchEvent(new Event('history:changed'));
export async function listHistory():Promise<HistorySummary[]>{
  const entries=await transaction<HistoryEntry[]>('readonly',s=>s.getAll());
  return entries.map(({file,...entry})=>entry).sort((a,b)=>b.openedAt-a.openedAt);
}
export const getHistory=(id:string)=>transaction<HistoryEntry|undefined>('readonly',s=>s.get(id));
export async function rememberPdf(file:File,knownId?:string){
  const id=knownId||Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const previous=await getHistory(id);
  const entry:HistoryEntry={id,file,name:file.name,openedAt:Date.now(),progress:previous?.progress??0,page:previous?.page??1};
  await transaction('readwrite',s=>s.put(entry));changed();return entry;
}
export async function removeHistory(id:string){
  const [highlights,comments]=await Promise.all([listHighlights(id),listComments(id)]);
  await Promise.all([...highlights.map(entry=>deleteHighlight(entry.id)),...comments.map(entry=>removeComment(entry.id))]);
  await transaction('readwrite',s=>s.delete(id));
  window.dispatchEvent(new CustomEvent('history:deleted',{detail:id}));
  localStorage.removeItem(`reading-machine-sequential-v1:${id}`);
  changed();
}
// Future tracker calls this API; percentage remains 0 until a tracker supplies it.
export async function updateHistoryProgress(id:string,percentage:number){
  if(!Number.isFinite(percentage))return;
  const entry=await getHistory(id);if(!entry)return;
  entry.progress=Math.max(0,Math.min(100,percentage));await transaction('readwrite',s=>s.put(entry));changed();
}
export async function saveHistoryPage(id:string,page:number){const entry=await getHistory(id);if(entry){entry.page=page;await transaction('readwrite',s=>s.put(entry));}}

/** Save page and furthest progress atomically; concurrent writes cannot lose an unlock. */
export async function saveReadingState(id:string,page:number,progress:number){
  const db=await database;
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('pdfs','readwrite'),store=tx.objectStore('pdfs'),request=store.get(id);
    request.onsuccess=()=>{const entry=request.result as HistoryEntry|undefined;if(entry){entry.page=Math.max(1,page);entry.progress=Math.max(entry.progress,Math.min(100,Math.max(0,progress)));store.put(entry);}};
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });changed();
}
