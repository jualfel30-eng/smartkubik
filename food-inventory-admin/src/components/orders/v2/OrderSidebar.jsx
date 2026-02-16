import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountryPlugin } from '@/country-plugins/CountryPluginContext';

/**
 * OrderSidebar - Columna derecha sticky con información del pedido
 * Muestra: datos del cliente, items, método de entrega, y resumen
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
}) {
  const plugin = useCountryPlugin();
  const defaultTax = plugin.taxEngine.getDefaultTaxes()[0];
  const transactionTax = plugin.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' })[0];
  const ivaLabel = defaultTax ? `${defaultTax.type} (${defaultTax.rate}%):` : 'IVA (16%):';
  const igtfLabel = transactionTax ? `${transactionTax.type} (${transactionTax.rate}%):` : 'IGTF (3%):';

  return (
    <div className="flex flex-col">
      {/* Sección scrolleable */}
      <div className="space-y-4">
        <div className="space-y-4">
          {/* Items del Pedido - Tabla Completa */}
          <div className="p-4 border rounded-lg space-y-4 bg-card">
            <Label className="text-base font-semibold">
              Items ({items.length})
            </Label>
            {fullItemsTable}
          </div>

          {/* Delivery Method and Notes Section - ABOVE Summary */}
          <div className="p-4 border rounded-lg space-y-4 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Columna izquierda: Método de Entrega */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Método de Entrega</Label>
                <Select value={deliveryMethod} onValueChange={(value) => handleFieldChange?.('deliveryMethod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione método..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup (Retiro en tienda)</SelectItem>
                    <SelectItem value="delivery">Delivery (Entrega local)</SelectItem>
                    <SelectItem value="envio_nacional">Envío Nacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Columna derecha: Notas Adicionales */}
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

      {/* Resumen y Botón - Sticky en bottom */}
      <div className="pt-4 pb-2 bg-background">
        <div className="p-4 border rounded-lg space-y-4 bg-card">
          <Label className="text-base font-semibold">Resumen</Label>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>

            {generalDiscountPercentage > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
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
                <span>
                  {calculatingShipping ? '...' : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
            )}

            {totals.igtf > 0 && (
              <div className="flex justify-between text-sm">
                <span>{igtfLabel}</span>
                <span>${totals.igtf.toFixed(2)}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span className="text-primary">${totals.total.toFixed(2)}</span>
            </div>

            {bcvRate && !loadingRate && (
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Tasa BCV:</span>
                <span>Bs. {bcvRate.toFixed(2)} / USD</span>
              </div>
            )}

            {bcvRate && totals.total > 0 && (
              <div className="flex justify-between text-sm font-semibold text-blue-600 dark:text-blue-400">
                <span>Total en Bs.:</span>
                <span>Bs. {(totals.total * bcvRate).toFixed(2)}</span>
              </div>
            )}
          </div>

          {canApplyDiscounts && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenGeneralDiscount}
              className="w-full"
            >
              {generalDiscountPercentage > 0
                ? `Modificar Descuento (${generalDiscountPercentage}%)`
                : 'Aplicar Descuento General'
              }
            </Button>
          )}

          <Button
            onClick={onCreateOrder}
            disabled={isCreateDisabled}
            className="w-full"
            size="lg"
          >
            Crear Orden
          </Button>

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
