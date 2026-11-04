# Grid and typography foundation

This extends the existing trial. Backups are in lesson-backups/grid-foundation-*.

- src/styles/layout.css: eight columns, 1.5% gutters, 1.6% outer padding, 16:9 frame.
- src/styles/typography.css: Courier New Regular, body font size and shared typography.
- src/styles/pages/home.css: placement of the existing trial home sections.
- src/styles/tokens.css: existing palette and shared appearance settings.

Open the normal local website with ?grid=1 appended to show the yellow/green grid. Remove ?grid=1 to hide it. The guide does not intercept clicks. Eight columns remain at every screen size; content spans more columns on smaller screens.

Change --grid-gutter and --grid-inset in layout.css to tune the reference grid. Change grid-column in pages/home.css to move sections. For example, 3 / 7 spans the middle four columns; 1 / -1 spans all eight.

16:9 is the minimum design canvas proportion: content may grow vertically rather than being clipped at larger text/browser zoom. The reference screenshot itself is not 16:9, so its horizontal column proportions are preserved in the requested 16:9 frame. The grid uses percentages relative to its own frame, not the whole monitor.

Use rem for text and accessible control sizes, percentages/fr for grids, and viewport units for the frame. Do not scale all text solely with vw: that can counteract browser zoom. Existing trial styles still contain pixel sizes; these will be migrated section by section with the refined pages. PDF page sizing and embedded fonts remain controlled by the PDF renderer.
