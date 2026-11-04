# Home page — edit and copy/paste guide

The working integration is already installed in Reading_Machine_Test. You do not need to run Bash or paste integration code to make it work. Open http://127.0.0.1:5190/ while the development server is running. Save changes in VS Code with Cmd+S and Vite refreshes the preview. Use http://127.0.0.1:5190/?grid=1 to see your eight-column guide.

## What is connected

- The real animated mailbox GLB, retaining its baked normal and roughness textures.
- Your inflated letter geometry in two lines: CLICK OR DRAG / TO UPLOAD FILE.
- Click (or Enter/Space): starts the press animation and opens the native file chooser. Some browsers pause animation while their native file chooser is open.
- Choose a PDF or drop one directly onto the mailbox: runs Mailbox_File_Drop and waits for its finished event before opening the existing reader.
- Cancelling the file chooser leaves you at home. Unsupported files and files over 100 MB show a message.
- About, Reading History and Account are placeholders. No account or history storage is implemented.
- The PDF stays on your computer; this is not a server upload.

## Where to edit

1. Open the Reading_Machine_Test folder in VS Code.
2. In the Explorer, open the file named below for the change you want.
3. Edit a value, or select all in that file and replace it with its complete block below.
4. Save with Cmd+S; check the local browser.

Use these descriptive settings instead of fixed line numbers, which move as code changes:

| Change | File / setting |
|---|---|
| Mailbox position and size | src/styles/pages/home.css: --mailbox-left, --mailbox-top, --mailbox-width, --mailbox-height |
| Home text size | same file: --home-type-size |
| Tracking / letter spacing | same file: --home-tracking |
| Line spacing | same file: --home-leading |
| Logo, page name, navigation wording | src/pages/home/template.ts |
| Inflated label spacing and size | src/config/home.ts: letterTracking, labelWidth, labelHeight |
| Inflated label placement | same file: labelCentreY, labelFrontZ |
| Grid | src/styles/layout.css |
| Courier New Regular | src/styles/typography.css; uses local installed Courier New |
| File validation and drag/drop | src/pages/home/controller.ts |
| Lighting, clip playback and letter deformation | src/three/home-mailbox.ts |

The font sizing and spacing are estimated from the screenshot proportions, not measured from your original design file. The frame retains the requested 16:9 basis; the screenshot has a different aspect ratio, so vertical positioning is adapted. Narrow screens use a separate responsive rule at the bottom of home.css.

Only letters included in the upload label were exported for this page. Changing labelLines to new words may require exporting more glyphs. The GLB letters are not an installable font. Ordinary interface text uses Courier New.

## Complete editable files

These blocks match the installed files. Paste each whole block into its named file only; do not paste them into main.ts. The existing reader and animation wiring are already handled for you.

### src/styles/pages/home.css

```css
/* HOME — edit these values first. Percentages follow the supplied eight-column grid. */
.refined-home {
  --home-ink: #151410;
  --home-type-size: clamp(.75rem, 1.15cqw, 1.25rem);
  --home-tracking: -.035em;
  --home-leading: 1.25;
  --mailbox-left: 36%;
  --mailbox-top: 7%;
  --mailbox-width: 40%;
  --mailbox-height: 76%;
  display: block !important;
  min-height: 32rem;
  background: #fff;
  color: var(--home-ink);
  font-family: var(--font-ui);
  font-size: var(--home-type-size);
  font-weight: 400;
  line-height: var(--home-leading);
  letter-spacing: var(--home-tracking);
}
body:has(.refined-home:not([hidden])) { background: #fff; }
.home-identity { position: absolute; top: 2.4%; left: var(--grid-inset); z-index: 2; }
.home-wordmark { display: flex; align-items: center; gap: .65em; color: inherit; text-decoration: none; white-space: nowrap; }
.home-wordmark img { width: 1.15em; height: .85em; object-fit: contain; }
.home-navigation { display: grid; justify-items: start; margin-top: .7em; }
.home-navigation button { border: 0; padding: 0; background: none; font: inherit; letter-spacing: inherit; line-height: inherit; color: inherit; }
.home-account { position: absolute; top: 2.4%; right: var(--grid-inset); width: 1.15em; aspect-ratio: 1; border: 0; border-radius: 50%; background: var(--home-ink); color: white; padding: 0; font: inherit; font-size: .85em; z-index: 2; }
.home-upload { position: absolute; left: var(--mailbox-left); top: var(--mailbox-top); width: var(--mailbox-width); height: var(--mailbox-height); }
.mailbox-upload { display: block; position: relative; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; color: inherit; touch-action: manipulation; }
#mailbox-scene, #mailbox-scene canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.mailbox-upload:focus-visible { outline: .15rem dashed #326eb3; outline-offset: .5rem; border-radius: 18%; }
.mailbox-upload.dragging { filter: drop-shadow(0 0 .6rem #bae4ee); }
.mailbox-upload[aria-busy="true"] { cursor: progress; }
.mailbox-fallback { position: absolute; inset: 0; display: grid; place-content: center; }
.mailbox-fallback img { width: 100%; height: 100%; object-fit: contain; }
.mailbox-fallback > span { position: absolute; left: 25%; top: 65%; width: 50%; text-align: center; color: #fcf068; font-size: .75em; }
.mailbox-upload.model-ready .mailbox-fallback { display: none; }
.home-upload-status { position: absolute; top: 100%; width: 130%; left: -15%; text-align: center; margin: .5rem 0; font-size: .75em; }
.home-upload-status:empty { display: none; }
@media (max-width: 40rem) {
  .refined-home { --mailbox-left: 15%; --mailbox-width: 70%; --mailbox-top: 20%; --mailbox-height: 66%; min-height: 38rem; }
}
.refined-home[hidden] { display: none !important; }
```

