import { motion } from 'framer-motion';
import { Landmark } from 'lucide-react';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';

function formatCurrency(n, currency) {
  const sym = currency === 'VES' ? 'Bs' : '$';
  return `${sym} ${Math.abs(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskAccount(num) {
  if (!num) return '•••• ----';
  const last4 = num.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

export default function MobileBankAccountCard({ account, isActive }) {
  const typeLabel = account.accountType === 'ahorro' ? 'Ahorro' : 'Corriente';
  const isUSD = account.currency === 'USD';
  const methods = account.acceptedPaymentMethods || [];
  const maxChips = 3;
  const overflow = methods.length > maxChips ? methods.length - maxChips : 0;

  return (
    <motion.div
      animate={{ scale: isActive ? 1 : 0.92, opacity: isActive ? 1 : 0.5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className={`w-[85vw] max-w-[340px] flex-shrink-0 rounded-2xl p-5 relative overflow-hidden select-none ${
        isUSD
          ? 'bg-gradient-to-br from-emerald-950/80 via-emerald-900/50 to-card border border-emerald-500/20'
          : 'bg-gradient-to-br from-blue-950/80 via-blue-900/50 to-card border border-blue-500/20'
      }`}
      style={{ minHeight: 190 }}
    >
      {/* Bank chip */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isUSD ? 'bg-emerald-500/15' : 'bg-blue-500/15'
          }`}>
            <Landmark size={16} className={isUSD ? 'text-emerald-400' : 'text-blue-400'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{account.bankName}</p>
            <p className="text-[11px] text-muted-foreground">{typeLabel} · {account.currency}</p>
          </div>
        </div>
        <span className={`w-2 h-2 rounded-full ${account.isActive !== false ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
      </div>

      {/* Account number */}
      <p className="text-[13px] text-muted-foreground font-mono tracking-widest mb-4">
        {maskAccount(account.accountNumber)}
      </p>

      {/* Balance */}
      <div className="mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">Saldo disponible</span>
        <AnimatedNumber
          value={account.currentBalance}
          format={(n) => formatCurrency(n, account.currency)}
          className={`text-2xl font-bold tabular-nums ${isUSD ? 'text-emerald-400' : 'text-blue-400'}`}
        />
      </div>

      {/* Payment methods */}
      {methods.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {methods.slice(0, maxChips).map((m) => (
            <span key={m} className="text-[10px] bg-white/5 text-muted-foreground rounded-full px-2 py-0.5 border border-white/5">
              {m}
            </span>
          ))}
          {overflow > 0 && (
            <span className="text-[10px] bg-white/5 text-muted-foreground rounded-full px-2 py-0.5 border border-white/5">
              +{overflow}
            </span>
          )}
        </div>
      )}

      {/* Holder name subtle */}
      {account.accountHolderName && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">{account.accountHolderName}</p>
      )}
    </motion.div>
  );
}
