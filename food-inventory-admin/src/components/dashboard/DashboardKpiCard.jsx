import { motion } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { DataHighlight } from '@/components/ui/data-highlight';

function computeTrend(current, previous) {
  if (previous == null || previous === 0) {
    if (current > 0) return { percent: 100, direction: 'up' };
    return null;
  }
  const percent = ((current - previous) / previous) * 100;
  if (percent > 0) return { percent, direction: 'up' };
  if (percent < 0) return { percent: Math.abs(percent), direction: 'down' };
  return { percent: 0, direction: 'neutral' };
}

export default function DashboardKpiCard({
  title,
  icon: Icon,
  value = 0,
  format,
  previousValue,
  goalValue,
  goalLabel,
}) {
  const trend = computeTrend(value, previousValue);
  const goalPercent = goalValue ? Math.min((value / goalValue) * 100, 100) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={SPRING.snappy}
    >
      <Card className="glass-card-subtle h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <DataHighlight as="div" value={value}>
            <AnimatedNumber
              value={value}
              format={format}
              duration={0.6}
              className="text-2xl font-bold"
            />
          </DataHighlight>

          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.direction === 'up' && (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              )}
              {trend.direction === 'down' && (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              {trend.direction === 'neutral' && (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={`text-xs ${
                trend.direction === 'up' ? 'text-emerald-500' :
                trend.direction === 'down' ? 'text-red-500' :
                'text-muted-foreground'
              }`}>
                {trend.percent.toFixed(0)}% vs ayer
              </span>
            </div>
          )}

          {goalPercent != null && (
            <div className="mt-2.5 space-y-1">
              <Progress value={goalPercent} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {goalLabel || 'Meta diaria'}: {goalPercent.toFixed(0)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
