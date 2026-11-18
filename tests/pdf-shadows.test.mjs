import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

test('Function Manual screenshots keep their feathered shadow without SVG canvas filters', async () => {
  const file = new URL('../public/prototype/final-draft-2.pdf', import.meta.url);
  const data = new Uint8Array(await readFile(file));
  // PDF.js uses a filter factory without SVG support in Node.
  const pdf = await getDocument({ data, verbosity: 0 }).promise;
  try {
    const page = await pdf.getPage(28);
    const viewport = page.getViewport({ scale: 96 / 72 });
    const target = pdf.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    try {
      await page.render({ canvas: target.canvas, viewport }).promise;
      // Sample down from the bottom edge of the Home Page illustration to bare paper.
      const pixels = target.context.getImageData(130, 252, 1, 10).data;
      const shades = pixels.filter((_, index) => index % 4 === 0);
      assert.ok(shades[0] > 185 && shades[0] < 230);
      assert.ok(shades.at(-1) >= 252);
      assert.ok(new Set(shades).size >= 7);
      assert.ok(shades.every((shade, index) => index === 0 || shade >= shades[index - 1]));
    } finally {
      pdf.canvasFactory.destroy(target);
    }
  } finally {
    await pdf.destroy();
  }
});
