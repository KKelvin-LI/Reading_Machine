/** Quadrants match the artwork: NW Highlight, NE Comment, SE Copy, SW Ask AI. */
export function dragDirection(dx:number,dy:number,minimum:number){
  if(Math.hypot(dx,dy)<minimum)return -1;
  return dy<0?(dx<0?0:1):(dx<0?3:2);
}
