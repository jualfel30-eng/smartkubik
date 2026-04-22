import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, PartyPopper } from 'lucide-react';
import { SPRING, EASE, DUR } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { fetchApi } from '@/lib/api';
import { triggerCelebration } from '@/hooks/use-celebration';

const STORAGE_KEY = 'beauty-checklist-dismissed';
const COMPLETED_CACHE_KEY = 'beauty-checklist-completed';

const CHECKLIST_ITEMS = [
  { key: 'booking', label: 'Crear página de reservas', path: '/storefront' },
  { key: 'professionals', label: 'Agregar profesionales', path: '/resources' },
  { key: 'services', label: 'Configurar servicios', path: '/services' },
  { key: 'photos', label: 'Agregar fotos de tu trabajo', path: '/services' },
  { key: 'deposits', label: 'Configurar anticipos', path: '/settings?section=payments' },
  { key: 'team', label: 'Invitar a tu equipo', path: '/settings?section=users' },
  { key: 'firstBooking', label: 'Crear tu primera cita', path: '/appointments' },
];

/**
 * Normalizes API response to an array.
 * Handles: plain array, { data: [...] }, { data: { data: [...] } }
 */
function toArray(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

/**
 * Fetches real data to determine which checklist items are completed.
 */
async function fetchCompletionStatus() {
  const completed = new Set();

  await Promise.allSettled([
    // 1. Storefront enabled?
    fetchApi('/restaurant-storefront/config').then((res) => {
      const cfg = res?.data || res;
      if (cfg?.restaurantConfig?.enabled) completed.add('booking');
    }),

    // 2. Professionals?
    fetchApi('/professionals').then((res) => {
      const list = toArray(res);
      if (list.length > 0) {
        completed.add('professionals');
        if (list.some((p) => p.images?.length > 0 || p.avatar)) {
          completed.add('photos');
        }
      }
    }),

    // 3. Beauty services?
    fetchApi('/beauty-services').then((res) => {
      const list = toArray(res);
      if (list.length > 0) {
        completed.add('services');
        if (list.some((s) => s.requiresDeposit)) completed.add('deposits');
        if (!completed.has('photos') && list.some((s) => s.images?.length > 0)) {
          completed.add('photos');
        }
      }
    }),

    // 4. Team (>1 user)?
    fetchApi('/tenant/users').then((res) => {
      const list = toArray(res);
      if (list.length > 1) completed.add('team');
    }),

    // 5. At least one booking?
    fetchApi('/beauty-bookings?limit=1').then((res) => {
      const list = toArray(res);
      if (list.length > 0) completed.add('firstBooking');
    }),
  ]);

  return completed;
}

export default function BeautyOnboardingChecklist({ tenant }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [completedKeys, setCompletedKeys] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(COMPLETED_CACHE_KEY) || '[]');
      return new Set(cached);
    } catch { return new Set(); }
  });
  const [newlyCompleted, setNewlyCompleted] = useState(new Set());
  const [allDone, setAllDone] = useState(false);
  const prevCompletedRef = useRef(new Set());
  const didInitRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchCompletionStatus();
      const prev = prevCompletedRef.current;

      // Detect newly completed (skip on first load)
      if (didInitRef.current) {
        const justDone = new Set();
        for (const key of result) {
          if (!prev.has(key)) justDone.add(key);
        }
        if (justDone.size > 0) {
          setNewlyCompleted(justDone);
          haptics.success();
          setTimeout(() => setNewlyCompleted(new Set()), 1500);
        }
      }
      didInitRef.current = true;

      prevCompletedRef.current = result;
      setCompletedKeys(result);
      localStorage.setItem(COMPLETED_CACHE_KEY, JSON.stringify([...result]));

      if (result.size >= CHECKLIST_ITEMS.length) {
        setAllDone(true);
        haptics.success();
        triggerCelebration();
      }
    } catch { /* silent */ }
  }, []);

  // Refresh on mount + when user returns to tab
  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  if (dismissed) return null;

  const completedCount = completedKeys.size;
  const totalCount = CHECKLIST_ITEMS.length;
  const progress = (completedCount / totalCount) * 100;

  const handleDismiss = () => {
    haptics.tap();
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  // All done — celebration card
  if (allDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE.out }}
        className="bg-card p-5 mb-1 text-center"
        style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-raised)' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING.bouncy, delay: 0.1 }}
          className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,197,94,0.08))' }}
        >
          <PartyPopper size={22} strokeWidth={1.5} className="text-emerald-400" />
        </motion.div>
        <p className="text-[15px] font-bold text-foreground mb-1">Tu salón está 100% configurado</p>
        <p className="text-[13px] text-muted-foreground/60 mb-4">Todo listo para recibir clientes</p>
        <button onClick={handleDismiss} className="text-[13px] text-primary/70 font-medium hover:text-primary transition-colors">
          Cerrar
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE.out } },
      }}
      className="bg-card p-5 mb-1"
      style={{ borderRadius: 'var(--mobile-radius-xl)', boxShadow: 'var(--elevation-raised)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold">
          Configura tu salón
          <span className="text-muted-foreground/50 font-medium ml-1.5">{completedCount}/{totalCount}</span>
        </p>
        <button onClick={handleDismiss} className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1 -mr-1" aria-label="Cerrar">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--glass-subtle)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-primary)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: EASE.out }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1">
        {CHECKLIST_ITEMS.map((item) => {
          const done = completedKeys.has(item.key);
          const justDone = newlyCompleted.has(item.key);

          return (
            <button
              key={item.key}
              onClick={() => { if (!done) { haptics.tap(); navigate(item.path); } }}
              disabled={done}
              className="w-full flex items-center gap-3 py-2 text-left rounded-xl transition-all duration-200"
            >
              <div className="relative w-5 h-5 flex-shrink-0">
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.div
                      key="done"
                      initial={justDone ? { scale: 0 } : false}
                      animate={{ scale: 1 }}
                      transition={justDone ? SPRING.bouncy : { duration: 0 }}
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                        boxShadow: justDone ? '0 0 12px rgba(74,222,128,0.4)' : 'none',
                      }}
                    >
                      <Check size={10} strokeWidth={3} className="text-white" />
                    </motion.div>
                  ) : (
                    <div key="pending" className="w-5 h-5 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--border)' }} />
                  )}
                </AnimatePresence>
              </div>
              <span className={`text-[14px] transition-all duration-300 ${done ? 'text-muted-foreground/40 line-through' : 'text-foreground/80'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
