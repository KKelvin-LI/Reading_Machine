export type CommentEntry={id:string;documentId:string;text:string;body:string;createdAt:number;rects:{page:number;x:number;y:number;w:number;h:number}[];x?:number;y?:number;width:number;height:number;open:boolean};
const database=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('reading-machine-comments',1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('comments',{keyPath:'id'});s.createIndex('documentId','documentId');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function run<T>(mode:IDBTransactionMode,action:(s:IDBObjectStore)=>IDBRequest<T>){const db=await database;return new Promise<T>((resolve,reject)=>{const tx=db.transaction('comments',mode),r=action(tx.objectStore('comments'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export const listComments=(id:string)=>run<CommentEntry[]>('readonly',s=>s.index('documentId').getAll(id));
export const putComment=(e:CommentEntry)=>run('readwrite',s=>s.put(e));
export const removeComment=(id:string)=>run('readwrite',s=>s.delete(id));
