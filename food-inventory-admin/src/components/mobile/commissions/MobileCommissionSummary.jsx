import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, listItem, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  getCommissionsReport,
  getPendingCommissions,
  getCommissionRecords,
  getEmployeeCommissionsSummary,
} from '@/lib/api';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';

// ─── Period helpers for comparison ──────────────────────────────────────────
function getPreviousDateRange(dateRange) {
  const start = new Date(dateRange.startDate);
  const end = new Date(dateRange.endDate);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { startDate: prevStart.toISOString(), endDate: prevEnd.toISOString() };
}

export default function MobileCommissionSummary({
  period,
  onPeriodChange,
  dateRange,
  periods,
  onNavigateToTab,
}) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [prevTotal, setPrevTotal] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, pendingRes, prevRes] = await Promise.allSettled([
        getCommissionsReport({ startDate: dateRange.startDate, endDate: dateRange.endDate, groupBy: 'employee' }),
        getCommissionRecords({ status: 'pending', limit: 100 }),
        getCommissionsReport({ ...getPreviousDateRange(dateRange), groupBy: 'employee' }),
      ]);

      if (reportRes.status === 'fulfilled') {
        setReportData(reportRes.value?.data || reportRes.value || null);
      }
      if (pendingRes.status === 'fulfilled') {
        const list = Array.isArray(pendingRes.value?.data) ? pendingRes.value.data : Array.isArray(pendingRes.value) ? pendingRes.value : [];
        setPendingCount(list.length);
        setPendingRecords(list);
      }
      if (prevRes.status === 'fulfilled') {
        const prevData = prevRes.value?.data || prevRes.value;
        if (Array.isArray(prevData)) {
          setPrevTotal(prevData.reduce((s, e) => s + (e.totalCommission || e.total || 0), 0));
        } else if (prevData?.totalCommission != null) {
          setPrevTotal(prevData.totalCommission);
        }
      }
    } catch {
      toast.error('Error al cargar resumen');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Derived data ──────────────────────────────────────────────────────
  const employees = useMemo(() => {
    if (!reportData) return [];
    const list = Array.isArray(reportData) ? reportData : (reportData.employees || reportData.byEmployee || []);
    return list
      .map((e) => ({
        employeeId: e.employeeId || e._id,
        employeeName: e.employeeName || e.name || 'Profesional',
        total: e.totalCommissions || e.totalCommission || e.total || 0,
        count: e.ordersCount || e.serviceCount || e.count || e.recordCount || 0,
        rate: e.averageCommission || e.averageRate || e.rate || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [reportData]);

  const currentTotal = useMemo(
    () => employees.reduce((s, e) => s + e.total, 0),
    [employees],
  );
  const approvedCount = useMemo(
    () => employees.reduce((s, e) => s + e.count, 0),
    [employees],
  );
  const maxTotal = useMemo(() => Math.max(...employees.map((e) => e.total), 1), [employees]);

  const pctChange = prevTotal != null && prevTotal > 0
    ? ((currentTotal - prevTotal) / prevTotal * 100)
    : null;

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ─── Employee detail sheet ─────────────────────────────────────────────
  const openDetail = useCallback(async (emp) => {
    setDetailEmployee(emp);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await getEmployeeCommissionsSummary(emp.employeeId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setDetailData(res?.data || res);
    } catch {
      toast.error('Error al cargar detalle');
    } finally {
      setDetailLoading(false);
    }
  }, [dateRange]);

  if (loading) return <MobileListSkeleton count={5} height="h-20" className="pt-4 px-4" />;

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Period selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => { haptics.tap(); onPeriodChange(p.id); }}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap no-tap-highlight transition-colors',
              period === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {employees.length === 0 ? (
        <MobileEmptyState
          icon={DollarSign}
          title="Sin comisiones"
          description="No hay datos de comisiones para este período"
        />
      ) : (
        <>
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, ease: EASE.out }}
            className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-4"
          >
            <p className="text-xs text-muted-foreground mb-1">Total comisiones</p>
            <AnimatedNumber
              value={currentTotal}
              format={(n) => fmt(n)}
              className="text-2xl font-bold text-foreground"
            />
            <div className="flex items-center gap-3 mt-2">
              {pctChange != null && (
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  pctChange >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}>
                  {pctChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}% vs período anterior
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {approvedCount} aprobadas · {pendingCount} pendientes
            </p>
          </motion.div>

          {/* Per-professional breakdown */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Por profesional
            </p>
            <motion.div
              className="space-y-2"
              variants={STAGGER(0.05, 0.1)}
              initial="initial"
              animate="animate"
            >
              {employees.map((emp, i) => (
                <motion.button
                  key={emp.employeeId}
                  variants={listItem}
                  type="button"
                  onClick={() => { haptics.tap(); openDetail(emp); }}
                  className="w-full text-left bg-card rounded-[var(--mobile-radius-md,0.75rem)] border border-border p-3 no-tap-highlight active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold truncate flex-1">{emp.employeeName}</p>
                    <span className="text-sm font-bold shrink-0 ml-2">{fmt(emp.total)}</span>
                  </div>
                  {/* Proportional bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-1.5">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(emp.total / maxTotal) * 100}%` }}
                      transition={{ ...SPRING.soft, delay: i * 0.05 }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {emp.count} servicios{emp.rate ? ` · ${emp.rate}%` : ''}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Pending alert */}
          {pendingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR.base, ease: EASE.out, delay: 0.2 }}
              className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-400">
                    Pendientes por aprobar ({pendingCount})
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Total: {fmt(pendingRecords.reduce((s, r) => s + (r.commissionAmount || r.totalCommission || 0), 0))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { haptics.tap(); onNavigateToTab('comisiones', { filter: 'pending' }); }}
                  className="flex items-center gap-0.5 text-xs font-medium text-primary no-tap-highlight"
                >
                  Ver todas <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Employee detail sheet */}
      <MobileActionSheet
        open={!!detailEmployee}
        onClose={() => setDetailEmployee(null)}
        title={detailEmployee?.employeeName || 'Detalle'}
      >
        <div className="px-4 pb-4">
          {detailLoading ? (
            <MobileListSkeleton count={3} height="h-12" />
          ) : detailData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{fmt(detailData.totalCommission || detailData.total || detailEmployee?.total)}</p>
                  <p className="text-[10px] text-muted-foreground">Total comisiones</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{detailData.recordCount || detailData.count || detailEmployee?.count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Servicios</p>
                </div>
              </div>
              {detailData.averageCommission != null && (
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{fmt(detailData.averageCommission)}</p>
                  <p className="text-[10px] text-muted-foreground">Promedio por servicio</p>
                </div>
              )}
              {Array.isArray(detailData.records) && detailData.records.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Últimos registros</p>
                  <div className="space-y-1.5">
                    {detailData.records.slice(0, 5).map((r) => (
                      <div key={r._id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground truncate flex-1">{r.orderRef || r.serviceName || 'Servicio'}</span>
                        <span className="font-medium ml-2">{fmt(r.totalCommission || r.commissionCalculated)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos disponibles</p>
          )}
        </div>
      </MobileActionSheet>
    </div>
  );
}
