export type Point = { x: number; y: number };

/** A diagonal resize can wobble; only a deliberate tangential pull unlocks tilt. */
export function breaksResizeLock(start: Point, center: Point, pointer: Point) {
  const x = start.x - center.x,
    y = start.y - center.y;
  const radius = Math.hypot(x, y);
  if (!radius) return false;
  const dx = pointer.x - start.x,
    dy = pointer.y - start.y;
  const radial = (dx * x + dy * y) / radius;
  const tangent = (dy * x - dx * y) / radius;
  return Math.abs(tangent) > Math.max(14, Math.abs(radial) * 0.35);
}

export function normalizedDegrees(degrees: number) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

/** Hysteresis keeps upright steady until the pointer clearly leaves its small snap zone. */
export function snapUpright(degrees: number, wasSnapped: boolean) {
  const angle = normalizedDegrees(degrees);
  const snapped = Math.abs(angle) <= (wasSnapped ? 5 : 3);
  return { angle: snapped ? 0 : angle, snapped };
}
