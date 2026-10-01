import 'pdfjs-dist/web/pdf_viewer.css';
import './styles/tokens.css';
import './styles/app.css';
import { icon } from './lib/icons';
import { openPdf, renderPage } from './lib/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <input id="file-input" type="file" accept="application/pdf,.pdf" hidden />
  <section id="home" class="home">
    <header class="home-header"><a class="brand" href="#">${icon('book')}<span>Reading Machine</span></a><span class="edition">A space for reading</span></header>
    <main class="home-main">
      <div class="intro"><span class="eyebrow">YOUR READING SPACE</span><h1>A little room to read.</h1><p>Open a document. Settle into the page.</p></div>
      <div id="drop-zone" class="drop-zone">
        <div class="upload-symbol">${icon('upload')}</div>
        <h2>Drop your PDF here</h2><p>or choose a file from your device</p>
        <button class="button primary" id="choose-file">${icon('plus')}<span>Open a PDF</span></button>
        <span class="file-hint">PDF documents · up to 100 MB</span>
      </div>
      <div id="session-library" class="session-library" hidden><div class="section-label"><h2>Open in this session</h2><span>Click to continue reading</span></div><div id="document-list"></div></div>
      <p class="privacy">${icon('shield')}Your documents stay on your device.</p>
    </main>
    <footer class="home-footer"><span>Reading Machine</span><span>One page at a time.</span></footer>
  </section>
  <section id="reader" class="reader" hidden aria-label="PDF reader">
    <header class="reader-header">
      <button id="back-home" class="icon-button" title="Back to home" aria-label="Back to home">${icon('left')}</button>
      <div class="document-heading">${icon('file')}<div><h1 id="document-name"></h1><span id="document-meta"></span></div></div>
      <div class="header-actions"><button id="open-another" class="button subtle" aria-label="Open PDF">${icon('plus')}<span>Open PDF</span></button><button id="download" class="icon-button" title="Download original PDF" aria-label="Download original PDF">${icon('download')}</button></div>
    </header>
    <div class="reader-toolbar" role="toolbar" aria-label="Reader controls">
      <div class="control-group page-controls"><button id="prev" class="icon-button" aria-label="Previous page" title="Previous page">${icon('left')}</button><label class="page-label" for="page-input">Page</label><input id="page-input" type="number" min="1" value="1" aria-label="Page number"/><span id="page-total"></span><button id="next" class="icon-button" aria-label="Next page" title="Next page">${icon('right')}</button></div>
      <div class="control-group zoom-controls"><button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button><select id="zoom" aria-label="Zoom level"><option value="fit">Fit width</option><option value="page">Fit page</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option></select><button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><span class="divider"></span><button id="rotate" class="icon-button" aria-label="Rotate clockwise" title="Rotate clockwise">${icon('rotate')}</button></div>
    </div>
    <main id="page-stage" class="page-stage" tabindex="0" aria-label="Document page"><div id="page-mount"></div></main>
    <footer class="reader-footer"><span id="reading-status" aria-live="polite"></span><span>Select text to highlight · ← → to turn pages</span><span id="zoom-status"></span></footer>
  </section>
  <div id="loading" class="loading" hidden role="status"><span class="spinner"></span><span id="loading-label">Opening your document…</span></div>
  <div id="error" class="toast" hidden role="alert"><span id="error-message"></span><button id="dismiss-error" class="icon-button" aria-label="Dismiss error">${icon('close')}</button></div>
`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = el<HTMLInputElement>('file-input');
const stage = el('page-stage');
const zoom = el<HTMLSelectElement>('zoom');
const pageInput = el<HTMLInputElement>('page-input');

type DocumentEntry = { id: number; file: File; page: number; pages: number };
const library: DocumentEntry[] = [];
let active: DocumentEntry | null = null;
let pdf: PDFDocumentProxy | null = null;
let rotation = 0;
let actualScale = 1;
let documentVersion = 0;
let renderVersion = 0;
let onHome = true;
// Serial rendering keeps canvas allocation bounded during rapid navigation.
let renderQueue: Promise<void> = Promise.resolve();

function showError(message: string) { el('error-message').textContent = message; el('error').hidden = false; }
function loading(value: boolean, message = 'Opening your document…') { el('loading-label').textContent = message; el('loading').hidden = !value; }
function size(bytes: number) { return bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`; }

