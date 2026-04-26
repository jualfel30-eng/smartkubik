/**
 * InventoryKPICards.jsx
 * 5 clickable KPI cards with animated numbers for the inventory module header.
 */
import { motion } from 'framer-motion';
import { Package, DollarSign, AlertTriangle, ClipboardList, ArrowRightLeft } from 'lucide-react';
import { STAGGER, scaleIn } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const cards = [
  { key: 'products', icon: Package, label: 'Productos', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'value', icon: DollarSign, label: 'Valor Total', color: 'text-emerald-400', bg: 'bg-emerald-500/10', prefix: '$' },
  { key: 'lowStock', icon: AlertTriangle, label: 'Stock Bajo', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'pendingPOs', icon: ClipboardList, label: 'Pedidos Pend.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'inTransit', icon: ArrowRightLeft, label: 'En Tránsito', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
];

function KPICardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export default function InventoryKPICards({ data, loading, onCardClick }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => <KPICardSkeleton key={c.key} />)}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-5 gap-3"
      variants={STAGGER(0.06)}
      initial="initial"
      animate="animate"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const value = data?.[card.key] ?? 0;
        const formatFn = card.prefix
          ? (n) => `${card.prefix}${n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : (n) => Math.round(n).toLocaleString('es-VE');

        return (
          <motion.button
            key={card.key}
            variants={scaleIn}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onCardClick?.(card.key)}
            className={cn(
              'rounded-xl border bg-card p-4 text-left transition-colors',
              'hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              'cursor-pointer'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('rounded-lg p-1.5', card.bg)}>
                <Icon className={cn('h-4 w-4', card.color)} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              <AnimatedNumber value={value} format={formatFn} />
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
