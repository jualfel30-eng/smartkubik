import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountryPlugin } from '@/country-plugins/CountryPluginContext';
import { motion } from 'framer-motion';
import { tapScale, DUR, EASE } from '@/lib/motion';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';

/**
 * OrderSidebar - Columna derecha con información del pedido
 *
 * compact={true}:  Only renders the items table (desktop POS uses separate
 *                  CheckoutFooter + OrderSummaryBreakdown + CollapsibleSections)
 * compact={false}: Full sidebar with delivery, summary, and buttons (mobile/embedded)
 */
export function OrderSidebar({
  // Customer data
  customerName,
  customerRif,
  taxType,
  customerPhone,
  customerAddress,

  // Order items
  items = [],
  itemsTableContent,
  fullItemsTable,

  // Delivery
  deliveryMethod,
  deliveryContent,

  // Totals
  totals,
  shippingCost,
  calculatingShipping,
  bcvRate,
  loadingRate,

  // Actions
  onCreateOrder,
  isCreateDisabled,

  // Additional
  notes,
  onNotesChange,
  generalDiscountPercentage,
  onOpenGeneralDiscount,
  canApplyDiscounts,
  handleFieldChange,
  onSendToKitchen,
  isEditMode,
  context = 'default',
  tenantCurrency,
  compact = false,
}) {
  const plugin = useCountryPlugin();
  const defaultTax = plugin.taxEngine.getDefaultTaxes()[0];
  const transactionTax = plugin.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' })[0];
  const ivaLabel = defaultTax ? `${defaultTax.type} (${defaultTax.rate}%):` : 'IVA (16%):';
  const igtfLabel = transactionTax ? `${transactionTax.type} (${transactionTax.rate}%):` : 'IGTF (3%):';
  const bottomPadding = context === 'whatsapp' ? 'pb-8' : 'pb-2';

  // ─── Compact mode: items table only (desktop POS) ─────────────────────────
  if (compact) {
    return (
      <motion.div
        layout
        transition={{ duration: DUR.base, ease: EASE.out }}
        className="p-4 border rounded-lg space-y-4 bg-card"
      >
        <Label className="text-base font-semibold">
          Items{' '}
          <motion.span
            key={items.length}
            initial={{ scale: 1.3, color: '#10B981' }}
            animate={{ scale: 1, color: 'inherit' }}
            transition={{ duration: 0.3 }}
          >
            ({items.length})
          </motion.span>
        </Label>
        {fullItemsTable}
      </motion.div>
    );
  }

  // ─── Full mode: items + delivery/notes + summary + buttons (mobile/embedded) ──
  return (
    <div className="flex flex-col">
      <div className="space-y-4">
        <div className="space-y-4">
          {/* Items del Pedido */}
          <motion.div
            layout
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="p-4 border rounded-lg space-y-4 bg-card"
          >
            <Label className="text-base font-semibold">
              Items{' '}
              <motion.span
                key={items.length}
                initial={{ scale: 1.3, color: '#10B981' }}
                animate={{ scale: 1, color: 'inherit' }}
                transition={{ duration: 0.3 }}
              >
                ({items.length})
              </motion.span>
            </Label>
            {fullItemsTable}
          </motion.div>

          {/* Delivery Method and Notes */}
          <div className="p-4 border rounded-lg space-y-4 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Método de Entrega</Label>
                <Select value={deliveryMethod} onValueChange={(value) => handleFieldChange?.('deliveryMethod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione método..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">Venta en Tienda</SelectItem>
                    <SelectItem value="pickup">Pickup (Retiro en tienda)</SelectItem>
                    <SelectItem value="delivery">Delivery (Entrega local)</SelectItem>
                    <SelectItem value="envio_nacional">Envío Nacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label htmlFor="notesInline" className="text-base font-semibold">Notas Adicionales</Label>
                <textarea
                  id="notesInline"
                  value={notes || ''}
                  onChange={(e) => onNotesChange?.(e.target.value)}
                  placeholder="Instrucciones especiales, observaciones..."
                  className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary + Buttons */}
      <div className={`pt-4 ${bottomPadding} bg-background`}>
        <div className="p-4 border rounded-lg space-y-4 bg-card">
          <Label className="text-base font-semibold">Resumen</Label>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>

            {generalDiscountPercentage > 0 && (
              <>
                <div className="flex justify-between text-sm text-success">
                  <span>Descuento ({generalDiscountPercentage}%):</span>
                  <span>-${totals.generalDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal c/descuento:</span>
                  <span>${totals.subtotalAfterDiscount.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm">
              <span>{ivaLabel}</span>
              <span>${totals.ivaAfterDiscount.toFixed(2)}</span>
            </div>

            {shippingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Envío:</span>
                <span>{calculatingShipping ? '...' : `$$${shippingCost.toFixed(2)}`}</span>
              </div>
            )}

            {totals.igtf > 0 && (
              <div className="flex justify-between text-sm">
                <span>{igtfLabel}</span>
                <span>${totals.igtf.toFixed(2)}</span>
              </div>
            )}

            {totals.ivaWithholdingAmount > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                  <span>Ret. IVA ({totals.ivaWithholdingPercentage}%):</span>
                  <span>-${totals.ivaWithholdingAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cliente Contribuyente Especial - Retención a pagar al SENIAT
                </p>
              </>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span className="text-primary">
                <AnimatedNumber value={totals.total} format={(n) => `$${n.toFixed(2)}`} duration={0.4} />
              </span>
            </div>

            {totals.ivaWithholdingAmount > 0 && (
              <div className="flex justify-between text-sm font-semibold text-amber-600 dark:text-amber-400">
                <span>A cobrar (neto):</span>
                <span>
                  <AnimatedNumber value={totals.totalWithWithholding} format={(n) => `$${n.toFixed(2)}`} duration={0.4} />
                </span>
              </div>
            )}

            {bcvRate && !loadingRate && (
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Tasa BCV:</span>
                <span>Bs. {bcvRate.toFixed(2)} / {plugin.currencyEngine.getSecondaryCurrencies()[0]?.code ?? 'USD'}</span>
              </div>
            )}

            {bcvRate && totals.total > 0 && (
              <div className="flex justify-between text-sm font-semibold text-info">
                <span>Total en Bs.:</span>
                <span>
                  <AnimatedNumber value={totals.total * bcvRate} format={(n) => `Bs. ${n.toFixed(2)}`} duration={0.4} />
                </span>
              </div>
            )}
          </div>

          {canApplyDiscounts && (
            <Button variant="outline" size="sm" onClick={onOpenGeneralDiscount} className="w-full">
              {generalDiscountPercentage > 0
                ? `Modificar Descuento (${generalDiscountPercentage}%)`
                : 'Aplicar Descuento General'}
            </Button>
          )}

          <div className="flex flex-col gap-2">
            {onSendToKitchen ? (
              <>
                {!isEditMode && (
                  <motion.div whileTap={tapScale}>
                    <Button onClick={onSendToKitchen} disabled={isCreateDisabled} className="w-full bg-orange-600 hover:bg-orange-700 text-white" size="lg">
                      Enviar a Cocina
                    </Button>
                  </motion.div>
                )}
                <motion.div whileTap={tapScale}>
                  <Button onClick={onCreateOrder} disabled={isCreateDisabled} className="w-full bg-success hover:bg-green-700 text-white" size="lg">
                    {isEditMode ? 'Pagar / Cerrar' : 'Pagar Inmediato'}
                  </Button>
                </motion.div>
              </>
            ) : (
              <motion.div whileTap={tapScale}>
                <Button onClick={onCreateOrder} disabled={isCreateDisabled} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                  {isEditMode ? 'Actualizar Orden' : 'Crear Orden'}
                </Button>
              </motion.div>
            )}
          </div>

          {isCreateDisabled && items.length === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Agrega productos para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
