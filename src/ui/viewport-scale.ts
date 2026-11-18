/** Converts 1440 × 810 design pixels to the native CSS pixels used by pointer events. */
export function viewportScale() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
}
