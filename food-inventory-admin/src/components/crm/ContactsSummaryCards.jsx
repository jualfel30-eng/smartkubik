import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { SPRING, STAGGER, listItem } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';
import { Users, UserPlus, AlertTriangle, Building } from 'lucide-react';
import { computeInactiveDays } from './AtRiskBadge.jsx';

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
      accent: null,
    },
    {
      key: 'new',
      icon: UserPlus,
      label: 'Nuevos este mes',
      value: stats.newThisMonth,
      accent: 'text-emerald-600',
      onClick: onFilterNew,
      active: activeFilter === 'new',
    },
    {
      key: 'atRisk',
      icon: AlertTriangle,
      label: 'En riesgo',
      value: stats.atRisk,
      accent: stats.atRisk > 0 ? 'text-amber-600' : null,
      onClick: onFilterAtRisk,
      active: activeFilter === 'atRisk',
    },
    {
      key: 'suppliers',
      icon: Building,
      label: 'Proveedores',
      value: stats.suppliers,
      accent: null,
    },
  ];

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={STAGGER(0.05)}
      initial="initial"
      animate="animate"
    >
      {cards.map((card) => (
        <motion.div key={card.key} variants={listItem}>
          <Card
            className={`border-none bg-muted/40 shadow-none transition-all ${
              card.onClick ? 'cursor-pointer hover:bg-muted/60' : ''
            } ${card.active ? 'ring-2 ring-primary' : ''}`}
            onClick={card.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.accent || 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${card.accent || 'text-foreground'}`}>
                <AnimatedNumber value={card.value} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
