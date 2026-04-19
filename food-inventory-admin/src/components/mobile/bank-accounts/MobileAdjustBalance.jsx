import { useState } from 'react';
import { motion } from 'framer-motion';
import MobileActionSheet from '../MobileActionSheet.jsx';
import AnimatedNumber from '../primitives/AnimatedNumber.jsx';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { SPRING } from '@/lib/motion';

function formatCurrency(n, currency) {
  const sym = currency === 'VES' ? 'Bs' : '$';
  return `${sym} ${Math.abs(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MobileAdjustBalance({ open, onClose, account, onSuccess }) {
  const [type, setType] = useState('increase');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const newBalance = type === 'increase'
    ? (account?.currentBalance || 0) + numAmount
    : (account?.currentBalance || 0) - numAmount;

  const handleSubmit = async () => {
    if (!amount || numAmount <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    if (!reason.trim()) {
      toast.error('Debe proporcionar una razón para el ajuste');
      return;
    }

    setSaving(true);
    try {
      await fetchApi(`/bank-accounts/${account._id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, reason: reason.trim(), type }),
      });
      haptics.success();
      toast.success('Saldo ajustado correctamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Error al ajustar saldo', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setType('increase');
    setAmount('');
    setReason('');
    onClose();
  };

  if (!account) return null;

  const masked = account.accountNumber?.slice(-4) || '----';

  return (
    <MobileActionSheet
      open={open}
      onClose={handleClose}
      title="Ajustar saldo"
      footer={
        <button
          onClick={handleSubmit}
          disabled={saving || !amount || numAmount <= 0 || !reason.trim()}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? 'Ajustando...' : 'Confirmar ajuste'}
        </button>
      }
    >
      <div className="px-4 pb-4 space-y-5">
        {/* Account info */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{account.bankName}</span> · ****{masked}
          <br />
          Saldo actual: <span className="font-semibold text-foreground">{formatCurrency(account.currentBalance, account.currency)}</span>
        </div>

        {/* Type toggle */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
          <div className="flex gap-2">
            {[
              { value: 'increase', label: '+ Ingreso' },
              { value: 'decrease', label: '- Egreso' },
            ].map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => { haptics.tap(); setType(opt.value); }}
                whileTap={{ scale: 1.05 }}
                transition={SPRING.snappy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  type === opt.value
                    ? opt.value === 'increase'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-destructive/15 border-destructive/40 text-destructive'
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Monto</label>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-muted rounded-xl px-4 py-3 text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Razón</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Depósito de cliente"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Live balance preview */}
        <div className={`text-center py-3 rounded-xl border ${
          type === 'increase'
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-destructive/5 border-destructive/20'
        }`}>
          <span className="text-xs text-muted-foreground block mb-1">Nuevo saldo</span>
          <AnimatedNumber
            value={newBalance}
            format={(n) => formatCurrency(n, account.currency)}
            className={`text-xl font-bold tabular-nums ${
              type === 'increase' ? 'text-emerald-400' : 'text-destructive'
            }`}
          />
        </div>
      </div>
    </MobileActionSheet>
  );
}
