import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { ReadingRegion, ReadingSection } from './detection';

export const finalThesisPlanId = 'thesis-0-13-v1';

type Viewport = ReturnType<PDFPageProxy['getViewport']>;
type Boundary = { page: number; column: number; top: number };
type Chapter = Boundary & { number: number; title: string };

function headingTitle(value: string) {
  return value.trim().toLowerCase().split(/\s+/).map((word, index) =>
    index > 0 && ['of', 'the', 'and'].includes(word) ? word : word[0].toUpperCase() + word.slice(1)
  ).join(' ');
}

function spreadHeadings(page: number, viewport: Viewport, runs: TextItem[]) {
  // PDF.js can return the angle bracket, number and title as separate text runs.
  let text = '';
  const offsets = runs.map(run => {
    const offset = text.length;
    text += run.str + (run.hasEOL ? ' ' : '');
    return offset;
  });

  const headings: Chapter[] = [];
  let runIndex = 0;
  for (const match of text.matchAll(/<\s*H(\d{1,2})\s*=\s*([^<>]{1,120})>/gi)) {
    if (!match[2].trim()) continue;
    while (runIndex + 1 < runs.length && offsets[runIndex + 1] <= match.index!) runIndex++;
    const run = runs[runIndex];
    const [x, y] = viewport.convertToViewportPoint(run.transform[4], run.transform[5]);
    headings.push({
      number: Number(match[1]),
      title: headingTitle(match[2]),
      page,
      column: x < viewport.width / 2 ? 0 : 1,
      top: Math.max(0, (y - run.height) / viewport.height),
    });
  }
  return headings.sort((a, b) => a.column - b.column || a.top - b.top);
}

function regionsBetween(start: Boundary, end: Boundary) {
  const pages: Record<number, ReadingRegion[]> = {};
  for (let page = start.page; page <= end.page; page++) {
    for (let column = 0; column < 2; column++) {
      if ((page === start.page && column < start.column) || (page === end.page && column > end.column)) continue;
      const top = page === start.page && column === start.column ? start.top : 0;
      const bottom = page === end.page && column === end.column ? end.top : 1;
      if (bottom > top) {
        const regions = pages[page] ??= [];
        regions.push({ left: column / 2, right: (column + 1) / 2, start: top, end: bottom });
      }
    }
  }
  return pages;
}

/** Index the printed <H0=…> through <H13=…> headings in the thesis spreads. */
export async function thesisSections(pdf: PDFDocumentProxy, cancelled: () => boolean): Promise<ReadingSection[] | undefined> {
  const chapters: Chapter[] = [];
  let lastReference: Boundary | undefined;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    if (cancelled()) throw new DOMException('Cancelled', 'AbortError');
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const { items } = await page.getTextContent();
    if (cancelled()) throw new DOMException('Cancelled', 'AbortError');

    const runs = items.filter((item): item is TextItem => 'str' in item);
    const headings = spreadHeadings(pageNumber, viewport, runs);
    // The full-quality export repeats every heading on the contents spread.
    if (!chapters.length && headings.some(h => h.number === 0) && headings.some(h => h.number === 13)) continue;
    for (const [index, heading] of headings.entries()) {
      if (heading.number !== chapters.length) return;
      // Opening artwork belongs to its chapter. A second chapter on the same spread starts at its heading.
      chapters.push(index === 0 ? { ...heading, column: 0, top: 0 } : heading);
    }
    if (!chapters.length && pageNumber >= 8) return;
    if (chapters.at(-1)?.number === 13) {
      for (const run of runs) {
        if (!run.str.trim()) continue;
        const [x, y] = viewport.convertToViewportPoint(run.transform[4], run.transform[5]);
        // The blank facing page and back cover still have running heads and folios.
        if (y < .045 * viewport.height || y > .95 * viewport.height) continue;
        const column = x < viewport.width / 2 ? 0 : 1;
        if (!lastReference || pageNumber > lastReference.page || column > lastReference.column) {
          lastReference = { page: pageNumber, column, top: 1 };
        }
      }
    }
  }
  if (chapters.length !== 14 || chapters[0].title !== 'Abstract' || !/^References?$/i.test(chapters[13].title) || !lastReference) return;

  const endOfThesis = lastReference;
  return chapters.map((chapter, index) => {
    const regions = regionsBetween(chapter, chapters[index + 1] ?? endOfThesis);
    return {
      index: chapter.number,
      title: chapter.title,
      page: chapter.page,
      position: chapter.top,
      endPage: Math.max(...Object.keys(regions).map(Number)),
      regions,
      source: 'heading',
      planId: finalThesisPlanId,
    };
  });
}
