import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { scaleIn } from '@/lib/motion';

export default function HRKpiCard({
  label,
  value,
  previousValue,
  currency,
  icon: Icon,
  statusColor = 'var(--primary)',
  onClick,
  formatFn,
}) {
  const trend =
    previousValue != null && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null;

  const defaultFormat = (n) => {
    if (currency) return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatter = formatFn ?? defaultFormat;

  return (
    <motion.div variants={scaleIn} onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
      <Card
        className="relative overflow-hidden transition-shadow hover:shadow-md"
        style={{ borderLeft: `3px solid ${statusColor}` }}
      >
        <CardHeader className="pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {Icon && <Icon size={18} style={{ color: statusColor }} />}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold tabular-nums">
            <AnimatedNumber value={typeof value === 'number' ? value : 0} format={formatter} />
          </div>
          {trend != null && (
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${
                trend >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend).toFixed(1)}% vs período anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