### src/pages/home/template.ts

```typescript
export const homeTemplate = `
  <section id="home" class="home design-frame refined-home" aria-label="The Reading Machine home">
    <div class="grid-guide" aria-hidden="true">${'<i></i>'.repeat(8)}</div>
    <header class="home-identity">
      <a class="home-wordmark" href="#" aria-label="The Reading Machine home">
        <img src="${import.meta.env.BASE_URL}images/home/cloud.png" alt="" />
        <span>THE READING MACHINE</span>
      </a>
      <nav class="home-navigation" aria-label="Main navigation">
        <button type="button" data-native-control aria-disabled="true">ABOUT</button>
        <button type="button" data-native-control aria-disabled="true">READING HISTORY</button>
      </nav>
    </header>
    <button class="home-account" type="button" data-native-control aria-label="Account — coming later" aria-disabled="true">K</button>
    <main class="home-upload">
      <button id="choose-file" class="mailbox-upload" type="button" data-native-control aria-label="Click or drag to upload a PDF file" aria-describedby="home-upload-status">
        <span id="mailbox-scene" aria-hidden="true"></span>
        <span class="mailbox-fallback" aria-hidden="true"><img src="${import.meta.env.BASE_URL}images/home/mailbox-fallback.png" alt="" /><span>CLICK OR DRAG<br>TO UPLOAD FILE</span></span>
      </button>
      <p id="home-upload-status" class="home-upload-status" role="status" aria-live="polite">Loading your mailbox…</p>
    </main>
    <div id="session-library" hidden><div id="document-list"></div></div>
  </section>`;
```

### src/config/home.ts

```typescript
/** Home-page 3D controls. Layout and fonts live in styles/pages/home.css. */
export const homeSettings = {
  mailboxUrl: 'models/home/mailbox.glb',
  lettersUrl: 'models/home/upload-letters.glb',
  labelLines: ['CLICK OR DRAG', 'TO UPLOAD FILE'],
  letterColour: '#fcf068',
  letterTracking: 0.24, // Space added between the original inflated letters.
  labelWidth: 1.78,
  labelHeight: 0.36,
  labelCentreY: 0.94,
  labelFrontZ: 2.23,
  exposure: 1,
  maxFileBytes: 100 * 1024 * 1024,
};
```

## Supporting files and backups

public/models/home/mailbox.glb — original animated mailbox.
public/models/home/upload-letters.glb — reduced meshes and baked normal maps from your inflated alphabet.
public/images/home/cloud.png — transparent cloud logo.
public/images/home/mailbox-fallback.png — shown if WebGL/model loading fails.

Pre-change main.ts, home.css and lab.ts are saved under lesson-backups/home-*. The old interaction layer now skips buttons marked data-native-control, so it does not cover the mailbox or navigation with the old red button models.

If the server has stopped, use VS Code Terminal > New Terminal in this project and enter npm run dev -- --port 5190. This starts the server; editing CSS/HTML/TypeScript itself needs no terminal command. Do not use Go Live for this Vite/TypeScript app.
