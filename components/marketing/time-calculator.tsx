"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { EditAIMascot } from "@/app/components/EditAIMascot";
import { marketingContent as content } from "@/lib/marketing/content";

type Estimate = {
  videos: number;
  currentMonth: number;
  targetMonth: number;
  weekly: number;
  ceiling: number;
};
const keys: (keyof Estimate)[] = [
  "videos",
  "currentMonth",
  "targetMonth",
  "weekly",
  "ceiling",
];
const numberFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const format = (n: number) => numberFormat.format(n);

/** One interruptible animation for the ruler, numbers and chart; never queues tweens. */
function useSmoothEstimate(
  target: Estimate,
  host: RefObject<HTMLDivElement | null>,
) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const destination = useRef(target);
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      visible = true;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const finish = () => {
      stop();
      current.current = destination.current;
      setShown(destination.current);
    };
    const animate = (now: number) => {
      const dt = Math.min(last ? now - last : 16, 48);
      last = now;
      const amount = 1 - Math.exp(-dt / 70);
      const next = { ...current.current };
      let settled = true;
      for (const key of keys) {
        const delta = destination.current[key] - next[key];
        next[key] =
          Math.abs(delta) < 0.005
            ? destination.current[key]
            : next[key] + delta * amount;
        if (next[key] !== destination.current[key]) settled = false;
      }
      current.current = next;
      setShown(next);
      frame = settled ? 0 : requestAnimationFrame(animate);
      if (settled) last = 0;
    };
    const update = () => {
      if (reduced.matches || document.hidden || !visible) {
        finish();
        return;
      }
      if (!frame) frame = requestAnimationFrame(animate);
    };
    wake.current = update;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (host.current) observer.observe(host.current);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      stop();
      observer.disconnect();
      wake.current = () => {};
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [host]);
  const { videos, currentMonth, targetMonth, weekly, ceiling } = target;
  useEffect(() => {
    destination.current = {
      videos,
      currentMonth,
      targetMonth,
      weekly,
      ceiling,
    };
    wake.current();
  }, [videos, currentMonth, targetMonth, weekly, ceiling]); // primitive inputs; object identity must not restart animation
  return shown;
}

