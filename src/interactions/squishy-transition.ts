import * as THREE from 'three';
import { morph } from './models';
import { settings } from './settings';

export type Band = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Original Blender stretch reaches its maximum at this ratio.
const MAX_SHAPE_STRETCH = 6.2;

// Extra stretching happens within this central portion.
// 0.60 means the middle 60%; the outer 20% on each side stays intact.
const BODY_STRETCH_REGION = 0.60;

// Keep the pressed Blender shape throughout selection.
const HELD_DENT_STRENGTH = 1.0;
const PRESS_SPEED = 24;

const smooth = (a: number, b: number, dt: number) =>
  THREE.MathUtils.damp(a, b, 20, dt);

const morphBoundsCache=new WeakMap<THREE.Group,THREE.Box3[]>();

export class SquishyTransition {
  readonly root = new THREE.Group();
  readonly model: THREE.Group;

  private bounds: THREE.Box3[] = [];
  private width: number;
  private x: number;
  private y: number;
  private target: Band;
  private press = 0;
  private direction: number;
  private selecting=false;
  get displayedWidth(){return this.width;}

  // These values are shared with all wrapped copies of this material.
  private stretchProgress = { value: 0 };
  private extraBodyLength = { value: 0 };
  private shapeCentreX = { value: 0 };
  private shapeHalfWidth = { value: 0.5 };

  constructor(
    template: THREE.Group,
    x: number,
    y: number,
    press: number,
    direction = 1
  ) {
    this.model = template.clone(true);
    this.model.visible = true;
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.setScalar(1);

    this.root.add(this.model);

    this.width = settings.cursorSize;
    this.x = x;
    this.y = y;
    this.press = press;
    this.direction = direction;

    this.target = {
      left: x - settings.cursorSize / 2,
      top: y - settings.cursorSize / 2,
      width: settings.cursorSize,
      height: settings.cursorSize,
    };

    // Bounds are immutable for this shared template; measure only once.
    const cachedBounds=morphBoundsCache.get(template);
    if(cachedBounds)this.bounds=cachedBounds;
    else {
    // Measure the original Blender stretch shapes.
    for (let i = 0; i <= 20; i++) {
      morph(this.model, 'Finger_Press', 0);
      morph(this.model, 'Highlight_Stretch', i / 20);
      this.model.updateMatrixWorld(true);

      this.bounds.push(
        new THREE.Box3().setFromObject(this.model, true)
      );
    }

    morphBoundsCache.set(template,this.bounds);
    }
    morph(this.model, 'Highlight_Stretch', 0);
    this.model.updateMatrixWorld(true);

    // Convert each mesh into the common shape coordinate system.
    // This accounts for the rotations/scales inside the imported GLB.
    const worldToShape = this.model.matrixWorld.clone().invert();

    this.model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;

      const meshToShape = new THREE.Matrix4().multiplyMatrices(
        worldToShape,
        object.matrixWorld
      );

      const shapeToMesh = meshToShape.clone().invert();

      const material = (
        object.material as THREE.MeshStandardMaterial
      ).clone();

      object.material = material;
      material.transparent = true;
      material.depthWrite = false;
      material.opacity = 1;
      material.color.set(settings.highlightColor);

      // The shader extends beyond the original geometry bounds.
      object.frustumCulled = false;

      material.onBeforeCompile = shader => {
        shader.uniforms.transitionProgress = this.stretchProgress;
        shader.uniforms.extraBodyLength = this.extraBodyLength;
        shader.uniforms.shapeCentreX = this.shapeCentreX;
        shader.uniforms.shapeHalfWidth = this.shapeHalfWidth;

        shader.uniforms.meshToShape = { value: meshToShape };
        shader.uniforms.shapeToMesh = { value: shapeToMesh };

        shader.uniforms.centreAlpha = {
          value: settings.highlightOpacity,
        };

        shader.uniforms.shoulderAlpha = {
          value: settings.shoulderOpacity,
        };

        shader.vertexShader = `
          attribute float foamThickness;
          varying float vThickness;

          uniform float extraBodyLength;
          uniform float shapeCentreX;
          uniform float shapeHalfWidth;

          uniform mat4 meshToShape;
          uniform mat4 shapeToMesh;
        ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vThickness = foamThickness;
          `
        );

        // Run AFTER the original Blender morph has been applied.
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `
          vec3 shapePosition =
            (meshToShape * vec4(transformed, 1.0)).xyz;

          float relativeX =
            (shapePosition.x - shapeCentreX)
            / max(shapeHalfWidth, 0.00001);

          float bodyWeight = smoothstep(
            0.0,
            ${BODY_STRETCH_REGION.toFixed(3)},
            abs(relativeX)
          );

          shapePosition.x +=
            sign(relativeX)
            * extraBodyLength
            * 0.5
            * bodyWeight;

          transformed =
            (shapeToMesh * vec4(shapePosition, 1.0)).xyz;

          #include <project_vertex>
          `
        );

