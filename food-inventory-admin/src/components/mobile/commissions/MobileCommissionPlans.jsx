import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Percent, DollarSign, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { toast } from '@/lib/toast';
import {
  getCommissionPlans,
  createCommissionPlan,
  updateCommissionPlan,
  deleteCommissionPlan,
} from '@/lib/api';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileActionSheet from '../MobileActionSheet.jsx';

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'percentage',
  defaultPercentage: '',
  fixedAmount: '',
  minOrderAmount: '',
  maxCommissionAmount: '',
  isActive: true,
};

export default function MobileCommissionPlans({ onClose }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState(null); // null = closed, 'new' = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [processing, setProcessing] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCommissionPlans();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setPlans(list);
    } catch {
      toast.error('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditPlan('new');
  };

  const openEdit = (plan) => {
    setForm({
      name: plan.name || '',
      description: plan.description || '',
      type: plan.type || 'percentage',
      defaultPercentage: plan.defaultPercentage ?? '',
      fixedAmount: plan.fixedAmount ?? '',
      minOrderAmount: plan.minOrderAmount ?? '',
      maxCommissionAmount: plan.maxCommissionAmount ?? '',
      isActive: plan.isActive ?? true,
    });
    setEditPlan(plan);
  };

  const handleToggleActive = useCallback(async (plan) => {
    try {
      await updateCommissionPlan(plan._id, { isActive: !plan.isActive });
      setPlans((prev) => prev.map((p) => p._id === plan._id ? { ...p, isActive: !p.isActive } : p));
      haptics.tap();
      toast.success(plan.isActive ? 'Plan desactivado' : 'Plan activado');
    } catch {
      toast.error('Error al actualizar');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name) { toast.error('Nombre es requerido'); return; }
    setProcessing(true);
    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      defaultPercentage: form.type === 'percentage' ? parseFloat(form.defaultPercentage) || 0 : undefined,
      fixedAmount: form.type === 'fixed_amount' ? parseFloat(form.fixedAmount) || 0 : undefined,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
      maxCommissionAmount: form.maxCommissionAmount ? parseFloat(form.maxCommissionAmount) : undefined,
      isActive: form.isActive,
    };
    try {
      if (editPlan === 'new') {
        await createCommissionPlan(payload);
        toast.success('Plan creado');
      } else {
        await updateCommissionPlan(editPlan._id, payload);
        toast.success('Plan actualizado');
      }
      haptics.success();
      setEditPlan(null);
      loadPlans();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setProcessing(false);
    }
  }, [form, editPlan, loadPlans]);

  const handleDelete = useCallback(async () => {
    if (!editPlan || editPlan === 'new') return;
    setProcessing(true);
    try {
      await deleteCommissionPlan(editPlan._id);
      haptics.success();
      toast.success('Plan eliminado');
      setEditPlan(null);
      loadPlans();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setProcessing(false);
    }
  }, [editPlan, loadPlans]);

  return (
    <div className="px-4 pb-4 space-y-3">
      {loading ? (
        <MobileListSkeleton count={3} height="h-16" />
      ) : plans.length === 0 ? (
        <MobileEmptyState icon={Percent} title="Sin planes" description="Crea tu primer plan de comisión" />
      ) : (
        <motion.div className="space-y-2" variants={STAGGER(0.03)} initial="initial" animate="animate">
          {plans.map((plan) => (
            <motion.div
              key={plan._id}
              variants={listItem}
              className="bg-card rounded-[var(--mobile-radius-md,0.75rem)] border border-border p-3"
            >
              <button
                type="button"
                onClick={() => { haptics.tap(); openEdit(plan); }}
                className="w-full text-left no-tap-highlight"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{plan.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full',
                        plan.type === 'percentage'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400',
                      )}>
                        {plan.type === 'percentage' ? (
                          <><Percent size={10} className="inline mr-0.5" />{plan.defaultPercentage}%</>
                        ) : (
                          <><DollarSign size={10} className="inline mr-0.5" />{plan.fixedAmount}</>
                        )}
                      </span>
                    </div>
                  </div>
                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(plan); }}
                    className={cn(
                      'w-10 h-6 rounded-full relative transition-colors shrink-0 ml-2',
                      plan.isActive ? 'bg-emerald-500' : 'bg-muted',
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                      plan.isActive ? 'translate-x-5' : 'translate-x-1',
                    )} />
                  </button>
                </div>
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}

      <button
        type="button"
        onClick={() => { haptics.tap(); openCreate(); }}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight active:scale-[0.98] transition-transform"
      >
        + Nuevo plan
      </button>

      {/* Create/Edit sheet */}
      <MobileActionSheet
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
        title={editPlan === 'new' ? 'Nuevo plan' : 'Editar plan'}
      >
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: 30% servicios"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setForm((f) => ({ ...f, type: 'percentage' }))}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-medium no-tap-highlight transition-colors text-center',
                  form.type === 'percentage' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                Porcentaje
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, type: 'fixed_amount' }))}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-medium no-tap-highlight transition-colors text-center',
                  form.type === 'fixed_amount' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                Monto fijo
              </button>
            </div>
          </div>

          {form.type === 'percentage' ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Porcentaje (%)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.defaultPercentage}
                onChange={(e) => setForm((f) => ({ ...f, defaultPercentage: e.target.value }))}
                placeholder="30"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto fijo ($)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.fixedAmount}
                onChange={(e) => setForm((f) => ({ ...f, fixedAmount: e.target.value }))}
                placeholder="5.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Monto mínimo de orden (opcional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.minOrderAmount}
              onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tope máximo de comisión (opcional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.maxCommissionAmount}
              onChange={(e) => setForm((f) => ({ ...f, maxCommissionAmount: e.target.value }))}
              placeholder="500.00"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Plan activo</span>
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={processing}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 no-tap-highlight"
          >
            {processing ? 'Guardando...' : (editPlan === 'new' ? 'Crear plan' : 'Guardar cambios')}
          </button>

          {editPlan && editPlan !== 'new' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={processing}
              className="w-full py-2.5 rounded-xl bg-red-600/15 text-red-400 text-sm font-medium disabled:opacity-50 no-tap-highlight flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} /> Eliminar plan
            </button>
          )}
        </div>
      </MobileActionSheet>
    </div>
  );
}
