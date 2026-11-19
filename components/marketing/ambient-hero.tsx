"use client";
import { useEffect, useRef } from "react";

// Glyphs belong to the actual pointer path. Nothing is emitted by the draw loop.
const TRAIL_LIFETIME_MS = 720;
const MAX_CELLS = 480;
type Point = {
  x: number;
  y: number;
  time: number;
  vx: number;
  vy: number;
};
type Cell = {
  x: number;
  y: number;
  born: number;
  edge: boolean;
  seed: number;
  vx: number;
  vy: number;
  normalX: number;
  normalY: number;
  ripple: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Hero-only, event-fed streak. One bounded canvas and no idle animation frames. */
export function AmbientHeroBackground() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const host = root.current!,
      layer = canvas.current!;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    const hero = host.parentElement!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = matchMedia("(hover: none), (pointer: coarse)");
    const cells = new Map<string, Cell>();
    let width = 1,
      height = 1,
      frame = 0,
      visible = true,
      enabled = false,
      disposed = false;
    let previous: Point | null = null;

    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      cells.clear();
      previous = null;
      ctx.clearRect(0, 0, width, height);
    };
    const draw = (now: number) => {
      frame = 0;
      if (!enabled || disposed) return;
      ctx.clearRect(0, 0, width, height);
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const [key, cell] of cells) {
        const age = (now - cell.born) / TRAIL_LIFETIME_MS;
        if (age >= 1) {
          cells.delete(key);
          continue;
        }
        const opacity =
          0.84 * Math.pow(1 - Math.max(0, age), 1.25) * (cell.edge ? 0.48 : 1);
        const ageSeconds = age * (TRAIL_LIFETIME_MS / 1000);
        // Exponential drag carries fast cursor motion into a short, soft wake.
        const dragDistance = (1 - Math.exp(-4 * ageSeconds)) / 4;
        const waterRipple =
          Math.sin(ageSeconds * 10 + cell.seed) * cell.ripple * (1 - age);
        const x =
          cell.x + cell.vx * dragDistance + cell.normalX * waterRipple;
        const y =
          cell.y + cell.vy * dragDistance + cell.normalY * waterRipple;
        const glyph = age > 0.48 || cell.seed % 4 === 0 ? "−" : ">";
        // White glyphs retain contrast over the pale hero with a fine dark edge.
        ctx.lineWidth = 0.65;
        ctx.strokeStyle = `rgba(37,52,76,${opacity * 0.48})`;
        ctx.strokeText(glyph, x, y);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fillText(glyph, x, y);
      }
      if (cells.size) frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      if (!enabled || event.pointerType === "touch") return;
      const rect = host.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        time: performance.now(),
        vx: 0,
        vy: 0,
      };
      if (!previous || point.time - previous.time > 140) {
        previous = point;
        return;
      }
      const dx = point.x - previous.x,
        dy = point.y - previous.y;
      const distance = Math.hypot(dx, dy);
      // Identical positions and subpixel jitter never keep a stationary trail alive.
      if (distance < 1.25) return;
      const vx = dx / distance,
        vy = dy / distance;
      const elapsed = Math.max(8, point.time - previous.time) / 1000;
      point.vx = dx / elapsed;
      point.vy = dy / elapsed;
      const speed = Math.hypot(point.vx, point.vy);
      const accelerationX = (point.vx - previous.vx) / elapsed;
      const accelerationY = (point.vy - previous.vy) / elapsed;
      const acceleration = Math.hypot(accelerationX, accelerationY);
      const speedBoost = clamp((speed - 240) / 900, 0, 1);
      const accelerationBoost = clamp(acceleration / 6000, 0, 1);
      const normalX = -vy,
        normalY = vx;
      const dragSpeed = clamp(speed * 0.13 + acceleration * 0.0035, 8, 180);
      const sideDrift = clamp(
        (accelerationX * normalX + accelerationY * normalY) * 0.003,
        -38,
        38,
      );
      const driftX = -vx * dragSpeed + normalX * sideDrift;
      const driftY =
        -vy * dragSpeed +
        normalY * sideDrift -
        (18 + speedBoost * 18 + accelerationBoost * 28);
      const rowSpacing = 6 + speedBoost * 3 + accelerationBoost * 3;
      const ripple = 0.5 + speedBoost * 1.2 + accelerationBoost * 1.6;
      const steps = Math.min(64, Math.ceil(distance / 6));
      for (let step = 1; step <= steps; step++) {
        const x = previous.x + (dx * step) / steps,
          y = previous.y + (dy * step) / steps;
        // Close rows follow the pointer path and widen slightly as it accelerates.
        for (const row of [-2, -1, 0, 1, 2]) {
          const gx = Math.round((x + normalX * row * rowSpacing) / 8);
          const gy = Math.round((y + normalY * row * rowSpacing) / 9);
          const key = `${gx}:${gy}`;
          cells.delete(key);
          cells.set(key, {
            x: gx * 8,
            y: gy * 9,
            born: point.time,
            edge: Math.abs(row) > 1,
            seed: Math.abs(gx * 17 + gy * 31),
            vx: driftX,
            vy: driftY,
            normalX,
            normalY,
            ripple,
          });
        }
      }
      while (cells.size > MAX_CELLS) cells.delete(cells.keys().next().value!);
      previous = point;
      if (!frame && cells.size) frame = requestAnimationFrame(draw);
    };
    const leave = () => {
      previous = null;
    };
    const update = () => {
      if (disposed) return;
      enabled =
        visible && !document.hidden && !reduced.matches && !coarse.matches;
      host.dataset.running = String(enabled);
      if (!enabled) clear();
    };
    const resize = new ResizeObserver(([entry]) => {
      clear();
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      layer.width = Math.round(width * dpr);
      layer.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    resize.observe(host);
    observer.observe(host);
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", update);
    coarse.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      disposed = true;
      clear();
      resize.disconnect();
      observer.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      reduced.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div className="ambient-hero" ref={root} aria-hidden="true">
      <div className="ambient-cloud cloud-one" />
      <div className="ambient-cloud cloud-two" />
      <div className="ambient-cloud cloud-three" />
      <div className="ambient-silk" />
      <canvas ref={canvas} />
    </div>
  );
}
