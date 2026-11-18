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

import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {thesisSections} from '../src/pages/sections/thesis-sections.ts';
import {sectionAt} from '../src/pages/sections/detection.ts';
import {sectionProgressPlan} from '../src/pages/reader/section-progress.ts';

const data=new Uint8Array(await readFile(new URL('../public/prototype/final-draft-2.pdf',import.meta.url)));
const pdf=await getDocument({data}).promise;
try{
  const titles=['Abstract','Introduction','Theories of Habit Loop','Methodology of Overall Project',
    'Initial Ideation','Precedent Review','Experiments','Function Manual','Exploration',
    'Habit Loop of the Product System','Final Work Presentation','Discussion','Conclusion','Reference'];
  const final=await thesisSections(pdf,()=>false);
  assert.deepEqual(final.map(s=>s.title),titles);
  assert.deepEqual(final.map(s=>s.index),titles.map((_,i)=>i));
  assert.deepEqual(final.map(s=>s.page),[4,5,6,10,11,16,21,28,30,35,36,43,43,44]);
  assert.equal(final.at(-1).endPage,46);
  const split=final[12].position;
  assert.ok(split>.54&&split<.545);
  assert.equal(sectionAt(final,43,.8,.2).title,'Discussion');
  assert.equal(sectionAt(final,43,.3,.7).title,'Discussion');
  assert.equal(sectionAt(final,43,.8,.7).title,'Conclusion');
  for(let page=4;page<=46;page++){
    for(const left of [0,.5]){
      const areas=final.flatMap(s=>(s.regions[page]??[]).filter(r=>r.left===left));
      if(page===46&&left===.5){assert.equal(areas.length,0);continue;}
      assert.equal(areas[0].start,0);
      for(let i=1;i<areas.length;i++)assert.equal(areas[i-1].end,areas[i].start);
      assert.equal(areas.at(-1).end,1);
    }
  }
  const plan=sectionProgressPlan(final,pdf.numPages);
  assert.equal(plan.weights.length,14);
  assert.equal(plan.total,42.5);
  assert.ok(plan.ends[12]<100);
  assert.equal(plan.ends[13],100);

  // The full-quality export also prints all fourteen H-tags together in its contents.
  const contents={str:titles.map((title,i)=>`<H${i}=${title}>`).join(' '),transform:[10,0,0,10,24,600],height:10};
  const fullQualityContents={numPages:pdf.numPages,getPage:async n=>{
    const page=await pdf.getPage(n);
    return n===3?{getViewport:options=>page.getViewport(options),getTextContent:async()=>({items:[contents]})}:page;
  }};
  assert.deepEqual(await thesisSections(fullQualityContents,()=>false),final);
  await assert.rejects(thesisSections(pdf,()=>true),{name:'AbortError'});
}finally{await pdf.destroy();}
console.log('Final thesis: all 14 printed sections, complete spread coverage and section-weighted progress.');
