"use client";
import { useEffect, useRef } from "react";

// Glyphs belong to the actual pointer path. Nothing is emitted by the draw loop.
const TRAIL_LIFETIME_MS = 720;
const MAX_CELLS = 480;
type Point = { x: number; y: number; time: number };
type Cell = { x: number; y: number; born: number; edge: boolean; seed: number };

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
          0.46 * Math.pow(1 - Math.max(0, age), 1.35) * (cell.edge ? 0.55 : 1);
        ctx.fillStyle = `rgba(50,106,180,${opacity})`;
        // Older characters soften into short strokes, in place, rather than expanding.
        ctx.fillText(
          age > 0.48 || cell.seed % 4 === 0 ? "−" : ">",
          cell.x,
          cell.y,
        );
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
      const steps = Math.min(64, Math.ceil(distance / 6));
      for (let step = 1; step <= steps; step++) {
        const x = previous.x + (dx * step) / steps,
          y = previous.y + (dy * step) / steps;
        // Four close parallel rows follow the segment normal: a ribbon, never a ring.
        for (const row of [-1.5, -0.5, 0.5, 1.5]) {
          const gx = Math.round((x - vy * row * 7) / 8);
          const gy = Math.round((y + vx * row * 7) / 9);
          const key = `${gx}:${gy}`;
          cells.delete(key);
          cells.set(key, {
            x: gx * 8,
            y: gy * 9,
            born: point.time,
            edge: Math.abs(row) > 1,
            seed: Math.abs(gx * 17 + gy * 31),
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
