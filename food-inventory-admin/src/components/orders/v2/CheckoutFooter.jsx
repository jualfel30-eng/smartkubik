import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { tapScale } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';
import { ShoppingCart } from 'lucide-react';
import haptics from '@/lib/haptics';

/**
 * CheckoutFooter — always-visible footer with total + pay button.
 * Sits at the bottom of the right column (never scrolls).
 */
export function CheckoutFooter({
  items = [],
  total,
  totalWithWithholding,
  hasWithholding = false,
  onCreateOrder,
  isCreateDisabled,
  onSendToKitchen,
  isEditMode,
}) {
  const itemCount = items.length;
  const displayTotal = hasWithholding ? totalWithWithholding : total;

  return (
    <div className="border-t bg-background pt-3 pb-2 px-1 mt-auto">
      {itemCount === 0 ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <ShoppingCart className="h-4 w-4" />
          <span>Agrega productos para continuar</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Total line */}
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </p>
              <div className="text-[28px] sm:text-[32px] font-extrabold text-primary tabular-nums tracking-tight leading-none mt-0.5">
                <AnimatedNumber
                  value={displayTotal}
                  format={(n) => `$${n.toFixed(2)}`}
                  duration={0.4}
                />
              </div>
              {hasWithholding && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Neto (con ret. IVA)</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              {onSendToKitchen ? (
                <>
                  {!isEditMode && (
                    <motion.div whileTap={tapScale}>
                      <Button
                        onClick={() => { haptics.tap(); onSendToKitchen?.(); }}
                        disabled={isCreateDisabled}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="sm"
                        style={{ boxShadow: '0 2px 10px oklch(0.65 0.18 50 / 0.25)' }}
                      >
                        Enviar a Cocina
                      </Button>
                    </motion.div>
                  )}
                  <motion.div whileTap={tapScale}>
                    <Button
                      onClick={() => { haptics.select(); onCreateOrder?.(); }}
                      disabled={isCreateDisabled}
                      className="w-full text-primary-foreground border-0"
                      style={{
                        background: 'var(--gradient-primary)',
                        boxShadow: '0 4px 14px oklch(0.62 0.22 268 / 0.3)',
                      }}
                    >
                      {isEditMode ? 'Pagar / Cerrar' : 'Pagar'}
                    </Button>
                  </motion.div>
                </>
              ) : (
                <motion.div whileTap={tapScale}>
                  <Button
                    onClick={() => { haptics.select(); onCreateOrder?.(); }}
                    disabled={isCreateDisabled}
                    className="w-full text-primary-foreground border-0"
                    size="lg"
                    style={{
                      background: 'var(--gradient-primary)',
                      boxShadow: '0 4px 14px oklch(0.62 0.22 268 / 0.3)',
                    }}
                  >
                    {isEditMode ? 'Actualizar' : 'Crear Orden'}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
