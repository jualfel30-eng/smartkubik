import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';

const DEFAULTS = { enabled: false, mode: 'credit', refundPercentage: 0 };

/**
 * Configura qué pasa con el depósito YA pagado cuando se cancela una reserva.
 * Lee/guarda beautyConfig.cancellationPolicy vía /storefront/beauty-config.
 * Ver docs/wiki/features/beauty-cancellation-deposit-policy.md
 */
export default function MobileCancellationPolicyPanel({ onBack }) {
  const [policy, setPolicy] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetchApi('/storefront')
      .then((res) => {
        const p =
          res?.data?.beautyConfig?.cancellationPolicy ||
          res?.beautyConfig?.cancellationPolicy;
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
      const payload = {
        enabled: !!policy.enabled,
        mode: policy.mode === 'refund' ? 'refund' : 'credit',
        refundPercentage:
          policy.mode === 'refund'
            ? Math.min(100, Math.max(0, Number(policy.refundPercentage) || 0))
            : 0,
      };
      await fetchApi('/storefront/beauty-config', {
        method: 'PUT',
        body: JSON.stringify({ cancellationPolicy: payload }),
      });
      haptics.success();
      toast.success('Política guardada');
      setDirty(false);
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const pct = Number(policy.refundPercentage) || 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-2 py-3 flex items-center gap-1">
        <button onClick={onBack} className="p-2 -ml-1 no-tap-highlight" aria-label="Volver">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Política de cancelación</h1>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4 pb-24">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Define qué pasa con el depósito ya pagado cuando una reserva se cancela.
        </p>

        <div className="flex items-center justify-between bg-card rounded-[var(--mobile-radius-lg)] border border-border px-4 py-3">
          <span className="text-sm">Aplicar política al cancelar</span>
          <Toggle on={!!policy.enabled} onClick={() => update('enabled', !policy.enabled)} />
        </div>

        {policy.enabled && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                ¿Qué se hace con el depósito?
              </p>
              <ModeOption
                selected={policy.mode === 'credit'}
                onClick={() => update('mode', 'credit')}
                title="Saldo a favor"
                desc="El cliente conserva el monto como crédito para una próxima reserva."
              />
              <ModeOption
                selected={policy.mode === 'refund'}
                onClick={() => update('mode', 'refund')}
                title="Reembolso / penalización"
                desc="Se devuelve un % al cliente; el resto lo retiene el negocio."
              />
            </div>

            {policy.mode === 'refund' && (
              <div className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">% que se devuelve al cliente</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={policy.refundPercentage}
                    onChange={(e) =>
                      update(
                        'refundPercentage',
                        Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      )
                    }
                    className="w-20 text-center bg-muted rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {pct === 0 &&
                    'El negocio se queda con todo el depósito (penalización total).'}
                  {pct === 100 && 'Se devuelve el depósito completo al cliente.'}
                  {pct > 0 &&
                    pct < 100 &&
                    `Se devuelve ${pct}% al cliente y el negocio retiene ${100 - pct}%.`}
                </p>
              </div>
            )}
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
            className="w-full py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Guardar política'}
          </motion.button>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'w-11 h-6 rounded-full relative transition-colors shrink-0',
        on ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <motion.span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
        animate={{ left: on ? 22 : 2 }}
        transition={SPRING.snappy}
      />
    </button>
  );
}

function ModeOption({ selected, onClick, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-[var(--mobile-radius-lg)] border p-3 no-tap-highlight transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span
          className={cn(
            'w-4 h-4 rounded-full border-2 shrink-0',
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
          )}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{desc}</p>
    </button>
  );
}
