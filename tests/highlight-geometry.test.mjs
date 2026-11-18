import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectionLines } from '../src/interactions/highlight.ts';

// Simulate separate PDF.js text runs in document order, as returned by a DOM Range.
function selectRuns(boxes) {
  const layer = {};
  const span = { closest: selector => selector === '.textLayer' ? layer : span };
  const runs = boxes.map(([x, y, width, height]) => ({
    textContent: 'ink',
    parentElement: span,
    rect: { left: x, top: y, right: x + width, bottom: y + height, width, height },
  }));
  const range = {
    commonAncestorContainer: { nodeType: 1 },
    startContainer: runs[0], startOffset: 0,
    endContainer: runs.at(-1), endOffset: 3,
    intersectsNode: () => true,
  };
  globalThis.Node = { TEXT_NODE: 3 };
  globalThis.NodeFilter = { SHOW_TEXT: 4 };
  globalThis.document = {
    createTreeWalker() {
      return { nextNode: () => runs.shift() };
    },
    createRange() {
      return {
        setStart(node) { this.node = node; },
        setEnd() {},
        getClientRects() { return [this.node.rect]; },
      };
    },
  };
  return selectionLines(range);
}

test('marks follow PDF reading order and stay out of the gutter between columns', () => {
  const lines = selectRuns([[10, 10, 22, 8], [33, 10, 15, 8], [10, 20, 39, 8], [150, 10, 30, 8]]);
  assert.deepEqual(lines.map(r => [r.left, r.top, r.width]), [[10, 10, 38], [10, 20, 39], [150, 10, 30]]);
  const sameBaseline = selectRuns([[10, 10, 22, 8], [150, 10, 30, 8]]);
  assert.equal(sameBaseline.length, 2);
});

test('small caption glyphs remain highlightable in a fitted spread', () => {
  assert.deepEqual(selectRuns([[5, 8, 0.45, 1.5]]), [{ left: 5, top: 8, width: 0.45, height: 1.5 }]);
});
