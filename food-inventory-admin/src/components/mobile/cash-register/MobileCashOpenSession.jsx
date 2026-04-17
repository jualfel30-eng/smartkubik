import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sun, Sunset, Moon } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { fadeUp, scaleIn, STAGGER } from '@/lib/motion';

const SHIFTS = [
  { key: 'morning', label: 'Mañana', icon: Sun },
  { key: 'afternoon', label: 'Tarde', icon: Sunset },
  { key: 'night', label: 'Noche', icon: Moon },
];

function getDefaultShift() {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 'morning';
  if (h < 20) return 'afternoon';
  return 'night';
}

export default function MobileCashOpenSession({ onOpened }) {
  const [registerName, setRegisterName] = useState('Caja Principal');
  const [openingAmountUsd, setOpeningAmountUsd] = useState('');
  const [openingAmountVes, setOpeningAmountVes] = useState('');
  const [workShift, setWorkShift] = useState(getDefaultShift);
  const [openingNotes, setOpeningNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetchApi('/cash-register/sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          registerName: registerName.trim() || 'Caja Principal',
          openingAmountUsd: parseFloat(openingAmountUsd) || 0,
          openingAmountVes: parseFloat(openingAmountVes) || 0,
          workShift,
          openingNotes: openingNotes.trim(),
        }),
      });
      haptics.success();
      toast.success('Caja abierta exitosamente');
      onOpened?.();
    } catch (err) {
      haptics.error();
      toast.error('Error al abrir caja', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 pb-28">
      {/* Header */}
      <motion.div
        className="flex flex-col items-center pt-8 pb-6"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">La caja está cerrada</h1>
        <p className="text-sm text-muted-foreground mt-1">Abre una sesión para comenzar</p>
      </motion.div>

      {/* Form */}
      <motion.div
        className="flex-1 space-y-5"
        variants={STAGGER(0.06, 0.1)}
        initial="initial"
        animate="animate"
      >
        {/* Shift selector */}
        <motion.div variants={scaleIn}>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Turno
          </label>
          <div className="flex gap-2">
            {SHIFTS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { haptics.select(); setWorkShift(key); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-medium transition-colors no-tap-highlight',
                  workShift === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Register name */}
        <motion.div variants={scaleIn}>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Nombre de caja
          </label>
          <input
            type="text"
            value={registerName}
            onChange={e => setRegisterName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Caja Principal"
          />
        </motion.div>

        {/* Opening amounts */}
        <motion.div variants={scaleIn} className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Monto inicial (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={openingAmountUsd}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9.]/g, '');
                  if (v.split('.')[1]?.length > 2) return;
                  setOpeningAmountUsd(v);
                }}
                onFocus={e => { if (e.target.value === '0') setOpeningAmountUsd(''); }}
                className="w-full h-14 pl-8 pr-4 rounded-xl bg-card border border-border text-2xl font-bold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Monto inicial (VES)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">Bs</span>
              <input
                type="text"
                inputMode="decimal"
                value={openingAmountVes}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9.]/g, '');
                  if (v.split('.')[1]?.length > 2) return;
                  setOpeningAmountVes(v);
                }}
                onFocus={e => { if (e.target.value === '0') setOpeningAmountVes(''); }}
                className="w-full h-14 pl-10 pr-4 rounded-xl bg-card border border-border text-2xl font-bold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="0.00"
              />
            </div>
          </div>
        </motion.div>

        {/* Notes toggle + textarea */}
        <motion.div variants={scaleIn}>
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-sm text-primary font-medium no-tap-highlight"
            >
              + Agregar nota
            </button>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Notas (opcional)
              </label>
              <textarea
                value={openingNotes}
                onChange={e => setOpeningNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Notas de apertura..."
              />
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Submit button */}
      <div className="pt-4">
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={cn(
            'w-full h-14 rounded-2xl text-lg font-semibold text-white transition-colors no-tap-highlight',
            submitting ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 active:bg-emerald-700',
          )}
          whileTap={{ scale: 0.97 }}
        >
          {submitting ? 'Abriendo…' : 'Abrir Caja'}
        </motion.button>
      </div>
    </div>
  );
}
