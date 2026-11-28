/** Each star has its own center so hover pulses never shift the icon. */
export function ActionSparkles() {
  return (
    <svg
      className="action-sparkles"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        className="action-star action-star-main"
        d="m10.5 3.5 1.7 5.2q.3.8 1.1 1.1l5.2 1.7-5.2 1.7q-.8.3-1.1 1.1l-1.7 5.2-1.7-5.2q-.3-.8-1.1-1.1l-5.2-1.7 5.2-1.7q.8-.3 1.1-1.1z"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="action-star action-star-small"
        d="m20.5 1.5.6 1.9L23 4l-1.9.6-.6 1.9-.6-1.9L18 4l1.9-.6z"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="action-star action-star-small"
        d="m3 17.5.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9L.5 20l1.9-.6z"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
