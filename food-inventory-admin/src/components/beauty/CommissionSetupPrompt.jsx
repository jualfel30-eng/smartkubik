/**
 * CommissionSetupPrompt — Headspace-style contextual prompt.
 * Appears after the first paid booking when no commission plan exists.
 * Guides the user through a 2-step micro-flow to configure commissions.
 *
 * Usage:
 *   <CommissionSetupPrompt
 *     open={showPrompt}
 *     onClose={() => setShowPrompt(false)}
 *   />
 *
 * Trigger logic: call `shouldShowCommissionPrompt()` after a successful payment.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Percent, DollarSign, ArrowRight, X, Check, Sparkles } from 'lucide-react';
import { EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { fetchApi } from '@/lib/api';
import { createCommissionPlan, getCommissionPlans } from '@/lib/api';
import { toast } from '@/lib/toast';

const STORAGE_KEY = 'commission-setup-dismissed';

/**
 * Check if we should show the commission prompt.
 * Returns true if: no commission plans exist AND user hasn't dismissed it.
 */
export async function shouldShowCommissionPrompt() {
  if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
  try {
    const res = await getCommissionPlans({ isActive: true });
    const plans = res?.data || res || [];
    return Array.isArray(plans) && plans.length === 0;
  } catch {
    return false;
  }
}

// ── Commission types for the selector ─────────────────────────
const COMMISSION_TYPES = [
  {
    id: 'percentage',
    Icon: Percent,
    label: 'Porcentaje',
    description: 'Un % de cada servicio',
    gradient: ['#c084fc', '#a855f7'],
    example: 'Ej: 40% de un corte de $10 = $4',
  },
  {
    id: 'fixed',
    Icon: DollarSign,
    label: 'Monto fijo',
    description: 'Cantidad fija por servicio',
    gradient: ['#38bdf8', '#0ea5e9'],
    example: 'Ej: $3 por cada servicio realizado',
  },
];

