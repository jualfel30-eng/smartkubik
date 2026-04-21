import { Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { METHOD_LABELS, METHOD_ICONS, VES_METHODS } from './MobilePaymentMethods.jsx';
import { Banknote } from 'lucide-react';

// ─── Single payment line ─────────────────────────────────────────────────────
function MixedLine({ line, methods, exchangeRate, onChange, onRemove, canRemove }) {
  const isVes = VES_METHODS.has(line.method);
  const vesAmount = isVes && exchangeRate ? Number(line.amount || 0) * exchangeRate : null;

  return (
    <div className="rounded-[var(--mobile-radius-md)] border border-border bg-muted/40 p-3 space-y-2">
      {/* Method selector — horizontal scroll */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1 mr-2">
          {methods.slice(0, 6).map((m) => {
            const Icon = METHOD_ICONS[m.id] || Banknote;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ ...line, method: m.id })}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border no-tap-highlight transition-colors',
                  line.method === m.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border',
                )}
              >
                <Icon size={11} />
                {m.name || METHOD_LABELS[m.id] || m.id}
              </button>
            );
          })}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="tap-target no-tap-highlight text-destructive shrink-0">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Amount input */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">$</span>
        <input
          type="number"
          inputMode="decimal"
          value={line.amount}
          onChange={(e) => onChange({ ...line, amount: e.target.value })}
          className="flex-1 rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-base font-semibold tabular-nums"
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      {/* VES equivalent */}
      {vesAmount > 0 && (
        <p className="text-xs text-muted-foreground pl-5">
          ≈ Bs. {vesAmount.toFixed(2)}
        </p>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MobileMixedPayment({
  lines,
  methods,
  effectiveTotal,
  exchangeRate,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}) {
  const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = Math.abs(linesTotal - effectiveTotal) < 0.005;

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <MixedLine
          key={i}
          line={line}
          methods={methods}
          exchangeRate={exchangeRate}
          onChange={(updated) => onUpdateLine(i, updated)}
          onRemove={() => onRemoveLine(i)}
          canRemove={lines.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={onAddLine}
        className="w-full rounded-[var(--mobile-radius-md)] border border-dashed border-border py-3 text-sm font-medium text-primary no-tap-highlight flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Agregar método
      </button>

      {/* Balance indicator */}
      <div
        className={cn(
          'rounded-[var(--mobile-radius-md)] px-3 py-2 text-sm flex items-center justify-between',
          balanced
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        )}
      >
        <span className="flex items-center gap-1.5">
          {balanced && <Check size={14} />}
          {balanced ? 'Cuadra' : 'Suma de pagos'}
        </span>
        <span className="font-bold tabular-nums">
          ${linesTotal.toFixed(2)} / ${effectiveTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
