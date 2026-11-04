import './stream-compat';
import {prototypePaper} from '../config/prototype';
import { getDocument, GlobalWorkerOptions, TextLayer, OPS, Util, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

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
export async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, scale: number, rotation: number, signal?: AbortSignal) {
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
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (viewport.width * viewport.height)));
  canvas.width = Math.ceil(viewport.width * pixelRatio);
  canvas.height = Math.ceil(viewport.height * pixelRatio);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  canvas.setAttribute('aria-label', `PDF page ${pageNumber}`);
  wrapper.append(canvas);
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const layered=pdf.fingerprints[0]===prototypePaper.fingerprint;
  const operators=layered?await page.getOperatorList():undefined;
  const textPaint=new Set<number>([OPS.showText,OPS.showSpacedText,OPS.nextLineShowText,OPS.nextLineSetSpacingShowText]);
  const task=page.render({ canvas, viewport, operationsFilter:operators?(index=>!textPaint.has(operators.fnArray[index])):undefined, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
  const cancel=()=>task.cancel();signal?.addEventListener('abort',cancel,{once:true});
  try{await task.promise;}catch(error){canvas.width=canvas.height=0;throw error;}finally{signal?.removeEventListener('abort',cancel);}
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const text = document.createElement('div');
  text.className = 'textLayer';
  wrapper.append(text);
  const content=await page.getTextContent();
  const textLayer=new TextLayer({ textContentSource: content, container: text, viewport });
  const cancelText=()=>textLayer.cancel();signal?.addEventListener('abort',cancelText,{once:true});
  try{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');await textLayer.render();}
  catch(error){canvas.width=canvas.height=0;throw error;}
  finally{signal?.removeEventListener('abort',cancelText);}
  if(signal?.aborted){canvas.width=canvas.height=0;throw new DOMException('Cancelled','AbortError');}
  // Preserve the actual canvas font for precise per-word overlays. The selection
  // layer may use a metrically different fallback font scaled to the whole line.
  const items=content.items.filter((item):item is Extract<typeof item,{str:string}>=>'str' in item);
  let itemIndex=0;
  const measure=document.createElement('canvas').getContext('2d')!;
  if(layered){wrapper.classList.add('pdf-layered-text');text.replaceChildren();}
  if(layered)for(const item of items){const span=document.createElement('span');span.textContent=item.str;text.append(span);}
  for(const span of text.querySelectorAll<HTMLElement>('span')){
    if(!span.textContent){if(layered)itemIndex++;continue;}
    const item=items[itemIndex];if(!item)break;
    if(span.textContent!==item.str)continue;
    span.dataset.pdfItem=String(itemIndex);
    itemIndex++;
    if(page.commonObjs.has(item.fontName)){
      const font=page.commonObjs.get(item.fontName);
      if(font?.loadedName&&!font.missingFile)span.dataset.renderedFont=font.loadedName;
    }
    if(layered){
      const family=span.dataset.renderedFont??content.styles[item.fontName]?.fontFamily??'serif';
      const matrix=Util.transform(viewport.transform,item.transform);
      const size=Math.hypot(matrix[2],matrix[3]),angle=Math.atan2(matrix[1],matrix[0]);
      try{await document.fonts.load(`${size}px "${family}"`);}catch{/* Safari can reject embedded font readiness; retain the PDF font fallback. */}
      measure.font=`${size}px "${family}"`;
      const metrics=measure.measureText(item.str),line=measure.measureText('Mg');
      const ascent=line.fontBoundingBoxAscent??size*.8,descent=line.fontBoundingBoxDescent??size*.2;
      const baseline=(size+ascent-descent)/2;
      const scaleX=metrics.width?item.width*scale/metrics.width:1;
      span.style.cssText=`position:absolute;left:${matrix[4]+Math.sin(angle)*baseline}px;top:${matrix[5]-Math.cos(angle)*baseline}px;font-family:"${family}";font-size:${size}px;line-height:1;color:#151410;white-space:pre;transform-origin:0 0;transform:rotate(${angle}rad) scaleX(${scaleX});`;
      span.dataset.layeredText='true';
    }
  }
  return wrapper;
}
