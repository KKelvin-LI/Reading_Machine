/** A full document remains pending while the reader is hidden or transitioning. */
export class CompletionGate {
 private attempted=new Set<string>();
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>){}
 check(id:string|null|undefined,complete:boolean,available:boolean,start:(finished:(success:boolean)=>void)=>boolean){
  if(!id||!complete||!available||this.attempted.has(id))return;
  // v1 recorded dispatch attempts, not successful animations, so it cannot prove playback.
  const key=`reading-machine-celebrated-v2:${id}`;
  try{if(this.storage.getItem(key)==='1')return;}catch{}
  this.attempted.add(id);
  const accepted=start(success=>{if(success)try{this.storage.setItem(key,'1');}catch{}});
  if(!accepted)this.attempted.delete(id);
 }
}
