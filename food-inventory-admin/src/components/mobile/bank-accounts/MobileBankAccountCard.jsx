import { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, ChevronDown, ArrowUpDown, List, Edit3, Trash2 } from 'lucide-react';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import haptics from '@/lib/haptics';
import { DUR, EASE, SPRING, listItem } from '@/lib/motion';

function formatCurrency(n, currency) {
  const sym = currency === 'VES' ? 'Bs' : '$';
  return `${sym} ${Math.abs(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskAccount(num) {
  if (!num) return '****----';
  return `****${num.slice(-4)}`;
}

const MobileBankAccountCard = forwardRef(function MobileBankAccountCard(
  { account, onAdjust, onMovements, onEdit, onDelete },
  ref,
) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = account.accountType === 'ahorro' ? 'Ahorro' : 'Corriente';
  const isUSD = account.currency === 'USD';
  const methods = account.acceptedPaymentMethods || [];
  const maxChips = 3;
  const overflow = methods.length > maxChips ? methods.length - maxChips : 0;

  const toggle = () => {
    haptics.tap();
    setExpanded((p) => !p);
  };

  return (
    <motion.div
      ref={ref}
      variants={listItem}
      className="bg-card rounded-[var(--mobile-radius-lg,12px)] border border-border overflow-hidden"
    >
      {/* Compact — always visible */}
      <button onClick={toggle} className="w-full text-left p-4 no-tap-highlight">
        <div className="flex items-start gap-3">
          {/* Bank icon */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isUSD ? 'bg-emerald-500/10' : 'bg-blue-500/10'
            }`}
          >
            <Landmark size={16} className={isUSD ? 'text-emerald-400' : 'text-blue-400'} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">{account.bankName}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  account.isActive !== false ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {typeLabel} · {maskAccount(account.accountNumber)}
            </p>
          </div>

          {/* Balance + chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            <AnimatedNumber
              value={account.currentBalance}
              format={(n) => formatCurrency(n, account.currency)}
              className={`text-base font-bold tabular-nums ${isUSD ? 'text-emerald-400' : 'text-blue-400'}`}
            />
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: DUR.base, ease: EASE.out }}
            >
              <ChevronDown size={14} className="text-muted-foreground" />
            </motion.div>
          </div>
        </div>

        {/* Payment method chips */}
        {methods.length > 0 && (
          <div className="flex items-center gap-1 mt-2.5 pl-12">
            {methods.slice(0, maxChips).map((m) => (
              <span
                key={m}
                className="text-[11px] bg-muted text-muted-foreground rounded-full px-2 py-0.5"
              >
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
      </button>

      {/* Expanded details + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
              {/* Detail rows */}
              <div className="space-y-2 pt-3">
                {account.accountHolderName && (
                  <DetailRow label="Titular" value={account.accountHolderName} />
                )}
                {account.branchName && (
                  <DetailRow label="Sucursal" value={account.branchName} />
                )}
                {account.swiftCode && (
                  <DetailRow label="SWIFT" value={account.swiftCode} />
                )}
                {account.notes && (
                  <DetailRow label="Notas" value={account.notes} />
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <ActionBtn
                  icon={ArrowUpDown}
                  label="Ajustar"
                  onClick={() => { haptics.tap(); onAdjust?.(account); }}
                />
                <ActionBtn
                  icon={List}
                  label="Movimientos"
                  onClick={() => { haptics.tap(); onMovements?.(account); }}
                />
                <ActionBtn
                  icon={Edit3}
                  label="Editar"
                  onClick={() => { haptics.tap(); onEdit?.(account); }}
                />
                <ActionBtn
                  icon={Trash2}
                  label="Eliminar"
                  className="text-destructive"
                  onClick={() => { haptics.tap(); onDelete?.(account); }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[65%] truncate">{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-muted/50 border border-border active:bg-muted transition-colors text-muted-foreground ${className}`}
    >
      <Icon size={16} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

export default MobileBankAccountCard;
