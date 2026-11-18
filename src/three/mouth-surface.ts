import { MathUtils } from 'three';

type MouthGrid = { minX: number; minY: number; width: number; height: number; depths: number[][] };

/** Interpolate the skin depths baked from this mascot by scripts/bake-frog-mouth.mjs. */
export function mouthSurface({ minX, minY, width, height, depths }: MouthGrid) {
  const columns = depths[0].length - 1, rows = depths.length - 1;
  return (x: number, y: number) => {
    const u = MathUtils.clamp((x - minX) / width * columns, 0, columns - 0.00001);
    const v = MathUtils.clamp((y - minY) / height * rows, 0, rows - 0.00001);
    const i = Math.floor(u), j = Math.floor(v);
    const top = MathUtils.lerp(depths[j][i], depths[j][i + 1], u - i);
    const bottom = MathUtils.lerp(depths[j + 1][i], depths[j + 1][i + 1], u - i);
    return MathUtils.lerp(top, bottom, v - j);
  };
}
