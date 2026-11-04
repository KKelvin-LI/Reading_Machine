export type Question={prompt:string;options:string[];answer:number;type:'Understanding'|'Application and inference'};
// Draft 1 only: website section order, excluding the appendix. Answers are zero-based.
const rows:[string,string[],number][][]=[
[
['Why go beyond blocking distractions?',['Blocking tools make texts harder to display.','Blocking alone does not address motivation or recovering context.','Notifications are necessary for concentration.','Physical devices can replace reading interfaces.'],1],
['How do engagement and task re-entry relate?',['Engagement removes the need for re-entry.','Re-entry rewards document completion.','Both mean finding a saved page.','Engagement supports continued reading; re-entry supports recovery.'],3],
['Students still abandon difficult passages. What could help?',['Manageable goals and meaningful interactions with the material.','Longer restrictions on leaving the application.','More detailed notification-blocking records.','A larger reading-time display.'],0],
['An enjoyable demonstration supports which conclusion?',['The system improves academic achievement.','It prevents distraction across the age group.','It demonstrates a proposition that still requires testing.','Physical feedback outperforms digital feedback.'],2]
],[
['Why is academic reading a high-opportunity-cost activity?',['It requires specialist software.','It prevents studying multiple subjects.','It gives up immediate rewards for delayed benefits.','It takes place in expensive environments.'],2],
['Why is re-entry more than reopening the document?',['Readers must recover context and their intended next action.','Readers must always restart from page one.','Interruptions remove documents from the computer.','Readers must first increase their speed.'],0],
['A reader finds their page but forgets its relevance. What helps?',['An interruption timer.','Confirmation of the page number.','An unrelated progress badge.','A previous note explaining relevance and where to continue.'],3],
['A calmer student still cannot resume. What is missing?',['A replacement for the reading interface.','Cues connecting emotional support with study context.','Stronger feedback before showing text.','Nothing: calming proves re-entry succeeded.'],1]
],[
['How do history and assistance cues differ?',['History restores context; assistance identifies the next action.','History sets goals; assistance records pages.','History is physical; assistance blocks notifications.','History measures motivation; assistance measures speed.'],0],
['Why prioritise peripheral tactile interaction?',['It eliminates focused attention.','It makes every interaction more noticeable.','It supports reading with relatively low attention demands.','It automatically adapts to every user.'],2],
['A reader resumes but soon gets bored. What could help?',['Repeat position reminders more often.','Achievable goals and meaningful feedback.','Remove contextual cues.','Increase interruption signals throughout reading.'],1],
['A calming control needs several unfamiliar menus. Improve it how?',['Rearrange the menus regularly.','Use a new gesture each session.','Add choices requiring careful deliberation.','Use a familiar, accessible action in a stable context.'],3]
],[
['How do theory and making interact?',['Theory is fixed before prototyping.','Theory informs making; making prompts research and reflection.','Making replaces existing research.','Theory only describes the finished prototype.'],1],
['What does the evaluation primarily provide?',['Findings generalisable to all students.','A controlled commercial-app comparison.','Proof that every mechanism works.','Researcher-led reflection on relevance, clarity and attention.'],3],
['An animation repeatedly interrupts comprehension. What next?',['Document, reconsider, and modify or abandon it.','Keep it because it was in the initial concept.','Treat visual appeal as sufficient evidence.','Delay reflection until every feature is finished.'],0],
['How should a working interface and simulated mouse be presented?',['As equally validated components.','As ready for manufacture.','Clearly distinguish functional, simulated and speculative elements.','Conceal implementation differences.'],2]
],[
['Why combine forced association with Crazy Eights?',['To select the most popular desk product.','To test eight prototypes with participants.','To replace research constraints with fantasy.','To connect objects, haptic responses and emotions into concepts.'],3],
['Why add screen-based interactions to the Air Mouse?',['The mouse offered no sensory interaction.','The physical concept lacked sufficient re-entry and engagement support.','The project abandoned physical interactions.','Their effectiveness had already been proven.'],1],
['A transforming concept exceeds technical capacity. What next?',['Remove the research aims.','Present the mechanism as implemented.','Narrow its form while retaining relevant interaction qualities.','Add more transformations.'],2],
['How could separate physical and digital components connect?',['Map squeezing and release to on-screen deformation and recovery.','Give them the same name only.','Add more independent controls.','Increase interface complexity.'],0]
],[
['What priority emerged from the three-layer review?',['Replace familiar reading functions first.','Prioritise AI summaries over recovery.','Retain core functions and prioritise re-entry and engagement.','Treat every feature as entirely new.'],2],
['Why make paced highlighting adjustable?',['Needs vary with familiarity, complexity and reflection.','A fixed-speed highlight is technically impossible.','Slower reading is always better.','Adjustability removes the need for comprehension.'],0],
['What should follow an attention-catching interaction?',['A longer round of the game.','Previous context and an identifiable next action.','A competitive score.','An unrelated decorative animation.'],1],
['Every paragraph uses animated typography. What should change?',['Increase all movement.','Remove the layout grid.','Keep decoration but reduce text size.','Keep body text conventional; reserve effects for purposeful feedback.'],3]
],[
['What can the material comparison establish?',['Stress reduction for all students.','Situated sensory observations informing further design.','Verified chemical classifications.','Representative user preferences.'],1],
['Why is Soft PU a baseline rather than a final ideal?',['Its softness and cushioning are strong, but recovery could improve.','It has maximum resistance and recovery speed.','It needs no development for rapid repeated use.','It alone can be held with one hand.'],0],
['Sharp repeated button feedback distracts. What should change?',['Increase its intensity.','Give every action identical feedback.','Use gentler feedback for frequent controls.','Remove feedback from every control.'],2],
['A digital squishy convincingly imitates a stress ball. What follows?',['It provides the same anxiety reduction.','A doodling study proves better reading recall.','Visual competition with reading no longer needs testing.','Further exploration is justified, but equivalent benefits are unproven.'],3]
]];
export const checkerQuestions:Question[][]=rows.map(section=>section.map(([prompt,options,answer],i)=>({prompt,options,answer,type:i<2?'Understanding':'Application and inference'})));
