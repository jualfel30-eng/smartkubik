import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING } from '@/lib/motion';
import haptics from '@/lib/haptics';

export default function MobileSettingsLayout({
  title,
  onBack,
  isDirty = false,
  isSaving = false,
  onSave,
  headerRight,
  children,
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-[40] bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => { haptics.tap(); onBack(); }}
          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full no-tap-highlight active:bg-muted transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">{title}</h1>

        {/* Save button in header — always visible when dirty */}
        <AnimatePresence>
          {isDirty && onSave && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={SPRING.snappy}
              whileTap={{ scale: 0.95 }}
              disabled={isSaving}
              onClick={onSave}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold text-white disabled:opacity-60 transition-opacity"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow: '0 2px 12px oklch(0.62 0.22 268 / 0.3)',
              }}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} strokeWidth={2} />
              )}
              {isSaving ? 'Guardando' : 'Guardar'}
            </motion.button>
          )}
        </AnimatePresence>

        {!isDirty && headerRight}
      </div>

      {/* Content — fluye en el scroller real (App.jsx). Un scroller interno aquí
          con overscroll-behavior:contain bloqueaba la propagación del scroll en
          Android (la cadena h-full se rompe en PageTransition y nunca desborda). */}
      <div
        className="flex-1 px-4 py-4 space-y-5"
        style={{ paddingBottom: '6rem' }}
      >
        {children}
      </div>
    </div>
  );
}
