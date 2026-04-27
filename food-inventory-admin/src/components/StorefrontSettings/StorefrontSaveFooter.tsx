import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DUR, EASE } from '../../lib/motion';
import { AlertCircle } from 'lucide-react';

interface StorefrontSaveFooterProps {
  isDirty: boolean;
  dirtySections: string[];
  onNavigate?: (sectionId: string) => void;
}

export function StorefrontSaveFooter({ isDirty, dirtySections, onNavigate }: StorefrontSaveFooterProps) {
  // Browser warning on navigate away
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: DUR.base, ease: EASE.out }}
          className="px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15"
        >
          <div className="flex items-start gap-2">
            <span className="relative flex h-2 w-2 mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-300">Cambios sin guardar</p>
              {dirtySections.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {dirtySections.map((id) => (
                    <button
                      key={id}
                      onClick={() => onNavigate?.(id)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20 transition-colors"
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-500 mt-1">
                Recuerda guardar en cada seccion
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
