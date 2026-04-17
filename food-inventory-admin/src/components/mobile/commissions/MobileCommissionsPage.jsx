import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, MoreVertical, DollarSign, Target, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { fetchApi, getPendingCommissions } from '@/lib/api';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import ModuleAccessDenied from '@/components/ModuleAccessDenied';
import PullProgress from '../primitives/PullProgress.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileCommissionSummary from './MobileCommissionSummary.jsx';
import MobileCommissionRecords from './MobileCommissionRecords.jsx';
import MobileGoalsPanel from './MobileGoalsPanel.jsx';
import MobileCommissionPlans from './MobileCommissionPlans.jsx';

// ─── Pull-to-refresh ────────────────────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const THRESHOLD = 64;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPulling(true);
      setDistance(Math.min(dy, THRESHOLD * 1.5));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (distance >= THRESHOLD) {
      setDistance(0); setPulling(false); startY.current = null;
      await onRefresh();
    } else {
      setDistance(0); setPulling(false); startY.current = null;
    }
  }, [distance, onRefresh]);

  return { pulling, distance, THRESHOLD, onTouchStart, onTouchMove, onTouchEnd };
}

// ─── Period helpers ──────────────────────────────────────────────────────────
const PERIODS = [
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'last_3_months', label: 'Últimos 3 meses' },
];

function getDateRange(periodId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (periodId) {
    case 'last_month': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'last_3_months': {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    default: {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
  }
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen', label: 'Resumen', icon: DollarSign },
  { id: 'comisiones', label: 'Comisiones', icon: ListChecks },
  { id: 'metas', label: 'Metas', icon: Target },
];

function TabPills({ activeTab, onTabChange, pendingCount }) {
  return (
    <div
      className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-border"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { haptics.tap(); onTabChange(tab.id); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap no-tap-highlight transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            <Icon size={14} />
            {tab.label}
            {tab.id === 'comisiones' && pendingCount > 0 && (
              <motion.span
                key={pendingCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="ml-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5"
              >
                {pendingCount}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function MobileCommissionsPage() {
  const hasAccess = useModuleAccess('commissions');
  const [activeTab, setActiveTab] = useState('resumen');
  const [period, setPeriod] = useState('this_month');
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [initialFilter, setInitialFilter] = useState(null);
  const loadedTabs = useRef({ resumen: false, comisiones: false, metas: false });

  const dateRange = getDateRange(period);

  // Load pending count
  const loadPendingCount = useCallback(async () => {
    try {
      const res = await getPendingCommissions();
      const count = typeof res === 'number' ? res : (res?.count ?? res?.data?.length ?? 0);
      setPendingCount(count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadPendingCount(); }, [loadPendingCount]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    loadedTabs.current = { resumen: false, comisiones: false, metas: false };
    setRefreshKey((k) => k + 1);
    await loadPendingCount();
    setLoading(false);
  }, [loadPendingCount]);

  const pull = usePullToRefresh(handleRefresh);

  const handleNavigateToTab = useCallback((tab, opts) => {
    setActiveTab(tab);
    if (opts?.filter) setInitialFilter(opts.filter);
  }, []);

  const handlePendingCountChange = useCallback((count) => {
    setPendingCount(count);
  }, []);

  if (!hasAccess) return <ModuleAccessDenied moduleName="commissions" />;

  return (
    <div
      className="flex flex-col h-full bg-background"
      onTouchStart={pull.onTouchStart}
      onTouchMove={pull.onTouchMove}
      onTouchEnd={pull.onTouchEnd}
    >
      {pull.pulling && <PullProgress progress={pull.distance / pull.THRESHOLD} />}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold">Comisiones</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-accent transition-colors no-tap-highlight"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={() => { haptics.tap(); setPlansOpen(true); }}
              className="p-2 rounded-lg hover:bg-accent transition-colors no-tap-highlight"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
        <TabPills activeTab={activeTab} onTabChange={setActiveTab} pendingCount={pendingCount} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto mobile-scroll" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}>
        {activeTab === 'resumen' && (
          <MobileCommissionSummary
            key={`resumen-${refreshKey}`}
            period={period}
            onPeriodChange={setPeriod}
            dateRange={dateRange}
            periods={PERIODS}
            onNavigateToTab={handleNavigateToTab}
          />
        )}
        {activeTab === 'comisiones' && (
          <MobileCommissionRecords
            key={`comisiones-${refreshKey}`}
            dateRange={dateRange}
            initialFilter={initialFilter}
            onClearInitialFilter={() => setInitialFilter(null)}
            onPendingCountChange={handlePendingCountChange}
          />
        )}
        {activeTab === 'metas' && (
          <MobileGoalsPanel
            key={`metas-${refreshKey}`}
            dateRange={dateRange}
          />
        )}
      </div>

      {/* Plans bottom sheet */}
      <MobileActionSheet
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        title="Planes de comisión"
        snapPoints={[0.5, 0.92]}
      >
        <MobileCommissionPlans onClose={() => setPlansOpen(false)} />
      </MobileActionSheet>
    </div>
  );
}
