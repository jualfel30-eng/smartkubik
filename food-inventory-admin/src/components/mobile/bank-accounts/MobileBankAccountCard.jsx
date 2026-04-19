import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Landmark, Wallet, Edit3, Trash2, ArrowUpDown, List } from 'lucide-react';
import haptics from '@/lib/haptics';
import { DUR } from '@/lib/motion';

function formatCurrency(n, currency) {
  const sym = currency === 'VES' ? 'Bs' : '$';
  return `${sym} ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskAccount(num) {
  if (!num) return '----';
  return `****${num.slice(-4)}`;
}

export default function MobileBankAccountCard({
  account,
  onAdjust,
  onMovements,
  onEdit,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);

  const typeLabel = account.accountType === 'ahorro' ? 'Ahorro' : 'Corriente';
  const masked = maskAccount(account.accountNumber);
  const methods = account.acceptedPaymentMethods || [];
  const maxChips = 3;
  const overflow = methods.length > maxChips ? methods.length - maxChips : 0;

  return (
    <motion.div
      layout
      className="bg-card rounded-[var(--mobile-radius-lg,12px)] border border-border overflow-hidden"
    >
      {/* Compact view — always visible */}
      <button
        onClick={() => { haptics.tap(); setExpanded(!expanded); }}
        className="w-full text-left p-4 no-tap-highlight active:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Landmark size={14} className="text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold truncate">{account.bankName}</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${account.isActive !== false ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {typeLabel} · {masked}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold tabular-nums ${account.currency === 'USD' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {formatCurrency(account.currentBalance, account.currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">{account.currency}</p>
          </div>
        </div>

        {/* Payment method chips */}
        {methods.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {methods.slice(0, maxChips).map((m) => (
              <span key={m} className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                {m}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                +{overflow}
              </span>
            )}
          </div>
        )}

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: DUR.base }}
          className="flex justify-center mt-1"
        >
          <ChevronDown size={14} className="text-muted-foreground/50" />
        </motion.div>
      </button>

      {/* Expanded details + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
              {/* Details */}
              {account.accountHolderName && (
                <Detail label="Titular" value={account.accountHolderName} />
              )}
              {account.branchName && (
                <Detail label="Sucursal" value={account.branchName} />
              )}
              {account.swiftCode && (
                <Detail label="SWIFT" value={account.swiftCode} />
              )}
              {account.notes && (
                <Detail label="Notas" value={account.notes} />
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <ActionBtn icon={ArrowUpDown} label="Ajustar" onClick={() => { haptics.tap(); onAdjust(account); }} />
                <ActionBtn icon={List} label="Movim." onClick={() => { haptics.tap(); onMovements(account); }} />
                <ActionBtn icon={Edit3} label="Editar" onClick={() => { haptics.tap(); onEdit(account); }} />
                <ActionBtn icon={Trash2} label="Eliminar" onClick={() => { haptics.tap(); onDelete(account); }} className="text-destructive" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex flex-col items-center gap-1 py-2 rounded-lg bg-muted/50 active:bg-muted transition-colors text-muted-foreground ${className}`}
    >
      <Icon size={16} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