function updateLibrary() {
  el('session-library').hidden = !library.length;
  el('document-list').replaceChildren(...library.map(entry => {
    const button = document.createElement('button');
    button.className = 'document-card';
    button.innerHTML = `<span class="document-symbol">${icon('file')}</span><span class="document-card-copy"><strong></strong><span></span></span>${icon('right')}`;
    button.querySelector('strong')!.textContent = entry.file.name;
    button.querySelector('.document-card-copy > span')!.textContent = `${entry.pages} pages · ${size(entry.file.size)} · Page ${entry.page}`;
    button.addEventListener('click', () => void open(entry.file, entry));
    return button;
  }));
}

async function open(file: File, existing?: DocumentEntry) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') return showError('Please choose a PDF document.');
  if (file.size > 100 * 1024 * 1024) return showError('This prototype supports PDFs up to 100 MB. Please choose a smaller file.');
  const version = ++documentVersion;
  loading(true);
  el('error').hidden = true;
  try {
    const nextPdf = await openPdf(file);
    if (version !== documentVersion) { await nextPdf.destroy(); return; }
    ++renderVersion;
    await renderQueue;
    if (version !== documentVersion) { await nextPdf.destroy(); return; }
    const oldPdf = pdf;
    pdf = nextPdf;
    if (oldPdf) await oldPdf.destroy();
    active = existing ?? { id: Date.now(), file, page: 1, pages: pdf.numPages };
    if (!existing) library.unshift(active);
    active.page = Math.min(active.page, pdf.numPages);
    rotation = 0;
    zoom.value = 'fit';
    el('document-name').textContent = file.name.replace(/\.pdf$/i, '');
    el('document-name').title = file.name;
    el('document-meta').textContent = `${pdf.numPages} pages · ${size(file.size)}`;
    el('home').hidden = true;
    el('reader').hidden = false;
    onHome = false;
    el('page-mount').replaceChildren();
    scheduleRender(true);
    el('back-home').focus();
  } catch (error) {
    if (version !== documentVersion) return;
    loading(false);
    const name = (error as Error).name;
    showError(name === 'PasswordException' ? 'This PDF needs a password. Please open an unlocked copy for this prototype.' : 'This file could not be opened. Please try a valid PDF.');
  }
}

function syncControls() {
  if (!pdf || !active) return;
  pageInput.value = String(active.page);
  pageInput.max = String(pdf.numPages);
  el('page-total').textContent = `/ ${pdf.numPages}`;
  el<HTMLButtonElement>('prev').disabled = active.page <= 1;
  el<HTMLButtonElement>('next').disabled = active.page >= pdf.numPages;
  el('reading-status').textContent = `Page ${active.page} of ${pdf.numPages}`;
}

function scheduleRender(resetScroll = false) {
  if (!pdf || !active || onHome) return;
  syncControls();
  const version = ++renderVersion;
  const currentPdf = pdf;
  const page = active.page;
  const rotate = rotation;
  const zoomValue = zoom.value;
  loading(true, 'Preparing the page…');
  renderQueue = renderQueue.then(async () => {
    if (version !== renderVersion) return;
    const pdfPage = await currentPdf.getPage(page);
    const natural = pdfPage.getViewport({ scale: 1, rotation: (pdfPage.rotate + rotate) % 360 });
    const padding = window.innerWidth < 600 ? 24 : 72;
    const widthScale = Math.max(0.1, (stage.clientWidth - padding) / natural.width);
    const heightScale = Math.max(0.1, (stage.clientHeight - 48) / natural.height);
    const scale = zoomValue === 'fit' ? widthScale : zoomValue === 'page' ? Math.min(widthScale, heightScale) : Number(zoomValue);
    const rendered = await renderPage(currentPdf, page, scale, rotate);
    if (version !== renderVersion) return;
    actualScale = scale;
    el('page-mount').replaceChildren(rendered);
    el('zoom-status').textContent = `${Math.round(scale * 100)}%`;
    if (resetScroll) stage.scrollTo(0, 0);
    loading(false);
    // Extension point: attach Three.js overlays after page geometry is ready.
    document.dispatchEvent(new CustomEvent('reader:page-rendered', { detail: { page, scale, element: rendered } }));
  }).catch(() => {
    if (version !== renderVersion) return;
    loading(false);
    showError('This page could not be displayed. Try another page or reopen the document.');
  });
}

