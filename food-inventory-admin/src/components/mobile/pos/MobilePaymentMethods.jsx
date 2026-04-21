import { motion } from 'framer-motion';
import { Banknote, Smartphone, CreditCard, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { STAGGER, listItem, tapScaleStrong } from '@/lib/motion';

// ─── Shared constants ────────────────────────────────────────────────────────
export const METHOD_LABELS = {
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  transferencia_usd: 'Transf. USD',
  transferencia_ves: 'Transf. VES',
  zelle_usd: 'Zelle',
  pago_movil_ves: 'Pago móvil',
  pos_ves: 'POS',
  tarjeta_ves: 'Tarjeta',
  otros_usd: 'Otro USD',
  otros_ves: 'Otro VES',
};

export const METHOD_ICONS = {
  efectivo_usd: Banknote, efectivo_ves: Banknote,
  transferencia_usd: ArrowRight, transferencia_ves: ArrowRight,
  zelle_usd: Zap, pago_movil_ves: Smartphone,
  pos_ves: CreditCard, tarjeta_ves: CreditCard,
  otros_usd: Banknote, otros_ves: Banknote,
};

export const VES_METHODS = new Set([
  'efectivo_ves', 'transferencia_ves', 'pago_movil_ves', 'pos_ves', 'tarjeta_ves', 'otros_ves',
]);

// ─── Component ───────────────────────────────────────────────────────────────
export default function MobilePaymentMethods({
  methods,
  selected,
  onSelect,
  preferredMethod,
  clientMethod,
  clientHint,
  effectiveTotal,
  onQuickPay,
  submitting,
  hasPrefilledAmount,
}) {
  const smartMethod = clientMethod || preferredMethod;
  const showMegaButton = hasPrefilledAmount && smartMethod;

  // ─── Mega-button + secondary chips (smart default exists) ────────────────
  if (showMegaButton) {
    const Icon = METHOD_ICONS[smartMethod] || Banknote;
    const label = METHOD_LABELS[smartMethod] || smartMethod;
    const secondaryMethods = methods.filter((m) => m.id !== smartMethod);

    return (
      <div className="space-y-3">
        {clientHint && (
          <p className="text-xs text-muted-foreground text-center">{clientHint}</p>
        )}

        {/* Mega-button — one-tap payment */}
        <motion.button
          type="button"
          disabled={submitting}
          whileTap={tapScaleStrong}
          onClick={() => { haptics.select(); onQuickPay(smartMethod); }}
          className="w-full h-16 flex items-center justify-between rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white px-5 font-bold text-base no-tap-highlight disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <Icon size={22} />
            <span>Cobrar con {label}</span>
          </div>
          <span className="text-lg tabular-nums">${effectiveTotal.toFixed(2)}</span>
        </motion.button>

        {/* Secondary method chips — horizontal scroll */}
        {secondaryMethods.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {secondaryMethods.map((m) => {
              const MIcon = METHOD_ICONS[m.id] || Banknote;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => { haptics.select(); onQuickPay(m.id); }}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium no-tap-highlight active:scale-95 transition-transform disabled:opacity-50"
                >
                  <MIcon size={12} />
                  <span>{m.name || METHOD_LABELS[m.id] || m.id}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Standard grid (no smart default or manual amount) ───────────────────
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Método de pago</p>
      <motion.div
        className="grid grid-cols-2 gap-2"
        variants={STAGGER(0.03)}
        initial="initial"
        animate="animate"
      >
        {methods.slice(0, 8).map((m) => {
          const Icon = METHOD_ICONS[m.id] || Banknote;
          return (
            <motion.button
              key={m.id}
              type="button"
              variants={listItem}
              onClick={() => { haptics.select(); onSelect(m.id); }}
              className={cn(
                'flex items-center gap-2 rounded-[var(--mobile-radius-md)] border px-3 py-2.5 text-sm font-medium no-tap-highlight transition-colors',
                selected === m.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border',
              )}
            >
              <Icon size={14} />
              <span className="truncate">{m.name || METHOD_LABELS[m.id] || m.id}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