export function TimeCalculator() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setCompact(entry.contentRect.width < 520),
    );
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const [videos, setVideos] = useState(content.calculator.videos);
  const [demo, setDemo] = useState("pending");
  const interrupted = useRef(false);
  const introDone = useRef(false);
  const chart = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    pointer: number;
    y: number;
    value: number;
    scale: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const interrupt = () => {
    interrupted.current = true;
    setDemo("interrupted");
  };
  const select = (value: number) => {
    interrupt();
    setVideos(Math.max(1, Math.min(20, Math.round(value))));
  };
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      elapsed = 0,
      last = 0,
      visible = false;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    };
    const tick = (now: number) => {
      frame = 0;
      if (interrupted.current || introDone.current) return;
      if (last) elapsed += Math.min(now - last, 80);
      last = now;
      const fraction = Math.min(1, elapsed / 3200);
      setVideos(4 + 11 * fraction * fraction * (3 - 2 * fraction));
      if (fraction < 1) frame = requestAnimationFrame(tick);
      else {
        introDone.current = true;
        setDemo("complete");
      }
    };
    const sync = () => {
      stop();
      if (interrupted.current || introDone.current) return;
      if (!visible || document.hidden) return;
      if (motion.matches) {
        setVideos(15);
        introDone.current = true;
        setDemo("complete");
        return;
      }
      setDemo("playing");
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.intersectionRatio >= 0.35;
        sync();
      },
      { threshold: [0, 0.35] },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);
  const current = content.calculator.currentMinutes;
  const target = content.calculator.targetMinutes;
  const weekly = Math.max(0, ((current - target) * videos) / 60);
  const currentMonth = ((current * videos) / 60) * 4;
  const targetMonth = ((target * videos) / 60) * 4;
  const ceiling = 80; // Fixed 20-video ceiling makes volume visibly change the chart.
  const shown = useSmoothEstimate(
    { videos, weekly, currentMonth, targetMonth, ceiling },
    root,
  );
  const progress = (shown.videos - 1) / 19;
  const chartWidth = compact ? 400 : 800;
  const left = compact ? 42 : 50;
  const right = compact ? 370 : 750;
  const y = (hours: number) => 190 - (hours / shown.ceiling) * 160;
  const currentY = y(shown.currentMonth),
    targetY = y(shown.targetMonth);
  const point = (event: ReactPointerEvent<SVGElement>) => {
    const matrix = chart.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : null;
  };
  const beginDrag = (
    event: ReactPointerEvent<SVGElement>,
    kind: "alone" | "editai",
  ) => {
    if (event.button !== 0) return;
    const position = point(event);
    if (!position || !chart.current) return;
    event.preventDefault();
    const value = Math.round(shown.videos);
    select(value);
    drag.current = {
      pointer: event.pointerId,
      y: position.y,
      value,
      scale:
        ((kind === "alone" ? current : target) / 60) *
        4 *
        2 *
        Math.max(0.2, Math.min(1, (position.x - left) / (right - left))),
    };
    chart.current.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = drag.current,
      position = point(event);
    if (active && position && active.pointer === event.pointerId)
      select(active.value + (active.y - position.y) / active.scale);
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const keyChange = (event: ReactKeyboardEvent<SVGGElement>) => {
    const value =
      event.key === "Home"
        ? 1
        : event.key === "End"
          ? 20
          : ["ArrowUp", "ArrowRight"].includes(event.key)
            ? videos + 1
            : ["ArrowDown", "ArrowLeft"].includes(event.key)
              ? videos - 1
              : null;
    if (value !== null) {
      event.preventDefault();
      select(value);
    }
  };
  const alonePath = `M${left} 190 L${right} ${currentY}`;
  const editaiPath = `M${left} 190 L${right} ${targetY}`;
  return (
    <div
      ref={root}
      className="time-calculator m-reveal"
      aria-labelledby={`${id}-title`}
      data-demo={demo}
      data-dragging={dragging || undefined}
    >
      <div className="calculator-top">
        <div className="calculator-heading">
          <label htmlFor={`${id}-videos`}>Videos a week</label>
          <aside className="calculator-eva-hint" aria-label="Eva’s tip">
            <p>Drag the slider or graph to see your editing time.</p>
            <EditAIMascot
              size={72}
              greeting
              interactive={false}
              shadow
              className="calculator-guide-eva"
            />
          </aside>
        </div>
        <div
          className="calculator-range"
          style={{ "--range-position": `${progress * 100}%` } as CSSProperties}
        >
          <div className="range-visual" aria-hidden="true">
            <output className="range-value" htmlFor={`${id}-videos`}>
              {Math.round(shown.videos)} <span>videos</span>
            </output>
            <svg
              className="range-ticks"
              viewBox="0 0 1000 52"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 101 }, (_, i) => {
                const distance = i - progress * 100;
                const height = 6 + 22 * Math.exp(-(distance * distance) / 65);
                return (
                  <line
                    key={i}
                    x1={i * 10}
                    x2={i * 10}
                    y1={34 - height}
                    y2="34"
                    className={i <= progress * 100 ? "filled" : undefined}
                  />
                );
              })}
            </svg>
            <span className="range-thumb" />
          </div>
          <input
            id={`${id}-videos`}
            aria-label="Videos a week"
            aria-valuetext={`${Math.round(videos)} videos per week`}
            type="range"
            min="1"
            max="20"
            step="1"
            value={Math.round(videos)}
            onFocus={interrupt}
            onPointerDown={interrupt}
            onChange={(e) => select(Number(e.target.value))}
          />
        </div>
        <div className="range-scale" aria-hidden="true">
          {[1, 5, 10, 15, 20].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
      <h3 id={`${id}-title`}>Your editing hours</h3>
      <p id={`${id}-drag-help`} className="m-sr-only">
        Drag a line up or down, or use the arrow keys, to change videos per
        week.
      </p>
      <svg
        ref={chart}
        className="time-chart"
        viewBox={`0 0 ${chartWidth} 260`}
        data-compact={compact}
        role="group"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        aria-label={`Estimated hours over four weeks: ${format(currentMonth)} without EditAI, ${format(targetMonth)} with EditAI (illustrative).`}
      >
        <defs>
          <linearGradient id={`${id}-brand`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#90dce8" />
            <stop offset=".5" stopColor="#c9bdf2" />
            <stop offset="1" stopColor="#f8e894" />
          </linearGradient>
          <linearGradient id={`${id}-editai`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#73d3e7" />
            <stop offset=".5" stopColor="#aea0ed" />
            <stop offset="1" stopColor="#f1b8be" />
          </linearGradient>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d1f2f7" stopOpacity=".8" />
            <stop offset=".5" stopColor="#e6e0ff" stopOpacity=".65" />
            <stop offset="1" stopColor="#ffe3d9" stopOpacity=".35" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((step) => (
          <g key={step}>
            <line
              x1={left}
              x2={chartWidth - 25}
              y1={190 - step * 40}
              y2={190 - step * 40}
              stroke="var(--m-border)"
              strokeDasharray="2 5"
            />
            {step > 0 && (
              <text x="0" y={194 - step * 40}>
                {format((shown.ceiling / 4) * step)} hrs
              </text>
            )}
            <text
              x={left + (step * (right - left)) / 4}
              y="243"
              textAnchor={step === 0 ? "start" : "middle"}
            >
              {step ? `Week ${step}` : "Now"}
            </text>
          </g>
        ))}
        <path
          d={`M${left} 190 L${right} ${currentY} L${right} ${targetY} Z`}
          fill={`url(#${id}-fill)`}
        />
        <circle cx={left} cy="190" r="3" fill="var(--m-ink)" />
        <g
          className="chart-control chart-control-alone"
          role="slider"
          tabIndex={0}
          aria-label="Alone estimate"
          aria-valuemin={1}
          aria-valuemax={20}
          aria-valuenow={Math.round(videos)}
          aria-valuetext={`${Math.round(videos)} videos per week; ${format(currentMonth)} hours alone`}
          aria-orientation="vertical"
          aria-describedby={`${id}-drag-help`}
          onPointerDown={(event) => beginDrag(event, "alone")}
          onFocus={interrupt}
          onKeyDown={keyChange}
        >
          <path className="chart-current" d={alonePath} />
          <path className="chart-drag-hit" d={alonePath} />
          <circle
            cx={right}
            cy={currentY}
            r="4"
            fill="var(--m-paper)"
            stroke="#ce8b9c"
            strokeWidth="1.5"
          />
          <g
            className="chart-end-label"
            transform={`translate(${right - 112} ${Math.max(4, currentY - 24)})`}
          >
            <rect width="105" height="18" rx="9" fill="#fae3e8" />
            <text x="52.5" y="12" textAnchor="middle">
              {format(shown.currentMonth)}h alone
            </text>
          </g>
        </g>
        <g
          className="chart-control chart-control-editai"
          role="slider"
          tabIndex={0}
          aria-label="EditAI estimate"
          aria-valuemin={1}
          aria-valuemax={20}
          aria-valuenow={Math.round(videos)}
          aria-valuetext={`${Math.round(videos)} videos per week; ${format(targetMonth)} hours with EditAI`}
          aria-orientation="vertical"
          aria-describedby={`${id}-drag-help`}
          onPointerDown={(event) => beginDrag(event, "editai")}
          onFocus={interrupt}
          onKeyDown={keyChange}
        >
          <path
            className="chart-target"
            style={{ stroke: `url(#${id}-editai)` }}
            d={editaiPath}
          />
          <path className="chart-drag-hit" d={editaiPath} />
          <circle
            className="chart-target-dot"
            cx={right}
            cy={targetY}
            r="4"
            fill="#aea0ed"
          />
          <g
            className="chart-end-label chart-editai-brand"
            transform={`translate(${right - 128} ${targetY - currentY < 42 ? targetY + 8 : targetY - 32})`}
          >
            <rect
              width="122"
              height="24"
              rx="12"
              fill="#fff"
              stroke="#d6ccf0"
            />
            <text
              className="chart-brand-label"
              x="61"
              y="16"
              textAnchor="middle"
            >
              <tspan className="chart-brand-hours">
                {format(shown.targetMonth)}h with{" "}
              </tspan>
              <tspan
                className="chart-brand-wordmark"
                style={{ fill: `url(#${id}-brand)` }}
              >
                EditAI
              </tspan>
            </text>
          </g>
        </g>
        {targetY - currentY > 48 && (
          <text
            className="chart-difference"
            x={left + (right - left) * (compact ? 0.4 : 0.58)}
            y={
              190 -
              ((190 - currentY + (190 - targetY)) * (compact ? 0.4 : 0.58)) /
                2 +
              4
            }
            textAnchor="middle"
          >
            {format(shown.weekly * 4)} hrs{compact ? "" : " difference"}
          </text>
        )}
      </svg>
      <div className="calculator-results" aria-live="off">
        <div>
          <strong>
            {format(shown.weekly)} <span>hrs</span>
          </strong>
          <p>back every week</p>
        </div>
        <div>
          <strong>
            {format(shown.weekly * 4)} <span>hrs</span>
          </strong>
          <p>back every month</p>
        </div>
      </div>
      <p className="calculator-disclaimer">
        Illustrative planning example: 4 videos a week. Assume 60 minutes to
        edit each video yourself, or 15 minutes of your time for briefing and
        review with an editor or Eva. These are estimates, not measured results
        or promises. Paid editor fees and AI charges vary.
      </p>
    </div>
  );
}