function goToPage(value: number) {
  if (!active || !pdf) return;
  const page = Math.min(pdf.numPages, Math.max(1, Math.round(value) || 1));
  if (page === active.page) { syncControls(); return; }
  active.page = page;
  scheduleRender(true);
}
function changeZoom(direction: number) {
  const steps = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  const value = direction > 0 ? steps.find(s => s > actualScale + 0.01) ?? 3 : [...steps].reverse().find(s => s < actualScale - 0.01) ?? 0.5;
  zoom.value = String(value);
  scheduleRender();
}

for (const id of ['choose-file', 'open-another']) el(id).addEventListener('click', () => input.click());
input.addEventListener('change', () => { const file = input.files?.[0]; input.value = ''; if (file) void open(file); });
el('back-home').addEventListener('click', () => {
  ++documentVersion; ++renderVersion;
  onHome = true;
  loading(false);
  el('reader').hidden = true; el('home').hidden = false;
  updateLibrary(); el('choose-file').focus();
});
el('dismiss-error').addEventListener('click', () => { el('error').hidden = true; });
el('prev').addEventListener('click', () => goToPage((active?.page ?? 1) - 1));
el('next').addEventListener('click', () => goToPage((active?.page ?? 1) + 1));
pageInput.addEventListener('change', () => goToPage(Number(pageInput.value)));
pageInput.addEventListener('keydown', e => { if (e.key === 'Enter') { goToPage(Number(pageInput.value)); stage.focus(); } });
zoom.addEventListener('change', () => scheduleRender());
el('zoom-out').addEventListener('click', () => changeZoom(-1));
el('zoom-in').addEventListener('click', () => changeZoom(1));
el('rotate').addEventListener('click', () => { rotation = (rotation + 90) % 360; scheduleRender(); });
el('download').addEventListener('click', () => {
  if (!active) return;
  const url = URL.createObjectURL(active.file);
  const link = document.createElement('a'); link.href = url; link.download = active.file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

let dragDepth = 0;
window.addEventListener('dragover', e => { e.preventDefault(); });
window.addEventListener('dragenter', e => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault(); dragDepth++; el('drop-zone').classList.add('dragging');
});
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; el('drop-zone').classList.remove('dragging'); } });
window.addEventListener('drop', e => {
  e.preventDefault(); dragDepth = 0; el('drop-zone').classList.remove('dragging');
  const file = e.dataTransfer?.files[0]; if (file) void open(file);
});
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || onHome || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (window.getSelection()?.toString()) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); goToPage((active?.page ?? 1) + (e.key === 'ArrowRight' ? 1 : -1)); }
});
let resizeTimer: ReturnType<typeof setTimeout>;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (['fit','page'].includes(zoom.value)) scheduleRender(); }, 180); });
// Selection is kept native. Future squishy effects subscribe without owning PDF loading.
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (onHome || !selection?.rangeCount || !stage.contains(selection.anchorNode)) return;
  const range = selection.getRangeAt(0);
  document.dispatchEvent(new CustomEvent('reader:selection-changed', { detail: { text: selection.toString(), rects: Array.from(range.getClientRects()).map(r => ({ x:r.x, y:r.y, width:r.width, height:r.height })) } }));
});
