import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { tapScale } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';
import { ShoppingCart } from 'lucide-react';

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
              <p className="text-xs text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </p>
              <div className="text-xl font-bold text-primary tabular-nums">
                <AnimatedNumber
                  value={displayTotal}
                  format={(n) => `$${n.toFixed(2)}`}
                  duration={0.4}
                />
              </div>
              {hasWithholding && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">Neto (con ret. IVA)</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              {onSendToKitchen ? (
                <>
                  {!isEditMode && (
                    <motion.div whileTap={tapScale}>
                      <Button
                        onClick={onSendToKitchen}
                        disabled={isCreateDisabled}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="sm"
                      >
                        Enviar a Cocina
                      </Button>
                    </motion.div>
                  )}
                  <motion.div whileTap={tapScale}>
                    <Button
                      onClick={onCreateOrder}
                      disabled={isCreateDisabled}
                      className="w-full bg-success hover:bg-green-700 text-white"
                    >
                      {isEditMode ? 'Pagar / Cerrar' : 'Pagar'}
                    </Button>
                  </motion.div>
                </>
              ) : (
                <motion.div whileTap={tapScale}>
                  <Button
                    onClick={onCreateOrder}
                    disabled={isCreateDisabled}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
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
