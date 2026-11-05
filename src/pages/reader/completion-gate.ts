/** A full document remains pending while the reader is hidden or transitioning. */
export class CompletionGate {
 private attempted=new Set<string>();
 private retryAfter=new Map<string,number>();
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>){}
 check(id:string|null|undefined,complete:boolean,available:boolean,start:(finished:(success:boolean)=>void)=>boolean,freshUnlock=false){
  if(!id||!complete||!available||this.attempted.has(id)||(this.retryAfter.get(id)??0)>Date.now())return;
  // v1 recorded dispatch attempts, not successful animations, so it cannot prove playback.
  const key=`reading-machine-celebrated-v2:${id}`;
  try{if(!freshUnlock&&this.storage.getItem(key)==='1')return;}catch{}
  this.attempted.add(id);
  const accepted=start(success=>{if(success){try{this.storage.setItem(key,'1');}catch{}}else {this.attempted.delete(id);this.retryAfter.set(id,Date.now()+3000);}});
  if(!accepted)this.attempted.delete(id);
 }
}
