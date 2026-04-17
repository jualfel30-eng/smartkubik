import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle, Ban, DollarSign, RefreshCw,
  ShieldCheck, User, Inbox, ChevronLeft, ChevronDown, Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNoShowFlaggedCustomers, resetCustomerNoShow, fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';

function SeverityBadge({ customer }) {
  if (customer.isBlacklisted) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30 flex items-center gap-1">
        <Ban size={10} /> Bloqueado
      </span>
    );
  }
  if (customer.requiresDeposit) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1">
        <DollarSign size={10} /> Requiere deposito
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-600 border-yellow-500/30 flex items-center gap-1">
      <AlertTriangle size={10} /> Advertencia
    </span>
  );
}

function NoShowCard({ customer, onReset }) {
  const name = customer.name || customer.companyName || 'Sin nombre';
  const phone = customer.whatsappNumber || customer.phone || '';
  const count = customer.noShowCount || 0;
  const lastDate = customer.lastNoShowDate
    ? formatDistanceToNow(new Date(customer.lastNoShowDate), { locale: es, addSuffix: true })
    : null;

  return (
    <motion.div
      variants={listItem}
      layout
      className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            customer.isBlacklisted ? 'bg-red-500/10' : 'bg-amber-500/10',
          )}>
            <User size={18} className={customer.isBlacklisted ? 'text-red-400' : 'text-amber-500'} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
          </div>
        </div>
        <SeverityBadge customer={customer} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{count} no-show{count !== 1 ? 's' : ''}</span>
        {lastDate && <span>Ultimo: {lastDate}</span>}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => { haptics.tap(); onReset(customer); }}
        className="w-full py-2.5 rounded-[var(--mobile-radius-md)] border border-border text-xs font-medium no-tap-highlight flex items-center justify-center gap-1.5 active:bg-muted transition-colors"
      >
        <ShieldCheck size={14} /> Resetear penalizaciones
      </motion.button>
    </motion.div>
  );
}

// ─── Policy config toggle ────────────────────────────────────────────
const DEFAULTS = { enabled: false, warningThreshold: 2, depositThreshold: 3, blacklistThreshold: 5, resetAfterDays: 180, depositPercentage: 50 };

function PolicyConfig() {
  const [open, setOpen] = useState(false);
  const [policy, setPolicy] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetchApi('/storefront')
      .then((res) => {
        const p = res?.data?.beautyConfig?.noShowPolicy || res?.beautyConfig?.noShowPolicy;
        if (p) setPolicy({ ...DEFAULTS, ...p });
      })
      .catch(() => {});
  }, []);

  const update = (key, val) => {
    setPolicy((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      await fetchApi('/storefront/config', {
        method: 'POST',
        body: JSON.stringify({ beautyConfig: { noShowPolicy: policy } }),
      });
      haptics.success();
      toast.success('Politica guardada');
      setDirty(false);
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const NumberField = ({ label, value, field, min = 1, max = 999 }) => (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => update(field, Number(e.target.value) || min)}
        className="w-16 text-center bg-muted rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );

  return (
    <div className="bg-card rounded-[var(--mobile-radius-lg)] border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 no-tap-highlight active:bg-muted transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Settings2 size={16} className="text-muted-foreground" />
          Configurar politica
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={SPRING.snappy}>
          <ChevronDown size={16} className="text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING.soft}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Activar penalizaciones</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={policy.enabled}
                  onClick={() => update('enabled', !policy.enabled)}
                  className={cn(
                    'w-11 h-6 rounded-full relative transition-colors',
                    policy.enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                >
                  <motion.span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ left: policy.enabled ? 22 : 2 }}
                    transition={SPRING.snappy}
                  />
                </button>
              </div>

              {policy.enabled && (
                <>
                  <NumberField label="Advertencia despues de" value={policy.warningThreshold} field="warningThreshold" />
                  <NumberField label="Deposito despues de" value={policy.depositThreshold} field="depositThreshold" />
                  <NumberField label="Bloquear despues de" value={policy.blacklistThreshold} field="blacklistThreshold" />
                  <NumberField label="Reset despues de (dias)" value={policy.resetAfterDays} field="resetAfterDays" max={365} />
                  <NumberField label="% deposito requerido" value={policy.depositPercentage} field="depositPercentage" max={100} />
                </>
              )}

              {dirty && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={save}
                  disabled={saving}
                  className="w-full py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-xs font-semibold no-tap-highlight disabled:opacity-40"
                >
                  {saving ? 'Guardando...' : 'Guardar politica'}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MobileNoShowPanel({ onBack }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNoShowFlaggedCustomers();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setCustomers(list);
    } catch (err) {
      console.error('No-show load error:', err);
      toast.error('Error al cargar clientes penalizados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = async (customer) => {
    const id = customer._id || customer.id;
    try {
      await resetCustomerNoShow(id);
      haptics.success();
      toast.success(`Penalizaciones de ${customer.name || 'cliente'} reseteadas`);
      setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al resetear');
    }
  };

  const blacklisted = customers.filter((c) => c.isBlacklisted);
  const depositRequired = customers.filter((c) => !c.isBlacklisted && c.requiresDeposit);
  const warned = customers.filter((c) => !c.isBlacklisted && !c.requiresDeposit);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="tap-target no-tap-highlight -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold">Penalizaciones No-Show</h2>
          <p className="text-xs text-muted-foreground">{customers.length} cliente{customers.length !== 1 ? 's' : ''} penalizado{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="tap-target no-tap-highlight text-muted-foreground"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mobile-scroll px-4 py-4 space-y-5 pb-24">
        {/* Policy config */}
        <PolicyConfig />

        {loading && customers.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck size={40} className="text-emerald-500/40 mb-3" />
            <p className="text-sm font-medium">Sin penalizaciones activas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ningun cliente tiene registro de no-shows
            </p>
          </div>
        ) : (
          <>
            {/* Blacklisted */}
            {blacklisted.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <Ban size={12} /> Bloqueados ({blacklisted.length})
                </p>
                <motion.div className="space-y-3" variants={STAGGER(0.05)} initial="initial" animate="animate">
                  {blacklisted.map((c) => (
                    <NoShowCard key={c._id || c.id} customer={c} onReset={handleReset} />
                  ))}
                </motion.div>
              </section>
            )}

            {/* Deposit required */}
            {depositRequired.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <DollarSign size={12} /> Requieren deposito ({depositRequired.length})
                </p>
                <motion.div className="space-y-3" variants={STAGGER(0.05)} initial="initial" animate="animate">
                  {depositRequired.map((c) => (
                    <NoShowCard key={c._id || c.id} customer={c} onReset={handleReset} />
                  ))}
                </motion.div>
              </section>
            )}

            {/* Warned */}
            {warned.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Advertencia ({warned.length})
                </p>
                <motion.div className="space-y-3" variants={STAGGER(0.05)} initial="initial" animate="animate">
                  {warned.map((c) => (
                    <NoShowCard key={c._id || c.id} customer={c} onReset={handleReset} />
                  ))}
                </motion.div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
