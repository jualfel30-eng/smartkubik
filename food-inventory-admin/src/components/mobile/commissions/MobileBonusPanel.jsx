import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGGER, listItem, SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  getBonuses,
  createBonus,
  approveBonus,
  rejectBonus,
  fetchApi,
} from '@/lib/api';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';

const BONUS_TYPES = [
  { id: 'performance', label: 'Desempeño', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'attendance', label: 'Asistencia', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'customer_satisfaction', label: 'Satisfacción', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'goal_achieved', label: 'Meta cumplida', color: 'bg-amber-500/20 text-amber-400' },
];

const STATUS_CFG = {
  pending: { badge: 'bg-amber-500/20 text-amber-400', label: 'Pendiente' },
  approved: { badge: 'bg-emerald-500/20 text-emerald-400', label: 'Aprobado' },
  rejected: { badge: 'bg-red-500/20 text-red-400', label: 'Rechazado' },
};

function getTypeConfig(type) {
  return BONUS_TYPES.find((t) => t.id === type) || { label: type, color: 'bg-muted text-muted-foreground' };
}

export default function MobileBonusPanel({ dateRange }) {
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form state
  const [form, setForm] = useState({ employeeId: '', amount: '', type: 'performance', reason: '' });

  const loadBonuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBonuses({ limit: 50 });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setBonuses(list);
    } catch {
      toast.error('Error al cargar bonos');
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

  useEffect(() => { loadBonuses(); }, [loadBonuses]);

  const pending = bonuses.filter((b) => b.status === 'pending');
  const recent = bonuses.filter((b) => b.status !== 'pending').slice(0, 10);

  const handleApprove = useCallback(async (id) => {
    try {
      await approveBonus(id);
      setBonuses((prev) => prev.map((b) => b._id === id ? { ...b, status: 'approved' } : b));
      haptics.success();
      toast.success('Bono aprobado');
    } catch {
      toast.error('Error al aprobar bono');
    }
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTarget) return;
    setProcessing(true);
    try {
      await rejectBonus(rejectTarget._id, rejectReason || 'Rechazado');
      setBonuses((prev) => prev.map((b) => b._id === rejectTarget._id ? { ...b, status: 'rejected' } : b));
      haptics.error();
      toast.success('Bono rechazado');
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setProcessing(false);
    }
  }, [rejectTarget, rejectReason]);

  const handleCreate = useCallback(async () => {
    if (!form.employeeId || !form.amount) { toast.error('Completa los campos requeridos'); return; }
    setProcessing(true);
    try {
      const prof = professionals.find((p) => p._id === form.employeeId);
      await createBonus({
        employeeId: form.employeeId,
        employeeName: prof?.name || prof?.firstName || '',
        amount: parseFloat(form.amount),
        type: form.type,
        reason: form.reason,
      });
      haptics.success();
      toast.success('Bono creado');
      setCreateOpen(false);
      setForm({ employeeId: '', amount: '', type: 'performance', reason: '' });
      loadBonuses();
    } catch {
      toast.error('Error al crear bono');
    } finally {
      setProcessing(false);
    }
  }, [form, professionals, loadBonuses]);

  const fmt = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <MobileListSkeleton count={3} height="h-16" />;

  return (
    <div className="space-y-4">
      {/* Pending bonuses */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Bonos pendientes ({pending.length})
          </p>
          <motion.div className="space-y-2" variants={STAGGER(0.03)} initial="initial" animate="animate">
            {pending.map((bonus) => {
              const typeCfg = getTypeConfig(bonus.type);
              const statusCfg = STATUS_CFG[bonus.status] || STATUS_CFG.pending;
              return (
                <motion.div
                  key={bonus._id}
                  variants={listItem}
                  className="bg-card rounded-[var(--mobile-radius-md,0.75rem)] border border-border border-l-4 border-l-amber-500 p-3"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{bonus.employeeName || 'Profesional'}</p>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', typeCfg.color)}>
                        {typeCfg.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold shrink-0 ml-2">{fmt(bonus.amount)}</span>
                  </div>
                  {bonus.reason && (
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">"{bonus.reason}"</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(bonus._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm font-medium no-tap-highlight active:scale-95 transition-transform"
                    >
                      <Check size={14} /> Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectTarget(bonus); setRejectReason(''); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium no-tap-highlight active:scale-95 transition-transform"
                    >
                      <X size={14} /> Rechazar
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Recent bonuses */}
      {recent.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Bonos recientes
          </p>
          <div className="space-y-1.5">
            {recent.map((bonus) => {
              const typeCfg = getTypeConfig(bonus.type);
              const statusCfg = STATUS_CFG[bonus.status] || STATUS_CFG.approved;
              return (
                <div key={bonus._id} className="flex items-center justify-between py-2 px-3 bg-card rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{bonus.employeeName}</p>
                    <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', typeCfg.color)}>{typeCfg.label}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold">{fmt(bonus.amount)}</p>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', statusCfg.badge)}>{statusCfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bonuses.length === 0 && (
        <MobileEmptyState icon={Award} title="Sin bonos" description="Crea el primer bono para tu equipo" />
      )}

      {/* Sticky create button */}
      <button
        type="button"
        onClick={() => { haptics.tap(); setCreateOpen(true); loadProfessionals(); }}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform"
      >
        + Nuevo bono
      </button>

      {/* Create bonus sheet */}
      <MobileActionSheet open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo bono">
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
            <div className="flex flex-wrap gap-1.5">
              {BONUS_TYPES.filter((t) => t.id !== 'goal_achieved').map((t) => (
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Motivo</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Describe el motivo del bono..."
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={processing}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 no-tap-highlight"
          >
            {processing ? 'Creando...' : 'Crear bono'}
          </button>
        </div>
      </MobileActionSheet>

      {/* Reject sheet */}
      <MobileActionSheet open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Rechazar bono">
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {rejectTarget?.employeeName} — {fmt(rejectTarget?.amount)}
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo del rechazo..."
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleRejectConfirm}
            disabled={processing || !rejectReason}
            className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50 no-tap-highlight"
          >
            {processing ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </MobileActionSheet>
    </div>
  );
}
