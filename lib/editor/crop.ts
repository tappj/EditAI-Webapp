import type { Appearance } from "./model.ts";
type Rect = Appearance["crop"];
function clockwise(c: Rect): Rect {
  return { x: 1 - c.y - c.height, y: c.x, width: c.height, height: c.width };
}
export function displayCrop(crop: Rect, a: Appearance): Rect {
  let c = { ...crop };
  if (a.flipX) c.x = 1 - c.x - c.width;
  if (a.flipY) c.y = 1 - c.y - c.height;
  for (let i = 0; i < a.rotation; i++) c = clockwise(c);
  return c;
}
export function sourceCrop(crop: Rect, a: Appearance): Rect {
  let c = { ...crop };
  for (let i = 0; i < (4 - a.rotation) % 4; i++) c = clockwise(c);
  if (a.flipX) c.x = 1 - c.x - c.width;
  if (a.flipY) c.y = 1 - c.y - c.height;
  return {
    x: Math.max(0, c.x),
    y: Math.max(0, c.y),
    width: c.width,
    height: c.height,
  };
}
export function overlayAspect(width: number, height: number, a: Appearance) {
  const w = width * a.crop.width,
    h = height * a.crop.height;
  return a.rotation % 2 ? w / h : h / w;
}
