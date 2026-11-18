import {checkerQuestions, sectionQuestions, type Question} from './questions';

// The contents and printed section tags number the Abstract as H0 and Reference as H13.
export const finalCheckerQuestions:Question[][]=[
  [
    ...checkerQuestions[0].slice(0,2),
    {
      type:'Application and inference',
      prompt:'Which digital interaction carries a physical quality from the mouse into the reader?',
      options:[
        'A record of how long the reader kept a file open.',
        'A switch that silences incoming phone notifications.',
        'A button that compresses under pressure and recovers on release.',
        'A menu listing all previously opened documents.',
      ],
      answer:2,
    },
    checkerQuestions[0][3],
  ],
  ...checkerQuestions.slice(1,6),
  [
    ...checkerQuestions[6].slice(0,2),
    {
      type:'Application and inference',
      prompt:'A shortlisted colour looks appealing alone but overwhelms its neighbours. What would the palette trials suggest?',
      options:[
        'Keep it because it was an early favourite.',
        'Compare it with its neighbours and remove it if the contrast adds little.',
        'Increase the saturation of every other colour.',
        'Choose one shade and remove all the remaining accents.',
      ],
      answer:1,
    },
    {
      type:'Application and inference',
      prompt:'You are translating a stretched squishy into a text highlight. Which surface suits this use?',
      options:[
        'An opaque face like the solid-coloured buttons.',
        'Raised lettering covering the selected sentence.',
        'A reflective coating that hides the letters during a drag.',
        'A translucent surface that leaves the selected text readable.',
      ],
      answer:3,
    },
  ],
  // H7 — Function Manual, pp. 54–57.
  sectionQuestions([
    ['How does the reader start Checker for a particular section?',
      ['Double-click the section’s progress bar.','Select Checker, then click an empty space in that section.','Right-click its title in Reading History.','Activate Paced Reading on the section’s first word.'],1],
    ['What does Click to Continue do after the balloon has popped?',
      ['Replays the end-of-document celebration.','Starts a new section.','Returns to the marked reading position.','Opens every saved comment.'],2],
    ['You want to compare a figure with an explanation in an earlier section. Which tool fits?',
      ['Open the two sections side by side.','Replay the balloon animation.','Raise the words-per-minute setting.','Open the document’s reading history.'],0],
    ['You remember highlighting a sentence but cannot find its page. How can you return directly to it?',
      ['Rotate the reading box.','Click the cross beside the document.','Start Checker in the current section.','Choose the passage in Saved Highlights.'],3],
  ]),
  // H8 — Exploration, pp. 58–67.
  sectionQuestions([
    ['Why did the designer drop the experimental reading ruler?',
      ['Its shape changed in Three.js and it would not reliably align with the text.','It required the reader to upload a second document.','It used the same colour as the final frog.','Its sound duplicated the slider sound.'],0],
    ['Why did the frog become Eaty?',
      ['Its skin matched the final eight-colour palette.','It could represent how many minutes someone had read.','Its mouth and tongue linked uploading, selecting and dragging.','Its shape reproduced the form of the physical mouse.'],2],
    ['A wider squishy button distorts at both ends. Which refinement from the prototype would help?',
      ['Inflate the label until it fills the button.','Stretch only the middle and preserve the rounded ends.','Widen the ends while fixing the middle.','Move the compression animation to a different button.'],1],
    ['Small inflated letters make a control hard to read. How did the designer address this?',
      ['Repeat the label on the mouse.','Make every label thicker.','Remove all text from the control.','Use a legible button label and keep inflated lettering for large About text.'],3],
  ]),
  // H9 — Habit Loop of the Product System, pp. 68–69.
  sectionQuestions([
    ['In the proposed loop, what does touching the vibrating Air Mouse do?',
      ['Unlocks the next reading section.','Switches straight to pen mode.','Stops the vibration and starts a guided breathing rhythm.','Deletes the last distraction marker.'],2],
    ['When would the Air Mouse return to its ergonomic form?',
      ['After the breathing stage, ready for balloon popping and re-entry cues.','Before the reader signals distraction.','Only after all reading checkpoints are complete.','While the reader draws in pen mode.'],0],
    ['The reader has noticed the vibration but still feels unsettled. Which action comes next?',
      ['Skip to the next section.','Use pen mode to annotate a paragraph.','Replay the final reward.','Touch the mouse and follow its breathing rhythm.'],3],
    ['A reader has returned to the text and wants to annotate it. Which proposed mouse mode supports that?',
      ['The vibration cue.','Pen mode.','The breathing rhythm.','The balloon-popping interaction.'],1],
  ]),
  // H10 — Final Work Presentation, pp. 70–83.
  sectionQuestions([
    ['How does the proposed Air Mouse respond to a punch in the final presentation?',
      ['It locks into pen mode.','It becomes softer and more cushioning.','It opens Reading History.','It changes the reading-box orientation.'],1],
    ['What is Eaty doing in the final celebration image?',
      ['Dragging a comment into the sidebar.','Popping a balloon.','Following a guide through a sentence.','Eating the paper.'],3],
    ['Which illustrated view would help a reader check an earlier session’s date and progress?',
      ['The Reading History window.','The About page.','The Air Mouse top view.','The Sketch Pad settings.'],0],
    ['A reader wants the document to occupy the full width. Which example shows that arrangement?',
      ['The Home page with About open.','The reading page with the sidebar showing.','The reading page in hide mode.','The reading history window.'],2],
  ]),
  // H11 — Discussion, p. 84 and the continuing discussion on p. 85.
  sectionQuestions([
    ['Why did the designer pair balloon popping with a reading cue?',
      ['A pop records how well someone understood a paragraph.','The balloon replaces the need to recall previous text.','Every pop unlocks a section of the document.','The pop draws attention, while the cue helps recover context.'],3],
    ['Which part of the product system remained unbuilt?',
      ['The progress indicators.','The physical Air Mouse.','The digital section controls.','The balloon interaction.'],1],
    ['A reader clicks quickly through sections to earn rewards. What can the designer infer?',
      ['The reader has understood each argument.','The rewards have created lasting interest in the text.','The reader reached a milestone. Comprehension still needs checking.','The reader would prefer stronger feedback on every control.'],2],
    ['How could a follow-up test whether the effects last beyond a first encounter?',
      ['Compare reading with and without selected features over repeated sessions.','Ask the designer to repeat the material rankings.','Count how many rewards appear in a demonstration.','Collect first impressions immediately after one balloon pop.'],0],
  ]),
  // H12 — Conclusion, p. 85.
  sectionQuestions([
    ['What does the conclusion identify as the project’s contribution?',
      ['A proven treatment for digital distraction.','A benchmark for the fastest academic reading pace.','An exploratory design connecting sensory interaction, manageable tasks and re-entry.','A specification for manufacturing the finished mouse.'],2],
    ['Which physical qualities does the conclusion propose translating into digital behaviour?',
      ['Softness, resistance and recovery.','Weight, temperature and odour.','Brightness, sound volume and contrast.','Screen resolution, size and refresh rate.'],0],
    ['Which change best serves both aims of the concluding argument?',
      ['Lock other apps for the entire reading session.','Increase the difficulty of every checkpoint.','Show time spent on a leaderboard.','Make the next reading activity approachable and give returning readers a cue to their place.'],3],
    ['A new control convincingly conveys softness on screen. What remains to be investigated?',
      ['Whether physical qualities can be described in words.','Whether this design helps people read.','Whether the original project included precedent analysis.','Whether the control can be assigned a name.'],1],
  ]),
  // H13 — Reference, pp. 86–90.
  sectionQuestions([
    ['Which two groups organise the reference list?',
      ['Physical products and digital products.','Theory and research, then visual inspiration and image references.','Tested prototypes and discarded prototypes.','Student participants and design researchers.'],1],
    ['Which reference credits a photograph in the visual inspiration list?',
      ['Karpicke and Blunt on retrieval practice.','Rey and colleagues on segmentation.','Harkin and colleagues on monitoring goal progress.','Charles O’Rear’s Bliss.'],3],
    ['To investigate cues for resuming learning after an interruption, which listed source would you open?',
      ['Schneegass and colleagues on task resumption cues.','O’Rear’s Bliss photograph.','Andrade on doodling.','The Fun Fidgets butter squishy photograph.'],0],
    ['Which reference would help you investigate the research behind the Checker retrieval questions?',
      ['The Cambridge Dictionary entry for squishy.','Blanc and colleagues on squeezing a stress ball.','Karpicke and Blunt on retrieval practice after reading.','The Reading Machines entry for Ballast.'],2],
  ]),
];
