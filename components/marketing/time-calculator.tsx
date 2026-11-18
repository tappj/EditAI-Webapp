"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
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
  const current = content.calculator.currentMinutes;
  const target = content.calculator.targetMinutes;
  const weekly = Math.max(0, ((current - target) * videos) / 60);
  const currentMonth = ((current * videos) / 60) * 4;
  const targetMonth = ((target * videos) / 60) * 4;
  const ceiling = Math.max(
    10,
    Math.ceil(Math.max(currentMonth, targetMonth) / 10) * 10,
  );
  const shown = useSmoothEstimate(
    { videos, weekly, currentMonth, targetMonth, ceiling },
    root,
  );
  const progress = (shown.videos - 1) / 49;
  const chartWidth = compact ? 400 : 800;
  const left = compact ? 42 : 50;
  const right = compact ? 370 : 750;
  const y = (hours: number) => 190 - (hours / shown.ceiling) * 160;
  const currentY = y(shown.currentMonth),
    targetY = y(shown.targetMonth);
  return (
    <div
      ref={root}
      className="time-calculator m-reveal"
      aria-labelledby={`${id}-title`}
    >
      <div className="calculator-top">
        <label htmlFor={`${id}-videos`}>Videos a week</label>
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
            aria-valuetext={`${videos} videos per week`}
            type="range"
            min="1"
            max="50"
            step="1"
            value={videos}
            onChange={(e) => setVideos(Number(e.target.value))}
          />
        </div>
        <div className="range-scale" aria-hidden="true">
          {[1, 10, 20, 30, 40, 50].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
      <h3 id={`${id}-title`}>Your editing hours</h3>
      <svg
        className="time-chart"
        viewBox={`0 0 ${chartWidth} 240`}
        data-compact={compact}
        role="img"
        aria-label={`Estimated hours over four weeks: ${format(currentMonth)} without EditAI, ${format(targetMonth)} for EditAI Users (illustrative).`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--m-ice)" stopOpacity=".9" />
            <stop offset="1" stopColor="var(--m-lavender)" stopOpacity=".2" />
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
              y="219"
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
        <path
          className="chart-current"
          d={`M${left} 190 L${right} ${currentY}`}
        />
        <path
          className="chart-target"
          d={`M${left} 190 L${right} ${targetY}`}
        />
        <circle cx={left} cy="190" r="3" fill="var(--m-ink)" />
        <circle
          cx={right}
          cy={currentY}
          r="4"
          fill="var(--m-paper)"
          stroke="#657381"
          strokeWidth="1.5"
        />
        <circle
          className="chart-target-dot"
          cx={right}
          cy={targetY}
          r="4"
          fill="var(--m-control)"
        />
        <g
          className="chart-end-label"
          transform={`translate(${right - 112} ${Math.max(4, currentY - 24)})`}
        >
          <rect width="105" height="18" rx="9" fill="var(--m-surface)" />
          <text x="52.5" y="12" textAnchor="middle">
            Without EditAI
          </text>
        </g>
        <g
          className="chart-end-label"
          transform={`translate(${right - 95} ${Math.abs(targetY - currentY) < 30 ? Math.min(193, targetY + 7) : targetY - 24})`}
        >
          <rect width="88" height="18" rx="9" fill="var(--m-ice)" />
          <text x="44" y="12" textAnchor="middle">
            EditAI Users
          </text>
        </g>
        {targetY - currentY > 48 && (
          <text
            className="chart-difference"
            x={right - 20}
            y={(currentY + targetY) / 2 + 4}
            textAnchor="end"
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
        Illustrative estimate: {videos} × {current} min without EditAI vs{" "}
        {videos} × {target} min with EditAI. Assumptions are configurable; this
        is not a measured EditAI user result. Monthly estimates use four weeks.
        Actual editing time varies.
      </p>
    </div>
  );
}
