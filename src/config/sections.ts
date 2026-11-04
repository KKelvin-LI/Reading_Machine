import {colourCycle,textColourCycle} from './palette';
/** Section navigation: widths are relative columns within the reading panel. */
export const sectionSettings={
 transitionMs:600,
 columns:[2,2,4],
 colours:colourCycle,
 // Text uses the next colour in the shared cycle.
 textColours:textColourCycle,
};
