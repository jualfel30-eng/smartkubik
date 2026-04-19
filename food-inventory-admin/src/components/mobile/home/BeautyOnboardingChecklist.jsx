import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';

const STORAGE_KEY = 'beauty-onboarding-checklist-dismissed';

const CHECKLIST_ITEMS = [
  { key: 'booking', label: 'Crear página de reservas', path: '/storefront', auto: true },
  { key: 'professionals', label: 'Agregar profesionales', path: '/professionals', auto: true },
  { key: 'services', label: 'Configurar servicios', path: '/beauty-services', auto: true },
  { key: 'photos', label: 'Agregar fotos de tu trabajo', path: '/beauty-services' },
  { key: 'deposits', label: 'Configurar señas/depósitos', path: '/settings' },
  { key: 'team', label: 'Invitar a tu equipo', path: '/settings' },
  { key: 'firstBooking', label: 'Crear tu primera cita', path: '/appointments' },
];

export default function BeautyOnboardingChecklist({ tenant }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true'
  );

  if (dismissed) return null;

  // Auto-completed items (done during onboarding)
  const completedKeys = new Set();
  if (tenant?.onboardingCompleted) {
    completedKeys.add('booking');
    completedKeys.add('professionals');
    completedKeys.add('services');
  }

  const completedCount = completedKeys.size;
  const totalCount = CHECKLIST_ITEMS.length;
  const progress = (completedCount / totalCount) * 100;

  // All done
  if (completedCount >= totalCount) return null;

  const handleDismiss = () => {
    haptics.tap();
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <motion.div
      variants={listItem}
      className="bg-card border border-border p-4 mb-1"
      style={{
        borderRadius: 'var(--mobile-radius-lg)',
        boxShadow: 'var(--elevation-raised)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">
          Configura tu salón ({completedCount}/{totalCount})
        </p>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 -mr-1"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => {
          const done = completedKeys.has(item.key);
          return (
            <button
              key={item.key}
              onClick={() => {
                if (!done) {
                  haptics.tap();
                  navigate(item.path);
                }
              }}
              disabled={done}
              className={`
                w-full flex items-center gap-2.5 py-1.5 text-left text-sm rounded-lg transition-colors
                ${done ? 'text-muted-foreground' : 'text-foreground hover:text-primary'}
              `}
            >
              {done ? (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
              )}
              <span className={done ? 'line-through' : ''}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
