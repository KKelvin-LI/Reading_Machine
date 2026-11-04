import assert from 'node:assert/strict';
import {draftSections} from '../src/pages/sections/draft-sections.ts';
const sections=draftSections();
assert.deepEqual(sections.map(s=>s.title),['Abstract','Introduction','Theories of Habit Loop','Methodology','Initial Idealisation','Precedent Review','Experiments']);
assert.equal(sections.at(-1).endPage,18);
for(const s of sections)for(const page of Object.keys(s.regions))assert.ok(Number(page)<=18);
// Every column interval after Abstract belongs to exactly one section, with no overlap.
for(let page=1;page<=18;page++)for(let col=0;col<2;col++){
 const spans=sections.flatMap(s=>(s.regions[page]??[]).filter(r=>r.left===col/2)).sort((a,b)=>a.start-b.start);
 assert.ok(spans.length);
 assert.equal(spans[0].start,page===1?.219:0);
 for(let i=1;i<spans.length;i++)assert.equal(spans[i-1].end,spans[i].start);
 assert.equal(spans.at(-1).end,1);
}
console.log('Seven sections: continuous column coverage, no overlap, no appendices');
