import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import PerformanceReport from '../components/PerformanceReport';
import MenuEngineeringWidget from '../components/MenuEngineeringWidget';

import { useVerticalConfig, useVerticalKey } from '../hooks/useVerticalConfig';
import AnimatedPageWrapper from '../components/shared/AnimatedPageWrapper';
import { STAGGER, fadeUp } from '../lib/motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, Download } from 'lucide-react';

// Beauty profiles (barbershop-salon, clinic-spa) tienen su propia página
// /beauty/analytics — aquí solo excluimos los reportes food-service que
// hereda food-service profile por defecto.
const BEAUTY_PROFILES = ['barbershop-salon', 'clinic-spa'];
const BEAUTY_EXCLUDED_REPORTS = ['food-cost', 'menu-engineering'];

// Period presets
const PERIOD_PRESETS = [
  { key: 'today', label: 'Hoy', getDates: () => { const d = new Date(); d.setHours(0,0,0,0); return { from: d.toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) }; } },
  { key: 'week', label: 'Esta semana', getDates: () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const from = new Date(d.setDate(diff)); from.setHours(0,0,0,0); return { from: from.toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) }; } },
  { key: 'month', label: 'Este mes', getDates: () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, to: new Date().toISOString().slice(0,10) }; } },
  { key: 'last-month', label: 'Mes pasado', getDates: () => { const d = new Date(); d.setMonth(d.getMonth()-1); const y = d.getFullYear(); const m = d.getMonth(); return { from: `${y}-${String(m+1).padStart(2,'0')}-01`, to: `${y}-${String(m+1).padStart(2,'0')}-${new Date(y,m+1,0).getDate()}` }; } },
  { key: 'custom', label: 'Personalizado', getDates: null },
];

const ReportsPage = () => {
  const verticalConfig = useVerticalConfig();
  const verticalKey = useVerticalKey();
  const allowedReports = (verticalConfig?.availableReports || []).filter(
    (r) => !BEAUTY_PROFILES.includes(verticalKey) || !BEAUTY_EXCLUDED_REPORTS.includes(r)
  );

  const [activePreset, setActivePreset] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateRange = useMemo(() => {
    if (activePreset === 'custom') {
      return { from: customFrom, to: customTo };
    }
    const preset = PERIOD_PRESETS.find(p => p.key === activePreset);
    return preset?.getDates?.() || { from: '', to: '' };
  }, [activePreset, customFrom, customTo]);

  const isAllowed = (reportKey) => allowedReports.includes(reportKey);

  return (
    <AnimatedPageWrapper className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
      </div>

      {/* Global Date Range Picker */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-1">Periodo:</span>
            {PERIOD_PRESETS.map(preset => (
              <Button
                key={preset.key}
                variant={activePreset === preset.key ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setActivePreset(preset.key)}
              >
                {preset.label}
              </Button>
            ))}
            {activePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 px-2 text-xs border rounded-md bg-background"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 px-2 text-xs border rounded-md bg-background"
                />
              </div>
            )}
            {dateRange.from && dateRange.to && activePreset !== 'custom' && (
              <span className="text-xs text-muted-foreground ml-2">
                {dateRange.from} — {dateRange.to}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <motion.div className="space-y-6" variants={STAGGER(0.08)} initial="initial" animate="animate">

        {/* Menu Engineering */}
        {isAllowed('menu-engineering') && (
          <motion.div variants={fadeUp}>
            <MenuEngineeringWidget dateRange={dateRange} />
          </motion.div>
        )}

        {/* Performance Report */}
        {isAllowed('performance') && (
          <motion.div variants={fadeUp}>
            <PerformanceReport dateRange={dateRange} />
          </motion.div>
        )}

      </motion.div>
    </AnimatedPageWrapper>
  );
};

export default ReportsPage;
