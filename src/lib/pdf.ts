import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;
const assetRoot = new URL(`${import.meta.env.BASE_URL}pdfjs/`, document.baseURI).href;

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${assetRoot}cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${assetRoot}standard_fonts/`,
    wasmUrl: `${assetRoot}wasm/`,
  });
  try { return await task.promise; }
  catch (error) { await task.destroy(); throw error; }
}

/** Detached rendering prevents stale page/zoom requests from replacing a newer view. */
export async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, scale: number, rotation: number) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-page';
  wrapper.style.width = `${viewport.width}px`;
  wrapper.style.height = `${viewport.height}px`;
  wrapper.style.setProperty('--scale-factor', String(scale));
  wrapper.style.setProperty('--total-scale-factor', String(scale));
  wrapper.style.setProperty('--user-unit', String(page.userUnit));
  const canvas = document.createElement('canvas');
  // Bound GPU memory for oversized PDF pages, while remaining crisp on Retina displays.
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12_000_000 / (viewport.width * viewport.height)));
  canvas.width = Math.ceil(viewport.width * pixelRatio);
  canvas.height = Math.ceil(viewport.height * pixelRatio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  canvas.setAttribute('aria-label', `PDF page ${pageNumber}`);
  wrapper.append(canvas);
  await page.render({ canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] }).promise;
  const text = document.createElement('div');
  text.className = 'textLayer';
  wrapper.append(text);
  await new TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport }).render();
  return wrapper;
}
