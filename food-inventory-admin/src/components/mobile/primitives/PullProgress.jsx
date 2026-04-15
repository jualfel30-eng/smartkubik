/**
 * Circular pull-to-refresh indicator.
 * `progress` is normalized 0..1+ (>=1 means threshold reached).
 * Once `spinning` is true, the ring rotates as a loading spinner.
 */
export default function PullProgress({ progress = 0, spinning = false, size = 28 }) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(progress, 1));
  const reached = progress >= 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className={spinning ? 'animate-spin' : ''}
      style={{
        transform: spinning ? undefined : `rotate(${-90 + clamped * 360}deg)`,
        transition: spinning ? 'none' : 'transform 80ms linear',
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={spinning ? c * 0.25 : c * (1 - clamped)}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: spinning ? 'none' : 'stroke-dashoffset 80ms linear',
          color: reached ? 'var(--primary)' : undefined,
        }}
      />
    </svg>
  );
}
