import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, listItem, DUR, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  getGoals,
  createGoal,
  fetchApi,
} from '@/lib/api';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileBonusPanel from './MobileBonusPanel.jsx';

const GOAL_TYPES = [
  { id: 'sales_amount', label: 'Monto ventas' },
  { id: 'transaction_count', label: 'Cantidad citas' },
  { id: 'average_ticket', label: 'Ticket promedio' },
];

const GOAL_PERIODS = [
  { id: 'monthly', label: 'Mensual' },
  { id: 'quarterly', label: 'Trimestral' },
];

function getProgressColor(pct) {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getDaysRemaining(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

function getGoalPeriodDates(periodType) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (periodType === 'quarterly') {
    const qStart = new Date(y, Math.floor(m / 3) * 3, 1);
    const qEnd = new Date(y, Math.floor(m / 3) * 3 + 3, 0, 23, 59, 59);
    return { startDate: qStart.toISOString(), endDate: qEnd.toISOString() };
  }
  return { startDate: new Date(y, m, 1).toISOString(), endDate: new Date(y, m + 1, 0, 23, 59, 59).toISOString() };
}

export default function MobileGoalsPanel({ dateRange }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    type: 'sales_amount',
    targetAmount: '',
    periodType: 'monthly',
    bonusAmount: '',
    autoAwardBonus: true,
  });

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGoals({ status: 'active', limit: 50 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setGoals(list);
    } catch {
      toast.error('Error al cargar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfessionals = useCallback(async () => {
    try {
      const res = await fetchApi('/professionals');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setProfessionals(list);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const handleCreate = useCallback(async () => {
    if (!form.employeeId || !form.targetAmount) {
      toast.error('Completa los campos requeridos');
      return;
    }
    setProcessing(true);
    try {
      const prof = professionals.find((p) => p._id === form.employeeId);
      const dates = getGoalPeriodDates(form.periodType);
      await createGoal({
        employeeId: form.employeeId,
        employeeName: prof?.name || prof?.firstName || '',
        name: form.name || `Meta ${form.periodType === 'monthly' ? 'mensual' : 'trimestral'}`,
        type: form.type,
        targetAmount: parseFloat(form.targetAmount),
        periodType: form.periodType,
        startDate: dates.startDate,
        endDate: dates.endDate,
        bonusAmount: form.bonusAmount ? parseFloat(form.bonusAmount) : 0,
        autoAwardBonus: form.autoAwardBonus,
      });
      haptics.success();
      toast.success('Meta creada');
      setCreateOpen(false);
      setForm({ employeeId: '', name: '', type: 'sales_amount', targetAmount: '', periodType: 'monthly', bonusAmount: '', autoAwardBonus: true });
      loadGoals();
    } catch {
      toast.error('Error al crear meta');
    } finally {
      setProcessing(false);
    }
  }, [form, professionals, loadGoals]);

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtInt = (n) => (n || 0).toLocaleString();

  return (
    <div className="px-4 py-3 space-y-5">
      {/* Active goals */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Metas activas
        </p>
        {loading ? (
          <MobileListSkeleton count={3} height="h-24" />
        ) : goals.length === 0 ? (
          <MobileEmptyState icon={Target} title="Sin metas activas" description="Crea una meta para tu equipo" />
        ) : (
          <motion.div className="space-y-2" variants={STAGGER(0.05, 0.08)} initial="initial" animate="animate">
            {goals.map((goal, i) => {
              const pct = goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount || 0) / goal.targetAmount * 100))
                : 0;
              const days = getDaysRemaining(goal.endDate);
              const isAmount = goal.type === 'sales_amount' || goal.type === 'average_ticket';
              const goalType = GOAL_TYPES.find((t) => t.id === goal.type);

              return (
                <motion.div
                  key={goal._id}
                  variants={listItem}
                  className="bg-card rounded-[var(--mobile-radius-md,0.75rem)] border border-border p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{goal.employeeName || 'Profesional'}</p>
                      <p className="text-[11px] text-muted-foreground">{goal.name || goalType?.label || 'Meta'}</p>
                    </div>
                    {goal.status === 'achieved' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 ml-2">
                        Cumplida
                      </span>
                    )}
                  </div>

                  {/* Progress label */}
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {isAmount ? fmt(goal.currentAmount) : fmtInt(goal.currentAmount)} / {isAmount ? fmt(goal.targetAmount) : fmtInt(goal.targetAmount)}
                    </span>
                    <AnimatedNumber
                      value={pct}
                      format={(n) => `${Math.round(n)}%`}
                      className={cn(
                        'text-xs font-bold',
                        pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400',
                      )}
                    />
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                    <motion.div
                      className={cn('h-full rounded-full', getProgressColor(pct))}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ ...SPRING.soft, delay: i * 0.05 }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    {goal.bonusAmount > 0 && (
                      <span>Bono: {fmt(goal.bonusAmount)} si cumple</span>
                    )}
                    {days != null && (
                      <span className="ml-auto">{days === 0 ? 'Hoy vence' : `Quedan ${days} días`}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Bonuses section */}
      <MobileBonusPanel dateRange={dateRange} />

      {/* Sticky footer with create buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => { haptics.tap(); setCreateOpen(true); loadProfessionals(); }}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform"
        >
          + Nueva meta
        </button>
      </div>

      {/* Create goal sheet */}
      <MobileActionSheet open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva meta">
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Profesional</label>
            <select
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Seleccionar...</option>
              {professionals.map((p) => (
                <option key={p._id} value={p._id}>{p.name || `${p.firstName} ${p.lastName}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de meta</label>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setForm((f) => ({ ...f, type: t.id }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium no-tap-highlight transition-colors',
                    form.type === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Objetivo</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              placeholder={form.type === 'transaction_count' ? '60' : '3500.00'}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Período</label>
            <div className="flex gap-1.5">
              {GOAL_PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm((f) => ({ ...f, periodType: p.id }))}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium no-tap-highlight transition-colors text-center',
                    form.periodType === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bono por cumplimiento</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.bonusAmount}
              onChange={(e) => setForm((f) => ({ ...f, bonusAmount: e.target.value }))}
              placeholder="150.00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoAwardBonus}
              onChange={(e) => setForm((f) => ({ ...f, autoAwardBonus: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Otorgar bono automáticamente al cumplir</span>
          </label>

          <button
            type="button"
            onClick={handleCreate}
            disabled={processing}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 no-tap-highlight"
          >
            {processing ? 'Creando...' : 'Crear meta'}
          </button>
        </div>
      </MobileActionSheet>
    </div>
  );
}
