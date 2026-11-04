// WebKit versions without ReadableStream async iteration need this for PDF.js.
if(typeof ReadableStream!=='undefined'&&!(Symbol.asyncIterator in ReadableStream.prototype)){
 Object.defineProperty(ReadableStream.prototype,Symbol.asyncIterator,{configurable:true,writable:true,value:async function* (this:ReadableStream<unknown>){
  const reader=this.getReader();let complete=false;
  try{while(true){const item=await reader.read();if(item.done){complete=true;return;}yield item.value;}}
  finally{try{if(!complete)await reader.cancel();}finally{reader.releaseLock();}}
 }});
}
