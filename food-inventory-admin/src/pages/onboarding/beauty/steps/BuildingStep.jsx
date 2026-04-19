import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { EASE } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { fetchApi } from '@/lib/api';
import { useBeautyOnboarding } from '../BeautyOnboardingContext';

const CHECKLIST = [
  { key: 'settings', label: 'Tu información', gradient: ['#c084fc', '#a855f7'] },
  { key: 'logo', label: 'Tu logo', gradient: ['#fb923c', '#f97316'] },
  { key: 'professionals', label: 'Tu equipo', gradient: ['#38bdf8', '#0ea5e9'] },
  { key: 'services', label: 'Tus servicios', gradient: ['#4ade80', '#22c55e'] },
  { key: 'storefront', label: 'Tu página de reservas', gradient: ['#f472b6', '#ec4899'] },
];

export default function BuildingStep({ onNext, tenant, preview = false }) {
  const { state, dispatch } = useBeautyOnboarding();
  const [results, setResults] = useState({});
  const [progress, setProgress] = useState(0);
  const didRun = useRef(false);

  const setResult = (key, status) => {
    setResults(prev => ({ ...prev, [key]: status }));
    dispatch({ type: 'SET_BUILD_RESULT', payload: { key, status } });
    if (status === 'success') haptics.tap();
  };

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    const run = async () => {
      const total = CHECKLIST.length;
      let done = 0;
      const advance = () => { done++; setProgress(Math.round((done / total) * 100)); };

      if (preview) {
        for (const item of CHECKLIST) {
          if (item.key === 'logo' && !state.logoFile) { setResult(item.key, 'skipped'); advance(); continue; }
          setResult(item.key, 'loading');
          await delay(500 + Math.random() * 500);
          setResult(item.key, 'success');
          advance();
        }
        dispatch({ type: 'SET_BOOKING_URL', payload: 'demo-salon.smartkubik.com' });
        haptics.success(); await delay(1200); onNext(); return;
      }

      try { setResult('settings', 'loading');
        const p = { name: state.salonName };
        if (state.whatsappNumber) p.contactInfo = { phone: `+58${state.whatsappNumber}` };
        if (state.currency) p.settings = { currency: state.currency };
        await fetchApi('/tenant/settings', { method: 'PUT', body: JSON.stringify(p) });
        setResult('settings', 'success');
      } catch { setResult('settings', 'error'); } advance();

      if (state.logoFile) {
        try { setResult('logo', 'loading'); const fd = new FormData(); fd.append('file', state.logoFile);
          await fetchApi('/tenant/logo', { method: 'POST', body: fd }); setResult('logo', 'success');
        } catch { setResult('logo', 'error'); }
      } else { setResult('logo', 'skipped'); } advance();

      try { setResult('professionals', 'loading');
        const slots = buildScheduleSlots(state.schedule);
        for (const pro of state.professionals) await fetchApi('/professionals', { method: 'POST', body: JSON.stringify({ name: pro.name, color: pro.color, schedule: slots, isActive: true }) });
        setResult('professionals', 'success');
      } catch { setResult('professionals', 'error'); } advance();

      try { setResult('services', 'loading');
        for (const svc of state.services.filter(s => s.isSelected)) await fetchApi('/beauty-services', { method: 'POST', body: JSON.stringify({ name: svc.name, category: svc.category, duration: svc.duration, price: { amount: svc.price, currency: state.currency }, isActive: true }) });
        setResult('services', 'success');
      } catch { setResult('services', 'error'); } advance();

      try { setResult('storefront', 'loading');
        await fetchApi('/restaurant-storefront/config', { method: 'PUT', body: JSON.stringify({ restaurantConfig: { enabled: true, restaurantName: state.salonName, whatsappNumber: state.whatsappNumber ? `58${state.whatsappNumber}` : undefined, currency: state.currency, businessHours: buildBusinessHours(state.schedule) } }) });
        setResult('storefront', 'success');
        dispatch({ type: 'SET_BOOKING_URL', payload: `${(tenant?.code || '').toLowerCase()}.smartkubik.com` });
      } catch { setResult('storefront', 'error'); } advance();

      haptics.success(); await delay(1200); onNext();
    };
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleChecklist = CHECKLIST.filter(item => !(item.key === 'logo' && !state.logoFile));

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
      {/* Ambient orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 65%)', filter: 'blur(50px)' }} />

      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE.out }}
        className="text-[24px] font-extrabold text-white tracking-tight mb-2 relative z-10">
        Preparando tu salón
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="text-white/25 text-[14px] mb-10 relative z-10">Esto toma unos segundos</motion.p>

      {/* Checklist as stacked cards */}
      <div className="w-full max-w-xs space-y-3 relative z-10">
        {visibleChecklist.map((item, i) => {
          const status = results[item.key];
          const isDone = status === 'success' || status === 'skipped';
          const isLoading = status === 'loading';
          return (
            <motion.div key={item.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35, ease: EASE.out }}
              className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-500"
              style={{
                background: isDone
                  ? `linear-gradient(135deg, ${item.gradient[0]}10, ${item.gradient[1]}06)`
                  : 'rgba(255,255,255,0.02)',
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
                style={{
                  background: isDone
                    ? `linear-gradient(135deg, ${item.gradient[0]}30, ${item.gradient[1]}20)`
                    : isLoading
                      ? 'rgba(168,85,247,0.1)'
                      : 'rgba(255,255,255,0.03)',
                }}>
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                      <Check size={14} strokeWidth={2.5} style={{ color: item.gradient[0] }} />
                    </motion.div>
                  ) : isLoading ? (
                    <motion.div key="spin" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Loader2 size={14} strokeWidth={2} className="text-purple-400" />
                    </motion.div>
                  ) : (
                    <div key="wait" className="w-2 h-2 rounded-full bg-white/8" />
                  )}
                </AnimatePresence>
              </div>
              <span className={`text-[14px] transition-colors duration-500 ${isDone ? 'text-white/60' : isLoading ? 'text-white/70' : 'text-white/15'}`}>
                {item.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function buildScheduleSlots(s) { const r = []; const d = { weekdays: [1,2,3,4,5], saturday: [6], sunday: [0] }; for (const [b, ns] of Object.entries(d)) { const x = s[b]; for (const n of ns) r.push({ day: n, start: x.enabled ? x.start : '00:00', end: x.enabled ? x.end : '00:00', isWorking: x.enabled }); } return r; }
function buildBusinessHours(s) { const r = []; const d = { weekdays: [1,2,3,4,5], saturday: [6], sunday: [0] }; for (const [b, ns] of Object.entries(d)) { const x = s[b]; for (const n of ns) r.push({ day: n, open: x.start || '08:00', close: x.end || '18:00', isOpen: x.enabled }); } return r; }
