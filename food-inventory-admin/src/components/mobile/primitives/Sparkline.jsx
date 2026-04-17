import { motion } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';

/**
 * Mini sparkline SVG chart.
 * Renders a gradient-filled area + animated stroke line.
 *
 *   <Sparkline values={[10, 25, 18, 30]} color="#22c55e" />
 */
export default function Sparkline({ values = [], color = '#22c55e', width = 80, height = 28 }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const coords = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return [x, y];
  });
  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill={`url(#${gradId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DUR.hero, delay: 0.25, ease: EASE.out }}
      />
      <motion.path
        d={linePath}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: DUR.hero, ease: EASE.out }}
      />
    </svg>
  );
}