        shader.fragmentShader = `
          varying float vThickness;
          uniform float transitionProgress;
          uniform float centreAlpha;
          uniform float shoulderAlpha;
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          diffuseColor.a *= mix(
            1.0,
            mix(centreAlpha, shoulderAlpha, vThickness),
            transitionProgress
          );
          `
        );
      };

      material.customProgramCacheKey = () =>
        `original-foam-body-extension-${BODY_STRETCH_REGION}`;
    });
  }

  setTarget(band: Band, direction: number) {
    this.selecting=true;
    this.target = band;
    this.direction = direction;
  }

  tick(dt: number, _now: number, reduced: boolean) {
    // Dent first, then extend that same pressed mesh. Never recover the dent
    // while selected. A small continuous gate avoids an abrupt shape swap.
    this.press = reduced
      ? HELD_DENT_STRENGTH
      : THREE.MathUtils.damp(this.press, HELD_DENT_STRENGTH, PRESS_SPEED, dt);

    const dentReadiness = reduced ? 1 : THREE.MathUtils.smoothstep(
      this.press / HELD_DENT_STRENGTH, 0.15, 0.65
    );
    const selectedWidth = this.selecting
      ? Math.max(settings.cursorSize, this.target.width)
      : settings.cursorSize;
    const targetWidth = THREE.MathUtils.lerp(
      settings.cursorSize, selectedWidth, dentReadiness
    );
    this.width = reduced ? targetWidth : smooth(this.width, targetWidth, dt);

    // Original Blender morph: unchanged up to its full stretch.
    const stretch = THREE.MathUtils.clamp(
      (this.width / settings.cursorSize - 1) /
        (MAX_SHAPE_STRETCH - 1),
      0,
      1
    );

    morph(
      this.model,
      'Finger_Press',
      this.press * settings.pressDepth
    );

    morph(this.model, 'Highlight_Stretch', stretch);

    // Follow the displayed (already smoothed) length, not elapsed press time.
    // Rest = opaque; 6.2x length = configured centre/shoulder opacity.
    this.stretchProgress.value = stretch;

    // Interpolate the cached bounds of the Blender morph.
    const sample = stretch * 20;
    const index = Math.min(19, Math.floor(sample));
    const fraction = sample - index;

    const bounds = new THREE.Box3(
      this.bounds[index].min.clone().lerp(
        this.bounds[index + 1].min,
        fraction
      ),
      this.bounds[index].max.clone().lerp(
        this.bounds[index + 1].max,
        fraction
      )
    );

    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());

    // STOP scaling the whole shape after this length.
    const shoulderLimit =
      settings.cursorSize * MAX_SHAPE_STRETCH;

    const shapedWidth = Math.min(
      this.width,
      shoulderLimit
    );

    // Any additional length is supplied by the body shader.
    const extraLength = Math.max(
      0,
      this.width - shoulderLimit
    );

    const sx = shapedWidth / Math.max(size.x, 0.00001);
    const sy = settings.cursorSize / Math.max(size.y, 0.00001);

    this.model.scale.set(sx, sy, sy);

    this.model.position.set(
      -centre.x * sx,
      -centre.y * sy,
      -centre.z * sy
    );

    this.shapeCentreX.value = centre.x;
    this.shapeHalfWidth.value = size.x / 2;

    // Convert screen-pixel extension into unscaled shape units.
    this.extraBodyLength.value = extraLength / sx;

    const wantedX = this.direction >= 0
      ? this.target.left + this.width / 2
      : this.target.left + this.target.width - this.width / 2;

    const wantedY =
      this.target.top + this.target.height / 2;

    this.x = reduced
      ? wantedX
      : smooth(this.x, wantedX, dt);

    this.y = reduced
      ? wantedY
      : smooth(this.y, wantedY, dt);

    this.root.position.set(
      this.x,
      innerHeight - this.y,
      8
    );
  }

  dispose() {
    this.model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        (object.material as THREE.Material).dispose();
      }
    });

    this.root.removeFromParent();
  }
}