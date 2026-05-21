import { useEffect, useState } from 'react';
import { Receipt, DollarSign, AlertTriangle, Clock, MessageCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useEduTuition } from '@/hooks/use-edu-tuition';
import { listItem, STAGGER } from '@/lib/motion';
import { useReducedMotionSafe } from '@/hooks/use-reduced-motion-safe';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';

const STATUS_OPTIONS = [
  { key: '',        label: 'Todos' },
  { key: 'pending', label: 'Pendiente' },
  { key: 'paid',    label: 'Pagado' },
  { key: 'overdue', label: 'Vencido' },
];

const STATUS_STYLES = {
  pending: { label: 'Pendiente', bg: 'rgb(245 158 11 / 0.1)',  color: '#f59e0b' },
  paid:    { label: 'Pagado',    bg: 'rgb(16 185 129 / 0.1)',  color: '#10b981' },
  overdue: { label: 'Vencido',   bg: 'rgb(239 68 68 / 0.1)',   color: '#ef4444' },
};

function SummaryCard({ label, value, color, icon: Icon, prefix }) {
  return (
    <div className="bg-card p-4" style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon size={14} strokeWidth={1.5} style={{ color }} />
        </div>
        <p className="text-[11px] text-muted-foreground/60 font-medium">{label}</p>
      </div>
      <p className="text-[22px] font-extrabold tabular-nums" style={{ color }}>
        {prefix}
        <AnimatedNumber value={Number(value)} format={n => n.toFixed(2)} />
      </p>
    </div>
  );
}

function PayModal({ fee, onConfirm, onCancel }) {
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState(fee?.amount ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.5)' }}>
      <div className="bg-card w-full max-w-sm p-6 space-y-4"
        style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-raised)' }}>
        <h3 className="text-[16px] font-bold">Registrar pago</h3>
        <p className="text-[13px] text-muted-foreground/80">
          {fee?.studentName} · {fee?.type} {fee?.period}
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium mb-1 block">Monto</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-medium mb-1 block">Método</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px]">
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 text-[13px] font-medium border border-border rounded-xl">
            Cancelar
          </button>
          <button type="button" onClick={() => onConfirm({ amount: Number(amount), method })}
            className="flex-1 py-2.5 text-[13px] font-semibold text-primary-foreground rounded-xl"
            style={{ background: 'var(--gradient-primary)' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TuitionManagement() {
  const { fees, summary, loading, load, registerPayment, exempt } = useEduTuition();
  const { v: rv } = useReducedMotionSafe();
  const [statusFilter, setStatusFilter] = useState('');
  const [payTarget, setPayTarget] = useState(null);

  useEffect(() => { load(statusFilter ? { status: statusFilter } : {}); }, [load, statusFilter]);

  const handlePay = async ({ amount, method }) => {
    try {
      await registerPayment(payTarget._id, { amount, method });
      toast.success('Pago registrado');
      setPayTarget(null);
      haptics.tap();
      load(statusFilter ? { status: statusFilter } : {});
    } catch {
      toast.error('Error al registrar pago');
    }
  };

  const handleExempt = async (fee) => {
    try {
      await exempt(fee._id, 'Exoneración manual');
      toast.success('Cuota exonerada');
      load(statusFilter ? { status: statusFilter } : {});
    } catch {
      toast.error('Error al exonerar');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--glass-subtle)' }}>
          <Receipt size={20} strokeWidth={1.5} className="text-primary" />
        </div>
        <h1 className="text-[20px] font-bold">Cuotas y Matrículas</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total recaudado" value={summary?.collected ?? 0} color="#10b981" icon={CheckCircle2} prefix="$" />
        <SummaryCard label="Pendiente de cobro" value={summary?.pending ?? 0} color="#f59e0b" icon={Clock} prefix="$" />
        <SummaryCard label="Vencido" value={summary?.overdue ?? 0} color="#ef4444" icon={AlertTriangle} prefix="$" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => { haptics.tap(); setStatusFilter(opt.key); }}
            className="px-3 py-1.5 text-[12px] font-semibold transition-all"
            style={{
              borderRadius: 'var(--mobile-radius-full)',
              background: statusFilter === opt.key ? 'var(--gradient-primary)' : 'var(--glass-subtle)',
              color: statusFilter === opt.key ? 'white' : 'var(--muted-foreground)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-[var(--mobile-radius-xl)]" />
          ))}
        </div>
      ) : fees.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/60">
          <Receipt size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">No hay cuotas para este filtro</p>
        </div>
      ) : (
        <motion.div
          className="bg-card overflow-hidden"
          style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-rest)' }}
          initial="initial" animate="animate" variants={rv(STAGGER(0.025))}
        >
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-border text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
            <span>Alumno / Salón</span>
            <span>Tipo / Período</span>
            <span>Monto</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {fees.map(fee => {
            const st = STATUS_STYLES[fee.status] || STATUS_STYLES.pending;
            return (
              <motion.div
                key={fee._id}
                variants={listItem}
                className="flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{fee.studentName}</p>
                  <p className="text-[11px] text-muted-foreground/60 truncate">{fee.classroomLabel}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[12px] font-medium">{fee.type}</p>
                  <p className="text-[11px] text-muted-foreground/60">{fee.period}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-bold tabular-nums">${Number(fee.amount ?? 0).toFixed(2)}</p>
                  {fee.dueDate && (
                    <p className="text-[10px] text-muted-foreground/50">
                      Vence {format(new Date(fee.dueDate), 'dd/MM/yy')}
                    </p>
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {fee.status !== 'paid' && (
                    <button type="button" onClick={() => { haptics.tap(); setPayTarget(fee); }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors" title="Registrar pago">
                      <DollarSign size={14} strokeWidth={1.5} className="text-emerald-500" />
                    </button>
                  )}
                  <button type="button" onClick={() => haptics.tap()}
                    className="p-2 rounded-lg hover:bg-muted transition-colors" title="Enviar WhatsApp">
                    <MessageCircle size={14} strokeWidth={1.5} className="text-blue-500" />
                  </button>
                  {fee.status !== 'paid' && (
                    <button type="button" onClick={() => { haptics.tap(); handleExempt(fee); }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors" title="Exonerar">
                      <CheckCircle2 size={14} strokeWidth={1.5} className="text-amber-500" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {payTarget && (
        <PayModal fee={payTarget} onConfirm={handlePay} onCancel={() => setPayTarget(null)} />
      )}
    </div>
  );
}
