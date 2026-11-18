# The Reading Machine

An interactive reading prototype featuring Eaty, highlighting and comments, reading tools, saved reading history, and a finishing animation.

## Try the website

[Open the published Reading Machine](https://kkelvin-li.github.io/Reading_Machine/).

Start the local server as described below, then [open the final thesis demo](http://127.0.0.1:5190/?prototype=final) in a desktop browser. You can also select **Open Demo PDF** on the home screen. To read your own file, click Eaty or drag the PDF onto Eaty.

The final thesis has 14 reading sections, numbered 0 (Abstract) through 13 (Reference). The reader identifies the numbered chapter headings in the PDF and weights each progress-bar segment by the page area its section occupies. Once unlocked, Checker offers questions for each of the fourteen sections. Reading progress begins at Abstract and reaches 100% at the end of Reference, when Eaty plays the finishing animation and the replay button becomes available.

The [bundled final thesis](public/prototype/final-draft-2.pdf) is the compressed edition. You can also upload the full-quality final PDF. The [original Draft 1 demo](http://127.0.0.1:5190/?prototype=draft-1) retains its seven sections. Other PDFs without the thesis headings open as a single document.

WebGL enables the animated 3D controls. When 3D graphics are unavailable, the reader, annotations, and game use native browser controls and 2D artwork. Reading history and annotations are saved in the current browser.

## Run locally

Requires Node.js 24 and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

On Windows, run `pnpm.cmd install --frozen-lockfile` in the project folder for the initial setup. After that, double-click `START-LOCAL.cmd` to open the site in your default browser. The local address is normally http://127.0.0.1:5190/.

```sh
pnpm build
pnpm preview
```

The build copies PDF.js fonts, character maps, and decoders into the website. GitHub Actions builds and deploys `dist/` to GitHub Pages whenever `main` is updated.

## Project files

- `src/pages/` — reader, history, highlights, comments, and completion behaviour
- `src/three/` — Eaty and rendered interaction models
- `src/styles/` — layout, palette, and typography
- `public/models/` — 3D models and rendered assets
- `public/prototype/` — final thesis and original Draft 1 demonstration PDFs
- `GUIDE.md` — development guide

The large alphabet model is stored losslessly in `model-assets/` parts. Installation and production builds automatically reassemble it and verify its SHA-256 checksum.
