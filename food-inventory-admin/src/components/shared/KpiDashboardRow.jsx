import { motion } from 'framer-motion';
import { STAGGER, fadeUp, SPRING } from '@/lib/motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * KpiDashboardRow — Animated row of KPI summary cards.
 *
 * Usage:
 *   <KpiDashboardRow
 *     items={[
 *       { icon: DollarSign, label: 'Ventas', value: 1250, format: n => `$${n.toFixed(2)}` },
 *       { icon: Users, label: 'Clientes', value: 42 },
 *     ]}
 *   />
 */

function KpiSkeletonRow({ count = 4 }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function KpiDashboardRow({ items = [], loading = false, className }) {
  if (loading) return <KpiSkeletonRow count={items.length || 4} />;

  return (
    <motion.div
      className={cn('grid gap-4 grid-cols-2 lg:grid-cols-4', className)}
      variants={STAGGER(0.04)}
      initial="initial"
      animate="animate"
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div key={item.label || i} variants={fadeUp}>
            <motion.div whileHover={{ scale: 1.02 }} transition={SPRING.snappy}>
              <Card className={cn('glass-card-subtle h-full', item.warning && 'border-amber-500/40')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                  {Icon && <Icon className={cn('h-4 w-4 text-muted-foreground', item.color)} />}
                </CardHeader>
                <CardContent>
                  <AnimatedNumber
                    value={item.value ?? 0}
                    format={item.format}
                    duration={0.6}
                    className="text-2xl font-bold"
                  />
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
