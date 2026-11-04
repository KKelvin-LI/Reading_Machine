/** Grid positions for the reader's portrait/landscape comparison arrangements. */
export function paneLayout(ids:number[],rotated:Set<number>){
 const on=ids.map(id=>rotated.has(id)),n=ids.length;
 let columns=n,rows=1,areas=ids.map((_,i)=>`1 / ${i+1} / 2 / ${i+2}`);
 if(n===1&&on[0]){columns=1;rows=2;areas=['1 / 1 / 2 / 2'];}
 if(n===2&&on.some(Boolean)){columns=1;rows=2;areas=['1 / 1 / 2 / 2','2 / 1 / 3 / 2'];}
 if(n===3){
  const count=on.filter(Boolean).length;
  if(count===3||(count===1&&on[1])){columns=1;rows=3;areas=ids.map((_,i)=>`${i+1} / 1 / ${i+2} / 2`);}
  else if(count===1){columns=2;rows=2;areas=on[0]?['1 / 1 / 2 / 3','2 / 1 / 3 / 2','2 / 2 / 3 / 3']:['1 / 1 / 2 / 2','1 / 2 / 2 / 3','2 / 1 / 3 / 3'];}
  else if(count===2){columns=2;rows=2;const upright=on.indexOf(false);const side=upright===2?2:1;let row=1;areas=ids.map((_,i)=>i===upright?`1 / ${side} / 3 / ${side+1}`:`${row} / ${3-side} / ${++row} / ${4-side}`);}
 }
 return {columns,rows,areas};
}
