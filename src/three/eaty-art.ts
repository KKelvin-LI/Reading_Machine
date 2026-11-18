type EatyView = 'top' | 'front';

/** These 512px transparent stills are rendered from the same model as the home animation. */
export function staticEaty(view:EatyView): string {
  return import.meta.env.BASE_URL+`images/home/eaty-${view}.webp`;
}

export async function eatyTopView() {
  return staticEaty('top');
}

export async function eatyFrontView() {
  return staticEaty('front');
}

export function applyEatyImage(image:HTMLImageElement|SVGImageElement, view:EatyView='top') {
  const url=staticEaty(view);
  if(image instanceof SVGImageElement)image.setAttribute('href',url);
  else image.src=url;
}

export function mountEatyBrand() {
  document.querySelectorAll<HTMLImageElement>('img[data-eaty-front]').forEach(image=>applyEatyImage(image,'front'));
}
