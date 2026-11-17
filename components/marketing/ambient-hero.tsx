"use client";
import { useEffect, useRef } from "react";

/** One bounded canvas; no React updates per frame. All observers/listeners are disposed. */
export function AmbientHeroBackground() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const host = root.current!,
      layer = canvas.current!;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const touch = matchMedia("(hover: none), (pointer: coarse)");
    let width = 1,
      height = 1,
      frame = 0,
      visible = true,
      last = 0,
      elapsed = 0;
    let px = 0.2,
      py = 0.6,
      targetX = 0.2,
      targetY = 0.6,
      lastX = 0.2,
      lastY = 0.6,
      inside = false;
    let lastTrail = 0;
    const traces: {
      x: number;
      y: number;
      dx: number;
      dy: number;
      time: number;
      speed: number;
    }[] = [];
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      layer.width = Math.round(width * dpr);
      layer.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(host);
    const move = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / width;
      targetY = (event.clientY - rect.top) / height;
      inside = true;
    };
    const leave = () => {
      inside = false;
    };
    const hero = host.parentElement!;
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    const draw = (now: number) => {
      const dt = Math.min(last ? now - last : 16, 40);
      last = now;
      elapsed += dt;
      const t = elapsed / 1000;
      px += (targetX - px) * (1 - Math.exp(-dt / 150));
      py += (targetY - py) * (1 - Math.exp(-dt / 150));
      const dx = px - lastX,
        dy = py - lastY,
        speed = Math.hypot(dx * width, dy * height);
      host.style.setProperty("--pointer-x", `${(px - 0.5) * 9}px`);
      host.style.setProperty("--pointer-y", `${(py - 0.5) * 7}px`);
      ctx.clearRect(0, 0, width, height);
      if (inside && !touch.matches && elapsed - lastTrail > 75) {
        traces.push({
          x: px * width,
          y: py * height,
          dx,
          dy,
          speed,
          time: elapsed,
        });
        if (traces.length > 12) traces.shift();
        lastTrail = elapsed;
      }
      while (traces.length && elapsed - traces[0].time > 1500) traces.shift();
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      // Broken curved glyph field. Slow motion expands into directional rows.
      for (let i = 0; i < traces.length; i++) {
        const trace = traces[i],
          age = (elapsed - trace.time) / 1500;
        const alpha = Math.sin(Math.PI * age) * 0.4;
        const radius = 34 + age * 65;
        const stretch = Math.min(trace.speed * 3.5, 100);
        const arcSamples = trace.speed < 4 ? 24 : 12;
        for (let j = 0; j < arcSamples; j++) {
          const angle = (j / arcSamples) * Math.PI * 1.8 + t * 0.12;
          const x =
            trace.x +
            Math.cos(angle) * (radius + stretch) -
            trace.dx * age * width * 7;
          const y =
            trace.y +
            Math.sin(angle) * radius * 0.62 -
            trace.dy * age * height * 5;
          ctx.fillStyle = `rgba(50,106,180,${alpha * (j % 3 === 0 ? 0.6 : 1)})`;
          ctx.fillText(j % 4 === 0 ? "·" : j % 3 === 0 ? "_" : ">", x, y);
        }
        // Faster sweeps leave three broken rows of arrows/micro-strokes,
        // aligned with actual pointer velocity rather than a replayed path.
        if (trace.speed > 2) {
          const magnitude =
            Math.hypot(trace.dx * width, trace.dy * height) || 1;
          const vx = (trace.dx * width) / magnitude,
            vy = (trace.dy * height) / magnitude;
          ctx.fillStyle = `rgba(50,106,180,${alpha * 0.7})`;
          for (let row = -1; row <= 1; row++) {
            for (let column = 0; column < 7; column++) {
              if ((column + row + i) % 5 === 0) continue;
              const distance = column * 11 + age * 45;
              const x = trace.x - vx * distance - vy * row * 10;
              const y = trace.y - vy * distance + vx * row * 10;
              ctx.fillText(row === 0 && column < 5 ? ">" : "—", x, y);
            }
          }
        }
      }
      // Sparse, faint ambient formations continue without pointer interaction.
      for (let i = 0; i < 28; i++) {
        const a = i * 2.399 + t * 0.04;
        const x = width * (0.17 + 0.65 * ((i * 0.618) % 1)) + Math.cos(a) * 30;
        const y = height * (0.3 + 0.6 * ((i * 0.382) % 1)) + Math.sin(a) * 18;
        ctx.fillStyle = `rgba(50,106,180,${0.08 + Math.sin(t * 0.5 + i) * 0.04})`;
        ctx.fillText(i % 3 ? "—" : ">", x, y);
      }
      lastX = px;
      lastY = py;
      frame = requestAnimationFrame(draw);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      const active =
        visible && !document.hidden && !reduced.matches && !touch.matches;
      host.dataset.running = String(active);
      if (active) frame = requestAnimationFrame(draw);
      else {
        traces.length = 0;
        ctx.clearRect(0, 0, width, height);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(host);
    reduced.addEventListener("change", update);
    touch.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      reduced.removeEventListener("change", update);
      touch.removeEventListener("change", update);
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
