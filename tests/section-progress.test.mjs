import assert from 'node:assert/strict';
import {draftSections} from '../src/pages/sections/draft-sections.ts';
import {sectionProgressPlan} from '../src/pages/reader/section-progress.ts';

function withWeights(weights){
 let page=1;
 return weights.map((weight,i)=>{
  const start=page;
  page+=weight;
  return {index:i,title:'Section '+i,page:start,position:0,endPage:page-1};
 });
}

// All fourteen sections contribute a track. The quarterly unlocks are
// attached to the nearest actual section endings.
const equal=sectionProgressPlan(withWeights(Array(14).fill(1)),14);
assert.deepEqual(equal.weights,Array(14).fill(1));
assert.equal(equal.total,14);
assert.equal(equal.ends.at(-1),100);
for(const [i,section] of equal.checkpoints.entries()){
 assert.ok(Math.abs(equal.ends[section]-25*(i+1))<=50/14+1e-8);
}

// A long section may cross multiple quartiles. The three tools must still
// unlock in sequence, with the final section reserved for the finishing reward.
const long=sectionProgressPlan(withWeights([1,1,1,87,1,1,1,1,1,1,1,1,1,1]),100);
assert.equal(long.total,100);
assert.equal(long.ends[3],90);
assert.equal(new Set(long.checkpoints).size,3);
assert.ok(long.checkpoints.every((n,i)=>n<13 && (!i||n>long.checkpoints[i-1])));

// A two-page spread contributes the area of its actual printed pages.
const halves=sectionProgressPlan([
 {index:1,page:1,position:0,regions:{1:[{left:0,right:.5,start:0,end:1}]}},
 {index:2,page:1,position:0,regions:{1:[{left:.5,right:1,start:0,end:1}],2:[{left:0,right:1,start:0,end:1}]}},
],2);
assert.deepEqual(halves.weights,[.5,1.5]);
assert.deepEqual(halves.ends,[25,100]);
assert.equal(sectionProgressPlan(draftSections(),18).ends.at(-1),100);
assert.deepEqual(sectionProgressPlan(withWeights([1]),1).checkpoints,[0,0,0]);
