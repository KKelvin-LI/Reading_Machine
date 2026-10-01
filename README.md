# Reading Machine

A small, browser-only PDF reader for interaction experiments. Built with **TypeScript, Vite and Mozilla PDF.js**, without a UI framework or backend. PDFs are read locally; no document upload or external font/CDN request is needed.

## Run locally

Install Node.js 24 LTS and pnpm 11, then run in this folder:

```sh
pnpm install
pnpm dev
```

Open the local address printed in the terminal. To check a production build:

```sh
pnpm build
pnpm preview
```

Do not double-click `index.html`: PDF workers and ES modules need an HTTP server.

## GitHub Pages

1. Create a repository and put **the contents of this folder** at its root, including `.github`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`. Do not include `node_modules` or `dist`.
2. Use a `main` branch, or change the branch in `.github/workflows/deploy.yml`.
3. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.
4. Push to `main`. The included workflow builds and deploys the site. The published URL appears in the workflow and Pages settings.

The relative Vite base supports both a repository URL (`username.github.io/reading-machine/`) and a custom domain. There are no server routes or secrets to configure. Source repository: https://github.com/KKelvin-LI/Reading_Machine. Enable GitHub Pages with GitHub Actions to publish the website.

## What's included

- Drag and drop a PDF or choose it from your device; it opens directly in the reader.
- Page navigation, direct page entry, fit width/page, zoom, clockwise rotation and original-file download.
- Native text selection and copying when the PDF contains text.
- In-session document cards; return home and click a card to resume its last page.
- Responsive interface, keyboard focus, arrow-key page navigation, and reduced-motion support.
- Local PDF fonts, CMaps and image decoders copied at installation/build time.

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

Start visual refinements in the token stylesheet. PDF page typography is authored in the PDF; changing the UI font does not reflow or restyle the document.

## Future Three.js integration

Add an independent interaction module rather than putting 3D rendering inside `pdf.ts`.

The app emits:

- `reader:page-rendered`: `{ page, scale, element }`, after the canvas and text layer are ready. Attach/reposition the 3D overlay here.
- `reader:selection-changed`: `{ text, rects }`. Rectangles use viewport pixels; convert them to the overlay's coordinates. An empty `text` means selection has collapsed. A future module should also handle scrolling, deselection outside the page and returning home.

The text layer must stay interactive. A decorative canvas should use `pointer-events: none` until specific pointer interactions are implemented. Native text selection is temporary, not a saved annotation. No Three.js model, squishy effect, reading ruler or persistent highlight is included yet.

## Current prototype limits

- One rendered page at a time; continuous scrolling, search, annotation editing, form widgets and PDF link handling are not implemented.
- Files and reading positions remain only for the current tab session; refreshing clears them.
- Password-protected PDFs show a clear unsupported message; use an unlocked copy.
- Scanned image PDFs display, but need OCR before they have selectable text. OCR is not included.
- A 100 MB input limit and bounded canvas resolution keep the prototype manageable. Unusual or very complex PDFs may still render slowly.
- Requires a modern browser supported by PDF.js. The app is a prototype, not a fully accessible alternative format for every PDF.

## Dependencies

PDF.js is Apache-2.0 licensed. Its bundled fonts/decoders retain their own notices. Dependency licenses and notices remain with their distributions. `public/pdfjs` is generated and ignored by Git; `pnpm install` and `pnpm build` restore it.
