import {WebGLRenderer,type WebGLRendererParameters} from 'three';

let supported: boolean | undefined;

/** A Windows browser may expose WebGL2 APIs while its driver refuses contexts. */
export function supportsWebGL2(): boolean {
  if (supported === undefined) {
    try {
      const context = document.createElement('canvas').getContext('webgl2', {alpha:true, antialias:true});
      supported = context !== null;
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      supported = false;
    }
  }
  return supported;
}

/** Context creation can still fail for a particular canvas after a successful probe. */
export function optionalRenderer(options:WebGLRendererParameters):WebGLRenderer|undefined {
  if(!supportsWebGL2())return;
  try {
    return new WebGLRenderer(options);
  } catch {
    supported=false;
    return;
  }
}

/** A resolution-independent snapshot for controls that normally bake a 3D mesh. */
export function flatArt(viewBox:string, shape:string): string {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${shape}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
