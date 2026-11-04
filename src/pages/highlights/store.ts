import type {MarkRect} from './marks';
export type SavedHighlight={id:string;documentId:string;text:string;savedAt:number;page:number;endPage:number;section:number;sectionTitle?:string;position:number;rects?:MarkRect[]};
const db=new Promise<IDBDatabase>((resolve,reject)=>{
  const r=indexedDB.open('reading-machine-highlights',1);
  r.onupgradeneeded=()=>{const store=r.result.createObjectStore('highlights',{keyPath:'id'});store.createIndex('documentId','documentId');};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});
async function run<T>(mode:IDBTransactionMode,action:(s:IDBObjectStore)=>IDBRequest<T>){
  const database=await db;return new Promise<T>((resolve,reject)=>{const tx=database.transaction('highlights',mode);const request=action(tx.objectStore('highlights'));tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export const listHighlights=(id:string)=>run<SavedHighlight[]>('readonly',s=>s.index('documentId').getAll(id));
export const saveHighlight=(entry:SavedHighlight)=>run('readwrite',s=>s.put(entry));
export const deleteHighlight=(id:string)=>run('readwrite',s=>s.delete(id));
