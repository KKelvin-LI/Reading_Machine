## Where to refine things

| File | Responsibility |
| --- | --- |
| `src/styles/tokens.css` | Colours, UI font, radii and shadows |
| `src/styles/app.css` | Home/reader layouts and control styling |
| `src/main.ts` | UI markup, document state and user actions |
| `src/lib/pdf.ts` | PDF loading, canvas rendering and selectable text layer |
| `src/lib/icons.ts` | Small interface icons |
| `vite.config.ts` | Build configuration and hosting base |
| `.github/workflows/deploy.yml` | GitHub Pages deployment |

- Reading Machine Website Url 
- `reader:page-rendered`: `{ page, scale, element }`, after the canvas and text layer are ready. Attach/reposition the 3D overlay here.
- `reader:selection-changed`: `{ text, rects }`. Rectangles use viewport pixels; convert them to the overlay's coordinates. An empty `text` means selection has collapsed. A future module should also handle scrolling, deselection outside the page and returning home.

The text layer must stay interactive. A decorative canvas should use `pointer-events: none` until specific pointer interactions are implemented. Native text selection is temporary, not a saved annotation. No Three.js model, squishy effect, reading ruler or persistent highlight is included yet.
