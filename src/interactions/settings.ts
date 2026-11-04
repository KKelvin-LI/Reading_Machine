/** START HERE: live defaults for the interaction trial. Distances are CSS pixels. */
export const settings = {
  cursorSize: 30,
  textLift: 1, // Keep exact alignment; try 1 for a slight upward lift.
  textShadowOffset: 1,
  textShadowOpacity: 0.12,
  cursorColor: '#bda7d0',
  redColor: '#e6474c',
  foamRoughness: 0.53,
  pressDepth: 1,
  pressBeforeStretchMs: 140,
  springStiffness: 240,
  springDamping: 22,
  highlightColor: '#f7c9de',
  highlightOpacity: 0.4,
  shoulderOpacity: 0.8,
  waistRatio: 0.80,
  irregularity: 0.015,
  rulerPull: 18,
  letterDepth: .7,
  maxRaisedCharacters: 400,
};
export class Spring {
  value = 0; velocity = 0; target = 0;
  step(dt: number, reduced = false) {
    if (reduced) { this.value = this.target; this.velocity = 0; return this.value; }
    // Small bounded substeps keep return stable after backgrounding the tab.
    for (let t = 0; t < dt; t += 1 / 120) {
      const h = Math.min(1 / 120, dt - t);
      this.velocity += ((this.target - this.value) * settings.springStiffness - this.velocity * settings.springDamping) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}
