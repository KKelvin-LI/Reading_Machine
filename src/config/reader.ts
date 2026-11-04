import {colourCycle} from './palette';
/** Reading window controls. Progress records the furthest scroll position. */
export const readerSettings = {
  slideSeconds: 0.8,
  // Four quarters; the fifth colour belongs to the final checkpoint.
  colours:colourCycle,
  checkpoints: [25, 50, 75, 100],
  tools: ['Sketch Pad', 'Paced Reading', 'Checker', 'Connections'],
  toolThresholds: [0, 25, 50, 75],
  saveDelayMs: 400,
};
