import assert from 'node:assert/strict';
import {paneLayout} from '../src/pages/reader/pane-layout.ts';

// Closing comparison panes must fill the whole reader, even with saved rotation.
for(const comparison of [[1,4],[1,4,6]]){
 const rotated=new Set(comparison);
 assert.ok(paneLayout(comparison,rotated).rows>1);
 for(const remaining of comparison){
  assert.deepEqual(paneLayout([remaining],rotated),{
   columns:1,rows:1,areas:['1 / 1 / 2 / 2'],
  },'A remaining pane must occupy the full reading area.');
 }
}

// Every supported comparison orientation fills its grid without gaps or overlap.
for(const ids of [[4],[1,4],[1,4,6]]){
 for(let mask=0;mask<2**ids.length;mask++){
  const rotated=new Set(ids.filter((_,i)=>mask&(1<<i)));
  const {columns,rows,areas}=paneLayout(ids,rotated);
  const cells=Array.from({length:rows},()=>Array(columns).fill(0));
  for(const area of areas){
   const [top,left,bottom,right]=area.split('/').map(Number);
   assert.ok(top>=1&&left>=1&&bottom<=rows+1&&right<=columns+1);
   for(let row=top-1;row<bottom-1;row++)for(let col=left-1;col<right-1;col++)cells[row][col]++;
  }
  assert.ok(cells.flat().every(count=>count===1),'Each reading-area cell must belong to exactly one pane.');
 }
}
console.log('PASS: single panes fill the reader after horizontal comparison; all comparison layouts have full coverage.');
