"use client";

/** Recolor aligned artwork at runtime; preserve its alpha, dark face and gloss. */
export function EvaThemeFilter({
  id,
  colors,
}: {
  id: string;
  colors: readonly string[];
}) {
  return (
    <svg
      width="0"
      height="0"
      className="eva-theme-definitions"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width="1"
          height="1"
          filterUnits="objectBoundingBox"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          {/* Follow the original material colors, not a single gradient over the canvas.
              Cyan headphones/scissors, violet body, and peach highlights keep their roles. */}
          <feFlood floodColor={colors[1]} result="violet" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -3 2 1 0 0"
            result="cyanMask"
          />
          <feFlood floodColor={colors[0]} result="cyan" />
          <feComposite in="cyan" in2="cyanMask" operator="in" result="cool" />
          <feComposite in="cool" in2="violet" operator="over" result="base" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 5 0 -5 0 0"
            result="warmMask"
          />
          <feFlood floodColor={colors[2]} result="warm" />
          <feComposite
            in="warm"
            in2="warmMask"
            operator="in"
            result="highlight"
          />
          <feComposite
            in="highlight"
            in2="base"
            operator="over"
            result="palette"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="saturate"
            values="0"
            result="light"
          />
          <feComponentTransfer in="light" result="shade">
            <feFuncR type="linear" slope="0.5" intercept="0.6" />
            <feFuncG type="linear" slope="0.5" intercept="0.6" />
            <feFuncB type="linear" slope="0.5" intercept="0.6" />
          </feComponentTransfer>
          <feBlend in="palette" in2="shade" mode="multiply" result="material" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -1.063 -3.576 -0.361 0 3"
            result="darkMask"
          />
          <feComposite
            in="SourceGraphic"
            in2="darkMask"
            operator="in"
            result="details"
          />
          <feComposite
            in="details"
            in2="material"
            operator="over"
            result="colored"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0.4252 1.4304 0.1444 0 -1.4"
            result="glossMask"
          />
          <feFlood floodColor="white" result="shine" />
          <feComposite
            in="shine"
            in2="glossMask"
            operator="in"
            result="gloss"
          />
          <feComposite in="gloss" in2="colored" operator="over" result="lit" />
          <feComponentTransfer in="lit" result="opaque">
            <feFuncA type="table" tableValues="1 1" />
          </feComponentTransfer>
          <feComposite in="opaque" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
