import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SPRING, STAGGER, listItem } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';
import { Users, UserPlus, AlertTriangle, Building } from 'lucide-react';
import { computeInactiveDays } from './AtRiskBadge.jsx';

/**
 * ContactsSummaryCards — Premium glass KPI cards with hover, animated numbers,
 * clickable filters, and trend indicators. Matches DashboardKpiCard styling.
 */
export function ContactsSummaryCards({
  filteredData,
  totalCustomers,
  onFilterAtRisk,
  onFilterNew,
  activeFilter,
}) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let newThisMonth = 0;
    let atRisk = 0;
    let suppliers = 0;

    filteredData.forEach((c) => {
      if (c.createdAt && new Date(c.createdAt) >= monthStart) newThisMonth++;
      const days = computeInactiveDays(c);
      if (days !== null && days >= 30) atRisk++;
      if (c.customerType === 'supplier') suppliers++;
    });

    return { newThisMonth, atRisk, suppliers };
  }, [filteredData]);

  const cards = [
    {
      key: 'total',
      icon: Users,
      label: 'Contactos',
      value: totalCustomers,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-foreground',
    },
    {
      key: 'new',
      icon: UserPlus,
      label: 'Nuevos este mes',
      value: stats.newThisMonth,
      iconBg: 'bg-success/10 dark:bg-success-muted',
      iconColor: 'text-success',
      valueColor: 'text-success',
      onClick: onFilterNew,
      active: activeFilter === 'new',
      trend: stats.newThisMonth > 0 ? `+${stats.newThisMonth}` : null,
      trendColor: 'text-success',
    },
    {
      key: 'atRisk',
      icon: AlertTriangle,
      label: 'En riesgo',
      value: stats.atRisk,
      iconBg: stats.atRisk > 0 ? 'bg-warning/10 dark:bg-warning-muted' : 'bg-muted',
      iconColor: stats.atRisk > 0 ? 'text-warning' : 'text-muted-foreground',
      valueColor: stats.atRisk > 0 ? 'text-warning' : 'text-foreground',
      onClick: onFilterAtRisk,
      active: activeFilter === 'atRisk',
      subtitle: stats.atRisk > 0 ? 'sin actividad 30+ días' : 'todo al día',
    },
    {
      key: 'suppliers',
      icon: Building,
      label: 'Proveedores',
      value: stats.suppliers,
      iconBg: 'bg-info/10 dark:bg-info-muted',
      iconColor: 'text-info',
      valueColor: 'text-foreground',
    },
  ];

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={STAGGER(0.06)}
      initial="initial"
      animate="animate"
    >
      {cards.map((card) => (
        <motion.div
          key={card.key}
          variants={listItem}
          whileHover={card.onClick ? { scale: 1.02 } : undefined}
          whileTap={card.onClick ? { scale: 0.98 } : undefined}
          transition={SPRING.snappy}
        >
          <div
            className={`glass-card-subtle rounded-xl p-4 transition-all ${
              card.onClick ? 'cursor-pointer' : ''
            } ${card.active ? 'ring-2 ring-primary shadow-[var(--glow-primary)]' : ''}`}
            onClick={card.onClick}
          >
            {/* Header: icon + label */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <div className={`h-8 w-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>

            {/* Value */}
            <div className={`text-2xl font-bold ${card.valueColor}`}>
              <AnimatedNumber value={card.value} />
            </div>

            {/* Trend or subtitle */}
            {card.trend && (
              <p className={`text-xs font-medium mt-1 ${card.trendColor}`}>
                {card.trend} este mes
              </p>
            )}
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
