import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { SPRING } from '@/lib/motion';

const STANDARD_PAYMENT_METHODS = [
  'Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia',
  'Pagomóvil', 'Zelle', 'POS',
];

const initialForm = {
  bankName: '',
  accountNumber: '',
  accountType: 'corriente',
  currency: 'USD',
  initialBalance: 0,
  accountHolderName: '',
  branchName: '',
  swiftCode: '',
  notes: '',
  isActive: true,
  acceptedPaymentMethods: [],
};

export default function MobileCreateBankAccount({ open, onClose, account, onSuccess }) {
  const isEdit = !!account;
  const [form, setForm] = useState(initialForm);
  const [customMethod, setCustomMethod] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (account) {
        setForm({
          bankName: account.bankName || '',
          accountNumber: account.accountNumber || '',
          accountType: account.accountType || 'corriente',
          currency: account.currency || 'USD',
          initialBalance: account.initialBalance || 0,
          accountHolderName: account.accountHolderName || '',
          branchName: account.branchName || '',
          swiftCode: account.swiftCode || '',
          notes: account.notes || '',
          isActive: account.isActive !== false,
          acceptedPaymentMethods: account.acceptedPaymentMethods || [],
        });
      } else {
        setForm(initialForm);
      }
      setCustomMethod('');
      setShowCustomInput(false);
    }
  }, [open, account]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleMethod = (method) => {
    haptics.tap();
    const current = form.acceptedPaymentMethods;
    if (current.includes(method)) {
      set('acceptedPaymentMethods', current.filter(m => m !== method));
    } else {
      set('acceptedPaymentMethods', [...current, method]);
    }
  };

  const addCustomMethod = () => {
    const trimmed = customMethod.trim();
    if (!trimmed) return;
    if (form.acceptedPaymentMethods.includes(trimmed)) {
      toast.error('Método ya agregado');
      return;
    }
    set('acceptedPaymentMethods', [...form.acceptedPaymentMethods, trimmed]);
    setCustomMethod('');
    setShowCustomInput(false);
  };

  const handleSubmit = async () => {
    if (!form.bankName.trim()) {
      toast.error('Ingrese el nombre del banco');
      return;
    }
    if (!form.accountNumber.trim()) {
      toast.error('Ingrese el número de cuenta');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await fetchApi(`/bank-accounts/${account._id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        toast.success('Cuenta actualizada');
      } else {
        await fetchApi('/bank-accounts', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Cuenta creada');
      }
      haptics.success();
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Error al guardar cuenta', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // All methods: standard + any custom ones already on the account
  const allMethods = [...STANDARD_PAYMENT_METHODS];
  for (const m of form.acceptedPaymentMethods) {
    if (!allMethods.includes(m)) allMethods.push(m);
  }

  return (
    <MobileActionSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      footer={
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cuenta'}
        </button>
      }
    >
      <div className="px-4 pb-4 space-y-4">
        {/* Bank name */}
        <Field label="Banco">
          <input
            type="text"
            value={form.bankName}
            onChange={(e) => set('bankName', e.target.value)}
            placeholder="Ej: Banesco"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        {/* Account number */}
        <Field label="Número de cuenta">
          <input
            type="text"
            inputMode="numeric"
            value={form.accountNumber}
            onChange={(e) => set('accountNumber', e.target.value)}
            placeholder="0134-0000-00-0000000000"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        {/* Account type toggle */}
        <Field label="Tipo">
          <TogglePills
            options={[
              { value: 'corriente', label: 'Corriente' },
              { value: 'ahorro', label: 'Ahorro' },
            ]}
            value={form.accountType}
            onChange={(v) => set('accountType', v)}
          />
        </Field>

        {/* Currency toggle */}
        <Field label="Moneda">
          <TogglePills
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'VES', label: 'VES' },
            ]}
            value={form.currency}
            onChange={(v) => set('currency', v)}
          />
        </Field>

        {/* Initial balance */}
        <Field label={isEdit ? 'Saldo inicial' : 'Saldo inicial'}>
          <input
            type="number"
            inputMode="decimal"
            value={form.initialBalance || ''}
            onChange={(e) => set('initialBalance', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        {/* Account holder */}
        <Field label="Titular de la cuenta">
          <input
            type="text"
            value={form.accountHolderName}
            onChange={(e) => set('accountHolderName', e.target.value)}
            placeholder="Nombre del titular"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        {/* Payment methods */}
        <Field label="Métodos de pago aceptados">
          <div className="flex flex-wrap gap-1.5">
            {allMethods.map((method) => {
              const selected = form.acceptedPaymentMethods.includes(method);
              return (
                <motion.button
                  key={method}
                  onClick={() => toggleMethod(method)}
                  whileTap={{ scale: 1.05 }}
                  transition={SPRING.bouncy}
                  className={`text-[12px] font-medium rounded-full px-3 py-1.5 border transition-colors ${
                    selected
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {method}
                </motion.button>
              );
            })}
            <motion.button
              onClick={() => { haptics.tap(); setShowCustomInput(!showCustomInput); }}
              whileTap={{ scale: 1.05 }}
              className="text-[12px] font-medium rounded-full px-3 py-1.5 border border-dashed border-border text-muted-foreground flex items-center gap-1"
            >
              <Plus size={12} /> Otro
            </motion.button>
          </div>
          {showCustomInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomMethod()}
                placeholder="Nombre del método"
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                onClick={addCustomMethod}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                Agregar
              </button>
            </div>
          )}
        </Field>

        {/* Notes */}
        <Field label="Notas (opcional)">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Notas adicionales..."
            rows={2}
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </Field>
      </div>
    </MobileActionSheet>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function TogglePills({ options, value, onChange }) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <motion.button
          key={opt.value}
          onClick={() => { haptics.tap(); onChange(opt.value); }}
          whileTap={{ scale: 1.05 }}
          transition={SPRING.snappy}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            value === opt.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-muted-foreground'
          }`}
        >
          {opt.label}
        </motion.button>
      ))}
    </div>
  );
}
