import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, AlertTriangle, DollarSign, ClipboardList, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { STAGGER, fadeUp, listItem } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import ActiveNowStrip from './ActiveNowStrip';
import PayrollChecklist from './PayrollChecklist';
import HRClockFAB from './HRClockFAB';
import { HRNavigation } from './HRNavigation';
import { toast } from 'sonner';

function KpiChip({ icon: Icon, label, value, color, onClick }) {
  return (
    <motion.button
      variants={listItem}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-full border bg-background shadow-sm shrink-0 text-sm font-medium hover:shadow-md transition-shadow"
      style={{ borderColor: color }}
    >
      <Icon size={14} style={{ color }} />
      <span style={{ color }}>{label}</span>
      <span className="font-bold">
        <AnimatedNumber value={value} format={n => Math.round(n).toString()} />
      </span>
    </motion.button>
  );
}

function UrgencyCard({ icon, title, count, actionLabel, route, color, onAction, loading }) {
  const navigate = useNavigate();
  const handleAction = (e) => {
    e.stopPropagation();
    if (onAction) onAction();
    else navigate(route);
  };
  return (
    <motion.div variants={fadeUp}>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        style={{ borderLeft: `3px solid ${color}` }}
        onClick={() => navigate(route)}
      >
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div>
              <p className="font-semibold text-sm">{title}</p>
              {count !== null && <p className="text-xs text-muted-foreground">{count} pendiente{count !== 1 ? 's' : ''}</p>}
            </div>
          </div>
          <button
            disabled={loading}
            onClick={handleAction}
            className="text-xs font-medium px-3 py-1 rounded-full border hover:bg-muted transition-colors shrink-0 flex items-center gap-1 disabled:opacity-60"
            style={{ borderColor: color, color }}
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {actionLabel}
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function buildChecklistKeys({ runs = [], absences = [], commissions = [] }) {
  const keys = [];
  const activeRun = runs.find(r => ['draft', 'calculated', 'posted'].includes(r.status));
  if (!activeRun) keys.push('structuresAssigned');
  const pendingAbsences = absences.filter(a => a.status === 'pending');
  if (pendingAbsences.length === 0) keys.push('absencesResolved');
  const pendingComm = commissions.filter(c => c.status === 'pending');
  if (pendingComm.length === 0) keys.push('bonusesApproved');
  if (activeRun?.status === 'calculated' || activeRun?.status === 'posted') keys.push('runCalculated');
  if (activeRun?.status === 'paid') {
    keys.push('runCalculated');
    keys.push('runPaid');
  }
  return keys;
}

export default function HRTodayHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    activeShifts: [],
    pendingAbsences: [],
    pendingCommissions: [],
    activeRuns: [],
    employees: [],
  });
  const [loading, setLoading] = useState(true);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const load = async () => {
      try {
        const [rosterRes, absencesRes, commissionsRes, runsRes, empRes] = await Promise.allSettled([
          fetchApi(`/shifts/roster?start=${today}&end=${today}`),
          fetchApi('/payroll/absences/requests?status=pending&limit=20'),
          fetchApi('/commissions/records/pending'),
          fetchApi('/payroll/runs?status=draft,calculated,posted&limit=3'),
          fetchApi('/employees?limit=100'),
        ]);

        const get = (res) => (res.status === 'fulfilled' && res.value?.data) ? res.value.data : [];

        const allShifts = get(rosterRes);
        const activeShifts = Array.isArray(allShifts)
          ? allShifts.filter(s => s.status === 'in-progress')
          : [];

        setData({
          activeShifts,
          pendingAbsences: get(absencesRes),
          pendingCommissions: get(commissionsRes),
          activeRuns: get(runsRes),
          employees: get(empRes),
        });
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const checklistKeys = buildChecklistKeys({
    runs: data.activeRuns,
    absences: data.pendingAbsences,
    commissions: data.pendingCommissions,
  });

  const handleAutoGenerate = useCallback(async () => {
    setGeneratingDraft(true);
    try {
      const res = await fetchApi('/payroll/runs/generate-draft', { method: 'POST' });
      const created = res?.created ?? true;
      toast.success(created ? 'Borrador listo — revísalo en Nóminas' : 'Ya hay un borrador activo para este período');
      if (created) {
        setData(prev => ({ ...prev, activeRuns: [res.data] }));
      }
      navigate('/payroll/runs');
    } catch (err) {
      toast.error(err.message || 'No se pudo generar el borrador');
    } finally {
      setGeneratingDraft(false);
    }
  }, [navigate]);

  const nextRun = data.activeRuns[0];
  const daysToPayroll = nextRun?.periodEnd
    ? Math.ceil((new Date(nextRun.periodEnd) - Date.now()) / 86400000)
    : null;

  const urgencies = [
    data.pendingAbsences.length > 0 && {
      icon: '🚫',
      title: 'Ausencias pendientes de revisar',
      count: data.pendingAbsences.length,
      actionLabel: 'Revisar',
      route: '/hr/asistencia',
      color: 'var(--destructive, #ef4444)',
    },
    data.activeRuns.length === 0 && {
      icon: '💰',
      title: `Preparar nómina de ${new Date().toLocaleString('es', { month: 'long' })}`,
      count: null,
      actionLabel: 'Preparar ahora',
      route: '/payroll/runs',
      color: 'var(--primary)',
      onAction: handleAutoGenerate,
      loading: generatingDraft,
    },
    daysToPayroll !== null && daysToPayroll <= 14 && {
      icon: '💰',
      title: `Nómina vence en ${daysToPayroll} día${daysToPayroll !== 1 ? 's' : ''}`,
      count: 1,
      actionLabel: 'Continuar',
      route: '/payroll/runs',
      color: daysToPayroll <= 3 ? 'var(--destructive, #ef4444)' : 'var(--warning, #f59e0b)',
    },
    data.pendingCommissions.length > 0 && {
      icon: '📋',
      title: 'Comisiones por aprobar',
      count: data.pendingCommissions.length,
      actionLabel: 'Aprobar',
      route: '/commissions',
      color: 'var(--primary)',
    },
  ].filter(Boolean);

  const greeting = user?.name ? `Buenos días, ${user.name.split(' ')[0]}` : 'Buenos días';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <HRNavigation />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{greeting}</h1>
          <p className="text-sm text-muted-foreground capitalize">{todayLabel}</p>
        </div>
        <HRClockFAB />
      </div>

      {/* KPI chips — mobile horizontal scroll */}
      <motion.div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        variants={STAGGER(0.05)}
        initial="initial"
        animate="animate"
      >
        <KpiChip
          icon={Users}
          label="En turno"
          value={data.activeShifts.length}
          color="var(--success, #22c55e)"
          onClick={() => navigate('/hr/asistencia')}
        />
        <KpiChip
          icon={AlertTriangle}
          label="Ausencias"
          value={data.pendingAbsences.length}
          color="var(--destructive, #ef4444)"
          onClick={() => navigate('/hr/asistencia')}
        />
        {daysToPayroll !== null && (
          <KpiChip
            icon={DollarSign}
            label="Días para nómina"
            value={daysToPayroll}
            color="var(--warning, #f59e0b)"
            onClick={() => navigate('/payroll/runs')}
          />
        )}
        <KpiChip
          icon={ClipboardList}
          label="Comisiones"
          value={data.pendingCommissions.length}
          color="var(--primary)"
          onClick={() => navigate('/commissions')}
        />
      </motion.div>

      {/* Desktop two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Active now */}
          {!loading && <ActiveNowStrip shifts={data.activeShifts} />}

          {/* Urgency cards */}
          {urgencies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Acciones urgentes
              </p>
              <motion.div
                className="space-y-2"
                variants={STAGGER(0.08)}
                initial="initial"
                animate="animate"
              >
                {urgencies.map((u, i) => (
                  <UrgencyCard key={i} {...u} />
                ))}
              </motion.div>
            </div>
          )}
        </div>

        {/* Right column — payroll checklist */}
        <Card>
          <CardContent className="p-4">
            <PayrollChecklist
              completedKeys={checklistKeys}
              period={nextRun?.name || ''}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
