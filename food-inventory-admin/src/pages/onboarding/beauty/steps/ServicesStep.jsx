import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Palette, Hand, Sparkles, Plus, ArrowRight } from 'lucide-react';
import { SPRING, EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

const ICONS = { Scissors, Palette, Hand, Sparkles };
const GRADIENTS = {
  Scissors: ['#c084fc', '#a855f7'],
  Palette: ['#fb923c', '#f97316'],
  Hand: ['#38bdf8', '#0ea5e9'],
  Sparkles: ['#4ade80', '#22c55e'],
};

export default function ServicesStep({ onNext }) {
  const { state, dispatch } = useBeautyOnboarding();
  const { services, currency } = state;
  const [editingId, setEditingId] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customDuration, setCustomDuration] = useState('');

  const toggleService = (id) => { haptics.select(); dispatch({ type: 'TOGGLE_SERVICE', payload: id }); };
  const updateService = (id, field, value) => { dispatch({ type: 'UPDATE_SERVICE', payload: { id, [field]: field === 'price' || field === 'duration' ? Number(value) || 0 : value } }); };
  const addCustomService = () => {
    if (!customName.trim()) return;
    haptics.success();
    dispatch({ type: 'ADD_CUSTOM_SERVICE', payload: { id: `custom_${Date.now()}`, icon: 'Sparkles', name: customName.trim(), category: 'Personalizado', price: Number(customPrice) || 0, duration: Number(customDuration) || 30, isSelected: true, isCustom: true } });
    setCustomName(''); setCustomPrice(''); setCustomDuration(''); setShowCustom(false);
  };

  const selectedCount = services.filter(s => s.isSelected).length;
  const sym = currency === 'VES' ? 'Bs.' : '$';

  return (
    <>
      <div className="flex-1 pt-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE.out }}
          className="text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-center mb-3">
          Tus servicios
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center text-white/30 text-[15px] mb-8">
          Toca un precio para editarlo
        </motion.p>

        <motion.div className="space-y-2.5"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}>
          {services.map((svc) => {
            const isEditing = editingId === svc.id;
            const Icon = ICONS[svc.icon] || Sparkles;
            const grad = GRADIENTS[svc.icon] || GRADIENTS.Sparkles;
            return (
              <motion.div key={svc.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.35, ease: EASE.out }}
                className="rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: svc.isSelected ? `linear-gradient(135deg, ${grad[0]}08, ${grad[1]}04)` : 'rgba(255,255,255,0.02)',
                  boxShadow: svc.isSelected ? `0 0 0 1px ${grad[0]}30` : 'none',
                }}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <button onClick={() => toggleService(svc.id)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{ background: svc.isSelected ? `linear-gradient(135deg, ${grad[0]}25, ${grad[1]}15)` : 'rgba(255,255,255,0.04)' }}>
                      <Icon size={16} strokeWidth={1.5} style={{ color: svc.isSelected ? grad[0] : 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <span className={`text-[15px] transition-colors duration-300 ${svc.isSelected ? 'text-white/90' : 'text-white/35'}`}>{svc.name}</span>
                  </button>

                  <button onClick={() => { if (svc.isSelected) { haptics.tap(); setEditingId(isEditing ? null : svc.id); } }}
                    className={`text-[13px] tabular-nums flex-shrink-0 ${svc.isSelected ? 'text-white/40' : 'text-white/15'}`}>
                    {sym}{svc.price} · {svc.duration}min
                  </button>

                  <button onClick={() => toggleService(svc.id)} className="flex-shrink-0">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: svc.isSelected ? `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` : 'transparent',
                        boxShadow: svc.isSelected ? `0 2px 8px ${grad[0]}40` : `inset 0 0 0 1.5px rgba(255,255,255,0.12)`,
                      }}>
                      {svc.isSelected && (
                        <motion.svg width="10" height="10" viewBox="0 0 12 12" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                          <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {isEditing && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="flex gap-3 px-4 pb-4">
                        <div className="flex-1">
                          <label className="text-white/20 text-[10px] font-medium uppercase tracking-wide mb-1 block">Precio</label>
                          <input type="number" value={svc.price} onChange={(e) => updateService(svc.id, 'price', e.target.value)}
                            className="w-full py-2.5 px-3 rounded-xl text-sm text-white bg-white/[0.04] focus:outline-none" inputMode="decimal" />
                        </div>
                        <div className="flex-1">
                          <label className="text-white/20 text-[10px] font-medium uppercase tracking-wide mb-1 block">Minutos</label>
                          <input type="number" value={svc.duration} onChange={(e) => updateService(svc.id, 'duration', e.target.value)}
                            className="w-full py-2.5 px-3 rounded-xl text-sm text-white bg-white/[0.04] focus:outline-none" inputMode="numeric" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {showCustom ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-3 rounded-2xl p-4 bg-white/[0.03] overflow-hidden">
              <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Nombre del servicio"
                className="w-full py-3 px-4 rounded-xl text-[15px] text-white placeholder:text-white/20 bg-white/[0.04] focus:outline-none mb-3" autoFocus />
              <div className="flex gap-3 mb-3">
                <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder={`Precio`}
                  className="flex-1 py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/20 bg-white/[0.04] focus:outline-none" inputMode="decimal" />
                <input type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} placeholder="Min"
                  className="w-20 py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/20 bg-white/[0.04] focus:outline-none" inputMode="numeric" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCustom(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/25 bg-white/[0.03]">Cancelar</button>
                <button onClick={addCustomService} disabled={!customName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: customName.trim() ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))' : 'rgba(255,255,255,0.03)', color: customName.trim() ? 'rgb(196,181,253)' : 'rgba(255,255,255,0.12)' }}>
                  Agregar
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              onClick={() => setShowCustom(true)}
              className="w-full mt-3 py-3.5 rounded-2xl text-sm text-white/20 flex items-center justify-center gap-1.5 bg-white/[0.02] border border-dashed border-white/[0.06]">
              <Plus size={14} strokeWidth={1.5} /> Servicio personalizado
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="pt-8 pb-safe">
        <button onClick={onNext} disabled={selectedCount === 0}
          className="w-full py-4 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-400"
          style={{
            background: selectedCount > 0 ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255,255,255,0.05)',
            color: selectedCount > 0 ? 'white' : 'rgba(255,255,255,0.15)',
            boxShadow: selectedCount > 0 ? '0 4px 24px -4px rgba(168,85,247,0.35)' : 'none',
          }}>
          {selectedCount > 0 ? `${selectedCount} servicio${selectedCount !== 1 ? 's' : ''}` : 'Selecciona al menos 1'}
          {selectedCount > 0 && <ArrowRight size={16} strokeWidth={2.5} />}
        </button>
      </motion.div>
    </>
  );
}
