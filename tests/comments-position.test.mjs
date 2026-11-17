import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the comment controller with measured page rectangles and pointer events.
class Rect {
 constructor(left,top,width,height){Object.assign(this,{left,top,width,height,right:left+width,bottom:top+height});}
}
class Element extends EventTarget {
 constructor(){super();this.children=[];this.dataset={};this.style={setProperty(){}};this.queries={};}
 set innerHTML(html){
  if(html.includes('textarea')){
   const header=new Element(),label=new Element(),input=new Element();
   this.queries={'header':header,'header span':label,'textarea':input};
   this.append(header,input);
  }else if(html.includes('<img'))this.queries.img=new Element();
 }
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 replaceChildren(){this.children=[];}
 querySelector(selector){return this.queries[selector]??null;}
 querySelectorAll(selector){return this.queries[selector]??[];}
 closest(){return null;}
 setAttribute(){}
 getBoundingClientRect(){return this.rect??new Rect(parseFloat(this.style.left),parseFloat(this.style.top),parseFloat(this.style.width),parseFloat(this.style.height));}
 setPointerCapture(){}
 hasPointerCapture(){return false;}
 focus(){}
}
const root=new Element(),stage=new Element(),windowEl=new Element(),slot=new Element();
root.queries={'#page-stage':stage,'.reading-window':windowEl};
windowEl.rect=new Rect(0,0,1000,800);stage.rect=new Rect(100,50,700,600);
slot.rect=new Rect(100,100,700,1000);stage.queries['.pdf-slot[data-page="1"]']=[slot];
const rects=[{page:1,x:.2,y:.2,w:.2,h:.025}];
const saved=new Map([['legacy',{id:'legacy',documentId:'doc',text:'Selected text',body:'My note',createdAt:0,rects,width:.3,height:.24,open:true}]]);
const writes=[],frames=[];
const dependencies={
 '../../ui/annotation-bounce':{annotationOrigin(){},async bounceSavedEaty(){}},
 '../../ui/eaty-actions':{eatyActions(arrow,_remove,toggle){arrow.toggle=toggle;}},
 '../../three/eaty-art':{applyEatyImage(){}},
 '../highlights/marks':{captureMarks:()=>rects,mountSavedMarks:()=>()=>{},async retractSavedMarks(){}},
 './store':{
  async listComments(){return structuredClone([...saved.values()]);},
  async putComment(entry){writes.push(structuredClone(entry));saved.set(entry.id,structuredClone(entry));},
 },
};
const module={exports:{}};
const source=ts.transpileModule(readFileSync(new URL('../src/pages/comments/controller.ts',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
vm.runInNewContext(source,{
 exports:module.exports,module,console,CustomEvent,DOMRect:Rect,crypto:{randomUUID:()=> 'new'},
 document:{createElement:()=>new Element()},
 getComputedStyle:()=>({height:'8px'}),
 ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},
 requestAnimationFrame(fn){frames.push(fn);return frames.length;},
 require(name){if(name.endsWith('.css'))return {};assert.ok(dependencies[name],`Unexpected dependency: ${name}`);return dependencies[name];},
});
const comments=module.exports.mountComments(root);
const flush=()=>{while(frames.length)frames.shift()();};
const layer=windowEl.children[0];
const boxes=()=>layer.children.filter(el=>el.className==='comment-box');
const arrows=()=>layer.children.filter(el=>el.className==='comment-arrow');
const position=box=>[box.style.left,box.style.top];
const scroll=top=>{slot.rect=new Rect(100,top,700,1000);stage.dispatchEvent(new Event('scroll'));flush();};
const pointer=(element,type,x,y)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{button:0,pointerId:1,clientX:x,clientY:y});element.dispatchEvent(event);};

await comments.setDocument('doc');flush();
const box=boxes()[0],initial=position(box),arrow=arrows()[0],arrowTop=arrow.style.top;
scroll(0);
assert.deepEqual(position(box),initial,'An undragged comment must stay still when its text scrolls.');
assert.notEqual(arrow.style.top,arrowTop,'The annotation marker must still follow its text.');
scroll(-2000);
assert.equal(box.hidden,false,'An open comment stays available when its text scrolls out of view.');
assert.equal(arrow.hidden,true);
assert.equal(writes.length,1,'Initial placement is saved once, not on every scroll.');

const header=box.querySelector('header');
pointer(header,'pointerdown',100,350);pointer(header,'pointermove',150,420);pointer(header,'pointerup',150,420);
const moved=position(box);
assert.equal(parseFloat(moved[0]),parseFloat(initial[0])+50);
assert.equal(parseFloat(moved[1]),parseFloat(initial[1])+70);
scroll(100);assert.deepEqual(position(box),moved,'Dragging establishes the new stationary position.');
arrow.toggle();assert.equal(box.hidden,true);arrow.toggle();assert.deepEqual(position(box),moved);
await comments.setDocument('doc');flush();assert.deepEqual(position(boxes()[0]),moved,'Saved positions survive reopening the document.');

await comments.save({toString:()=> 'New text'});
const fresh=boxes().at(-1),freshPosition=position(fresh);
scroll(-100);assert.deepEqual(position(fresh),freshPosition,'New comments are stationary before the first drag too.');

saved.clear();saved.set('closed',{id:'closed',documentId:'doc',text:'Text',body:'',createdAt:0,rects,width:.3,height:.24,open:false});
await comments.setDocument('doc');flush();
assert.equal(saved.get('closed').x,undefined,'Closed legacy comments wait until opened before placing.');
scroll(-2000);arrows()[0].toggle();assert.equal(saved.get('closed').x,undefined,'Offscreen text must not give an unplaced comment an arbitrary position.');
scroll(100);assert.ok(Number.isFinite(saved.get('closed').x));
const reopened=position(boxes()[0]);scroll(0);assert.deepEqual(position(boxes()[0]),reopened);
console.log('PASS: new and saved comments stay stationary on scroll, remain draggable, and retain their positions after reopening.');
