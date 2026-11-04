# The Reading Machine

An interactive reading prototype featuring Eaty, highlighting and comments, reading tools, saved reading history, and a finishing animation.

## Try the website

**Live website:** [https://kkelvin-li.github.io/Reading_Machine/](https://kkelvin-li.github.io/Reading_Machine/)

This prototype is designed specifically for **Draft 1.pdf**. Please use the supplied PDF; other documents are not supported reliably by the current section layout.

1. [Download Draft 1.pdf](https://kkelvin-li.github.io/Reading_Machine/prototype/draft-1.pdf). If your browser opens the PDF, use its download/save button.
2. Open [The Reading Machine](https://kkelvin-li.github.io/Reading_Machine/).
3. Click Eaty to choose the downloaded PDF, or drag the PDF onto Eaty.
4. Read through the sections to unlock the tools. At 100%, Eaty plays the finishing animation and the circular replay button becomes available.

**PDF location in this repository:** [`public/prototype/draft-1.pdf`](public/prototype/draft-1.pdf)

[Alternative direct PDF download](https://github.com/KKelvin-LI/Reading_Machine/raw/refs/heads/main/public/prototype/draft-1.pdf)

Use a desktop browser with WebGL enabled for the full mouse and 3D interactions. Reading history and annotations are stored locally in that browser, not synced between devices.

## Run locally

Requires Node.js 24 and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL shown by Vite (normally http://127.0.0.1:5191/).

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
- `public/prototype/draft-1.pdf` — supported demonstration PDF
- `GUIDE.md` — development guide

The large alphabet model is stored losslessly in `model-assets/` parts. Installation and production builds automatically reassemble it and verify its SHA-256 checksum.
