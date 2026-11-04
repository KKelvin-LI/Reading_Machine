export const selectionMenuSettings={
  holdMs:350, // Hold before the drag can open the wheel.
  dragDistanceEm:5, // Required distance in reader-font em units.
  pressSeconds:.65,
  diameter:320,
  actions:[
    {id:'highlight',label:'Highlight',colour:'#bae4ee',textColour:'#f7c9de',angle:Math.PI},
    {id:'comment',label:'Comment',colour:'#fcf068',textColour:'#bda7d0',angle:Math.PI*1.5},
    {id:'distracted',label:'Distracted',colour:'#69bf64',textColour:'#e7484d',angle:0},
    {id:'ask',label:'Ask AI',colour:'#f89823',textColour:'#326eb3',angle:Math.PI*.5},
  ],
};
