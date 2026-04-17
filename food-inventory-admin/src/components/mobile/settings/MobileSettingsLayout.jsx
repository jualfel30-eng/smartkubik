import { ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING, fadeUp } from '@/lib/motion';
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
        {headerRight}
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto mobile-scroll px-4 py-4 space-y-5"
        style={{ paddingBottom: isDirty ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '6rem' }}
      >
        {children}
      </div>

      {/* Sticky save footer */}
      <AnimatePresence>
        {isDirty && onSave && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={SPRING.snappy}
            className="fixed bottom-0 left-0 right-0 z-[40] bg-background/80 backdrop-blur-lg border-t border-border px-4 py-3 safe-bottom"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={isSaving}
              onClick={onSave}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 disabled:opacity-60 transition-opacity"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
