// Run with Node after re-exporting either mascot, then check in the generated grids.
import { readFile, writeFile } from 'node:fs/promises';
import { Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

async function bakeMouth(modelName, outputName, facePattern, columns, rows) {
  const model = new URL(`../public/models/home/${modelName}`, import.meta.url);
  const output = new URL(`../src/three/${outputName}`, import.meta.url);
  const bytes = await readFile(model);
  const { scene } = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''
  );
  scene.updateMatrixWorld(true);

  let face;
  scene.traverse(part => {
    if (part instanceof Mesh && facePattern.test(part.name)) {
      face = new Mesh(part.geometry.clone().applyMatrix4(part.matrixWorld), part.material);
    }
  });
  if (!face) throw new Error(`No face mesh found in ${modelName}.`);

  const grid = { minX: -1.65, width: 3.3, minY: 0.4, height: 1.6 };
  const ray = new Raycaster();
  const direction = new Vector3(0, 0, -1);
  const depths = [];
  for (let j = 0; j <= rows; j++) {
    const row = [];
    const y = grid.minY + grid.height * j / rows;
    for (let i = 0; i <= columns; i++) {
      const x = grid.minX + grid.width * i / columns;
      ray.set(new Vector3(x, y, 5), direction);
      const [hit] = ray.intersectObject(face, false);
      row.push(hit?.point.z ?? 0.9);
    }
    depths.push(row);
  }

  const gridFields = Object.entries(grid).map(([key, value]) => `  "${key}": ${value},`);
  const depthRows = depths.map(row => `    ${JSON.stringify(row)}`);
  await writeFile(output, ['{', ...gridFields, '  "depths": [', depthRows.join(',\n'), '  ]', '}', ''].join('\n'));
}

await bakeMouth('frog-yellow.glb', 'frog-mouth-depths.json', /Continuous[ _]frog[ _]face/i, 32, 24);
await bakeMouth('frog-completion.glb', 'completion-mouth-depths.json', /rigid[ _]head[ _]skin/i, 16, 12);
