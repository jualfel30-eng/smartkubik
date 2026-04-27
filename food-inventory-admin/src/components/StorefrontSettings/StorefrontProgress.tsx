import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING, DUR, EASE, scaleIn } from '../../lib/motion';
import { Check, Circle, Lightbulb, ChevronRight } from 'lucide-react';
import type { StorefrontProgressData } from './hooks/useStorefrontProgress';

interface StorefrontProgressProps {
  data: StorefrontProgressData;
  onNavigate?: (sectionId: string) => void;
}

export function StorefrontProgress({ data, onNavigate }: StorefrontProgressProps) {
  const { percent, sections, completedCount, totalCount, nextSuggestion } = data;
  const [displayPercent, setDisplayPercent] = useState(0);
  const [dismissedTip, setDismissedTip] = useState(false);
  const prevCompleteRef = useRef<Set<string>>(new Set());
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // Animate percentage
  useEffect(() => {
    const timer = setTimeout(() => setDisplayPercent(percent), 100);
    return () => clearTimeout(timer);
  }, [percent]);

  // Detect newly completed sections
  useEffect(() => {
    const currentComplete = new Set(sections.filter((s) => s.complete).map((s) => s.id));
    const prev = prevCompleteRef.current;
    for (const id of currentComplete) {
      if (!prev.has(id)) {
        setJustCompleted(id);
        setTimeout(() => setJustCompleted(null), 2500);
        break;
      }
    }
    prevCompleteRef.current = currentComplete;
  }, [sections]);

  const isReady = percent >= 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-gray-200">
            Tu sitio web esta <span className="text-blue-400">{displayPercent}%</span> listo
          </span>
          <span className="text-xs text-gray-500">
            {completedCount}/{totalCount} secciones
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isReady ? 'bg-emerald-500' : 'bg-blue-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${displayPercent}%` }}
            transition={SPRING.soft}
          />
        </div>
      </div>

      {/* Section checklist */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate?.(section.id)}
            className="flex items-center gap-1 text-xs py-0.5 hover:opacity-80 transition-opacity"
          >
            {section.complete ? (
              <motion.span
                initial={justCompleted === section.id ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={SPRING.bouncy}
              >
                <Check className="w-3 h-3 text-emerald-400" />
              </motion.span>
            ) : (
              <Circle className="w-2.5 h-2.5 text-gray-600" />
            )}
            <span className={section.complete ? 'text-gray-300' : 'text-gray-500'}>
              {section.label}
            </span>
          </button>
        ))}
      </div>

      {/* Mini celebration for completion */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
          >
            {sections.find((s) => s.id === justCompleted)?.label} lista
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ready to publish */}
      {isReady && (
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center"
        >
          <p className="text-sm font-medium text-emerald-400">Tu sitio esta listo para publicar</p>
          <button
            onClick={() => onNavigate?.('publish')}
            className="text-xs text-emerald-300 underline underline-offset-2 mt-1"
          >
            Ir a Publicar
          </button>
        </motion.div>
      )}

      {/* Intelligence tip */}
      {nextSuggestion && !dismissedTip && !isReady && (
        <motion.button
          variants={scaleIn}
          initial="initial"
          animate="animate"
          onClick={() => {
            const nextIncomplete = sections.find((s) => !s.complete);
            if (nextIncomplete) onNavigate?.(nextIncomplete.id);
          }}
          className="w-full flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-left group hover:bg-amber-500/10 transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-amber-300/80 flex-1">{nextSuggestion}</span>
          <ChevronRight className="w-3 h-3 text-amber-400/50 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>
      )}
    </div>
  );
}