export default function CommissionSetupPrompt({ open, onClose }) {
  const [step, setStep] = useState(0); // 0: type select, 1: amount input, 2: done
  const [type, setType] = useState(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) { setStep(0); setType(null); setAmount(''); }
  }, [open]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  const handleSelectType = (t) => {
    haptics.select();
    setType(t);
    setStep(1);
  };

  const handleSave = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return;

    setSaving(true);
    try {
      await createCommissionPlan({
        name: type === 'percentage' ? `Comisión ${value}%` : `Comisión fija $${value}`,
        type,
        ...(type === 'percentage'
          ? { defaultPercentage: value }
          : { fixedAmount: value }
        ),
        isActive: true,
        isDefault: true,
      });
      haptics.success();
      setStep(2);
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full sm:max-w-md bg-[#0f1225] sm:rounded-3xl rounded-t-3xl overflow-hidden"
          style={{
            boxShadow: '0 -8px 40px rgba(0,0,0,0.4), 0 0 80px -20px rgba(168,85,247,0.1)',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors z-10 p-1"
          >
            <X size={18} strokeWidth={1.5} />
          </button>

          <div className="px-6 pt-8 pb-safe">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <StepTypeSelect key="type" onSelect={handleSelectType} onSkip={handleDismiss} />
              )}
              {step === 1 && (
                <StepAmount
                  key="amount"
                  type={type}
                  amount={amount}
                  setAmount={setAmount}
                  onSave={handleSave}
                  onBack={() => setStep(0)}
                  saving={saving}
                />
              )}
              {step === 2 && (
                <StepDone key="done" type={type} amount={amount} onFinish={handleFinish} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Step 0: Select commission type ────────────────────────────
function StepTypeSelect({ onSelect, onSkip }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: EASE.out }}
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))' }}
        >
          <Sparkles size={24} strokeWidth={1.5} className="text-purple-400" />
        </motion.div>
        <h2 className="text-[22px] font-extrabold text-white tracking-tight mb-2">
          ¡Primer cobro registrado!
        </h2>
        <p className="text-white/35 text-[14px] leading-relaxed">
          ¿Cómo le pagas a tus profesionales por cada servicio?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {COMMISSION_TYPES.map((ct, i) => (
          <motion.button
            key={ct.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(ct.id)}
            className="w-full flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-all duration-300 group"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${ct.gradient[0]}20, ${ct.gradient[1]}12)` }}
            >
              <ct.Icon size={20} strokeWidth={1.5} style={{ color: ct.gradient[0] }} />
            </div>
            <div className="flex-1">
              <p className="text-white/90 text-[15px] font-semibold">{ct.label}</p>
              <p className="text-white/30 text-[13px]">{ct.description}</p>
            </div>
            <ArrowRight size={16} strokeWidth={1.5} className="text-white/15 group-hover:text-white/30 transition-colors" />
          </motion.button>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="w-full py-3 text-center text-white/20 text-[13px] hover:text-white/40 transition-colors"
      >
        Configurar después
      </button>
    </motion.div>
  );
}

// ── Step 1: Enter amount ──────────────────────────────────────
function StepAmount({ type, amount, setAmount, onSave, onBack, saving }) {
  const ct = COMMISSION_TYPES.find((c) => c.id === type);
  const isPercent = type === 'percentage';
  const value = Number(amount);
  const canSave = value > 0 && (isPercent ? value <= 100 : true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: EASE.out }}
    >
      <div className="text-center mb-8">
        <h2 className="text-[22px] font-extrabold text-white tracking-tight mb-2">
          {isPercent ? '¿Qué porcentaje?' : '¿Cuánto por servicio?'}
        </h2>
        <p className="text-white/30 text-[13px]">{ct?.example}</p>
      </div>

      {/* Big centered input */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {!isPercent && <span className="text-white/20 text-3xl font-light">$</span>}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={isPercent ? '40' : '5'}
          className="w-28 text-center text-4xl font-extrabold text-white bg-transparent border-none outline-none placeholder:text-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          inputMode="decimal"
          autoFocus
        />
        {isPercent && <span className="text-white/20 text-3xl font-light">%</span>}
      </div>

      {/* Subtle divider */}
      <div className="w-16 h-[2px] mx-auto rounded-full mb-8"
        style={{ background: `linear-gradient(90deg, ${ct?.gradient[0]}40, ${ct?.gradient[1]}20)` }}
      />

      {/* Preview */}
      {value > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white/25 text-[13px] mb-8"
        >
          {isPercent
            ? `Un servicio de $10 → profesional gana $${(10 * value / 100).toFixed(2)}`
            : `Cada servicio → profesional gana $${value.toFixed(2)}`
          }
        </motion.p>
      )}

      <button
        onClick={onSave}
        disabled={!canSave || saving}
        className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-300 mb-4"
        style={{
          background: canSave
            ? `linear-gradient(135deg, ${ct?.gradient[0]}, ${ct?.gradient[1]})`
            : 'rgba(255,255,255,0.05)',
          color: canSave ? 'white' : 'rgba(255,255,255,0.15)',
          boxShadow: canSave ? `0 4px 24px -4px ${ct?.gradient[0]}50` : 'none',
        }}
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </button>

      <button
        onClick={onBack}
        className="w-full py-3 text-center text-white/20 text-[13px] hover:text-white/40 transition-colors"
      >
        Volver
      </button>
    </motion.div>
  );
}

// ── Step 2: Success ───────────────────────────────────────────
function StepDone({ type, amount, onFinish }) {
  const isPercent = type === 'percentage';

  useEffect(() => { haptics.success(); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE.out }}
      className="text-center pb-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 18 }}
        className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.1))' }}
      >
        <Check size={24} strokeWidth={2} className="text-emerald-400" />
      </motion.div>

      <h2 className="text-[22px] font-extrabold text-white tracking-tight mb-2">
        Comisiones configuradas
      </h2>
      <p className="text-white/30 text-[14px] mb-8 leading-relaxed">
        Tus profesionales ganarán{' '}
        <span className="text-white/60 font-semibold">
          {isPercent ? `${amount}%` : `$${amount}`}
        </span>{' '}
        por cada servicio.
        <br />
        <span className="text-white/20">Puedes ajustar esto en Nómina y Comisiones.</span>
      </p>

      <button
        onClick={onFinish}
        className="w-full py-4 rounded-full text-[15px] font-bold text-white active:scale-[0.98] transition-transform"
        style={{
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          boxShadow: '0 4px 24px -4px rgba(168,85,247,0.35)',
        }}
      >
        Entendido
      </button>
    </motion.div>
  );
}
