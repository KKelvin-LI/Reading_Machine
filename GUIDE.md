# Rendering update — 14 October 2026

The trial now preserves exported GLB PBR materials and normal maps. Surface normals for the round squishy, anchor and red block were baked at 1024×1024 from the saved Blender materials. Non-morph bevel modifiers are included in the export. Original .blend is unchanged.

Frame V1 is removed from the website, loader and production assets. Recoverable retired exports live outside public in retired-assets/.

Selection uses the actual anchor mesh and morph target. Raised letters are disabled by default and remain explicitly experimental: the substitute font effect still needs redesign. The original PDF font remains readable by default.

Web lighting uses a studio reflection environment and ACES tone mapping. This preserves exported surface detail, but is not an exact Cycles render: Blender subsurface/procedural shading beyond baked normals and lighting can differ. The transparent ticket text layer is currently intended for dark text on white pages.

## Current file map

- `src/interactions/models.ts`: GLB loading; preserves exported materials, normal maps, clearcoat and geometry.
- `src/interactions/lab.ts`: Studio lighting, controls, actual-mesh selection and ticket row behaviour.
- `src/interactions/settings.ts`: Editable interaction defaults.
- `src/interactions/highlight.ts`: Text-line rectangle grouping only; no flat substitute mesh.
- `src/interactions/lab.css`: Toolbar and overlay styling.
- `public/models/`: Four active GLB models.
- `texture-export-log.txt`: Texture baking outcome.

## Running and editing

Open this folder in VS Code. Double-click START-LOCAL.command and browse http://127.0.0.1:5190/. Save code with Cmd+S; refresh the browser. If a change is not picked up, stop and restart the launcher. Tune sliders are session-only; save preferred values in settings.ts.

## Jump to specific code

In VS Code press Cmd+P, enter the file path, then Ctrl+G and the line below. Search the identifier if line numbers change.

| Change | File | Line / search |
|---|---|---|
| Sizes, opacity and spring defaults | src/interactions/settings.ts | 2: `export const settings` |
| GLB material loading | src/interactions/models.ts | 5: `export async function loadModel` |
| Live stretch transparency | src/interactions/models.ts | 32: `m.onBeforeCompile` |
| Lighting and colour management | src/interactions/lab.ts | 26: `renderer.outputColorSpace` |
| Button mapping | src/interactions/lab.ts | 59: `const controls:` |
| Ticket row capture | src/interactions/lab.ts | 81: `function selectRow` |
| Actual mesh highlights | src/interactions/lab.ts | 97: `function rebuildSelection` |
| Experimental raised type | src/interactions/lab.ts | 118: `function raiseLetters` |
| Ticket dimensions and movement | src/interactions/lab.ts | 154: `const pull=rowSpring` |

## Safe editing workflow

1. Change one setting at a time and press Cmd+S.
2. Refresh/reopen the sample and test click, drag, release, clear and page navigation.
3. `cursorSize` uses CSS pixels. `pressDepth` scales the Blender press target. `highlightOpacity` and `shoulderOpacity` range from 0 to 1. Higher `springStiffness` recovers faster; higher `springDamping` reduces bounce.
4. `cursorColor`, `redColor`, `foamRoughness`, `waistRatio` and `irregularity` are legacy settings: model colour, roughness and silhouette now come from the GLB. Edit these in Blender and re-export instead of overriding them in code.
5. Keep exported filenames and shape-key names unchanged when replacing models. Use packed tangent normal maps for procedural bump; retain morph targets during export. The GLB files are binary assets, not text files to edit in VS Code.
6. Run `npm run build` before publishing. This task made local changes only.

Current limits: the browser uses a different renderer and studio lighting from Blender. Baked normals preserve rest-state surface detail, not dynamic procedural subsurface shading. Normal maps deform with the mesh. Raised letters use a substitute font and stay off by default. Ruler text compositing assumes dark text on white paper. Scanned PDFs require OCR before text selection works.

## Selection correction

The native text Range now drives a single squishy highlight per selected line, both during dragging and after release. The free-floating anchor overlay was removed. highlight.ts reads only selected PDF text nodes, excluding container/sentinel rectangles. Native selection paint is transparent while squishy mode is enabled; copying selected text still works. The round cursor is hidden during an active selection drag.

Checked forward multiline drag, reverse single-line drag, and Clear selection in the local browser. Vite polling is enabled to pick up edits reliably on this machine.
