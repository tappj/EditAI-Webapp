"use client";
import { useId, useState } from "react";
import { marketingContent as content } from "@/lib/marketing/content";

export function TimeCalculator() {
  const id = useId();
  const [videos, setVideos] = useState(content.calculator.videos);
  const [current, setCurrent] = useState(content.calculator.currentMinutes);
  const [target, setTarget] = useState(content.calculator.targetMinutes);
  const weekly = Math.max(0, ((current - target) * videos) / 60);
  const currentMonth = ((current * videos) / 60) * 4;
  const targetMonth = ((target * videos) / 60) * 4;
  const ceiling = Math.max(
    10,
    Math.ceil(Math.max(currentMonth, targetMonth) / 10) * 10,
  );
  const y = (hours: number) => 190 - (hours / ceiling) * 160;
  const format = (n: number) =>
    new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n);
  const bounds = (value: string) =>
    Math.max(0, Math.min(480, Number(value) || 0));
  return (
    <div className="time-calculator m-reveal" aria-labelledby={`${id}-title`}>
      <div className="calculator-top">
        <label htmlFor={`${id}-videos`}>
          Videos a week{" "}
          <output htmlFor={`${id}-videos`}>{videos} videos</output>
        </label>
        <input
          id={`${id}-videos`}
          aria-label="Videos a week"
          type="range"
          min="1"
          max="50"
          value={videos}
          onChange={(e) => setVideos(Number(e.target.value))}
        />
        <div className="range-scale" aria-hidden="true">
          <span>1</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
        </div>
      </div>
      <div className="calculator-inputs">
        <label>
          Current minutes per video
          <input
            type="number"
            min="0"
            max="480"
            value={current}
            onChange={(e) => setCurrent(bounds(e.target.value))}
          />
        </label>
        <label>
          Target minutes per video
          <input
            type="number"
            min="0"
            max="480"
            value={target}
            onChange={(e) => setTarget(bounds(e.target.value))}
          />
        </label>
        <span>
          Your inputs.
          <br />
          Your planning estimate.
        </span>
      </div>
      <h3 id={`${id}-title`}>Your editing hours</h3>
      <svg
        className="time-chart"
        viewBox="0 0 800 240"
        role="img"
        aria-label={`Estimated hours over four weeks: ${format(currentMonth)} current, ${format(targetMonth)} at your target.`}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00d9f0" stopOpacity=".2" />
            <stop offset="1" stopColor="#00d9f0" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((step) => (
          <g key={step}>
            <line
              x1="50"
              x2="750"
              y1={190 - step * 40}
              y2={190 - step * 40}
              stroke="#cdd9e5"
              strokeDasharray="2 5"
            />
            <text x="0" y={194 - step * 40}>
              {format((ceiling / 4) * step)} hrs
            </text>
            <text
              x={50 + step * 175}
              y="219"
              textAnchor={step === 0 ? "start" : "middle"}
            >
              {step ? `Week ${step}` : "Now"}
            </text>
          </g>
        ))}
        <path
          d={`M50 190 L750 ${y(currentMonth)} L750 ${y(targetMonth)} Z`}
          fill={`url(#${id}-fill)`}
        />
        <path className="chart-current" d={`M50 190 L750 ${y(currentMonth)}`} />
        <path className="chart-target" d={`M50 190 L750 ${y(targetMonth)}`} />
        <circle cx="50" cy="190" r="3" fill="#526780" />
        <circle
          cx="750"
          cy={y(currentMonth)}
          r="4"
          fill="#f7faff"
          stroke="#526780"
        />
        <circle cx="750" cy={y(targetMonth)} r="4" fill="#00d9f0" />
      </svg>
      <div className="chart-legend">
        <span>
          <i />
          Current workflow
        </span>
        <span>
          <i />
          Your target
        </span>
      </div>
      <div className="calculator-results" aria-live="polite">
        <div>
          <strong>
            {format(weekly)} <span>hrs</span>
          </strong>
          <p>potentially freed up each week</p>
        </div>
        <div>
          <strong>
            {format(weekly * 4)} <span>hrs</span>
          </strong>
          <p>over four weeks at your target</p>
        </div>
      </div>
      <p className="calculator-disclaimer">
        A planning estimate based only on your inputs. Your target is
        hypothetical, not a measured EditAI result. Actual editing time varies.
      </p>
    </div>
  );
}
