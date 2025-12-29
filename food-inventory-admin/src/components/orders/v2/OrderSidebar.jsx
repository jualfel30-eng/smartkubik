import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Sección scrolleable */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {/* Datos del Cliente - Compacto */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Cliente</Label>
              </div>
              <div className="text-sm space-y-1">
                {customerName && (
                  <div>
                    <span className="font-medium">{customerName}</span>
                  </div>
                )}
                {customerRif && (
                  <div className="text-muted-foreground">
                    {taxType}-{customerRif}
                  </div>
                )}
                {customerPhone && (
                  <div className="text-muted-foreground">
                    📞 {customerPhone}
                  </div>
                )}
                {customerAddress && (
                  <div className="text-muted-foreground text-xs">
                    📍 {customerAddress}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items del Pedido */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-semibold mb-3 block">
                Items ({items.length})
              </Label>
              {items.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No hay productos agregados
                </div>
              ) : (
                <div className="space-y-2">
                  {itemsTableContent}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Método de Entrega */}
          {deliveryContent && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-semibold mb-2 block">
                  Entrega
                </Label>
                {deliveryContent}
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="notes" className="text-sm font-semibold mb-2 block">
                Notas Adicionales
              </Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Instrucciones especiales, observaciones..."
                className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none"
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Resumen y Botón - Sticky en bottom */}
      <div className="pt-4 pb-2 bg-background border-t mt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
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
                <span>IVA (16%):</span>
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
                  <span>IGTF (3%):</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
