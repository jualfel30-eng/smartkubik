import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useCountryPlugin } from '@/country-plugins/CountryPluginContext';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber.jsx';

/**
 * OrderSummaryBreakdown — detailed price breakdown (subtotal, IVA, discounts, etc.)
 * Extracted from OrderSidebar for use in the scrollable area of the desktop POS.
 */
export function OrderSummaryBreakdown({
  totals,
  shippingCost,
  calculatingShipping,
  bcvRate,
  loadingRate,
  generalDiscountPercentage,
  onOpenGeneralDiscount,
  canApplyDiscounts,
}) {
  const plugin = useCountryPlugin();
  const defaultTax = plugin.taxEngine.getDefaultTaxes()[0];
  const transactionTax = plugin.taxEngine.getTransactionTaxes({ paymentMethodId: 'efectivo_usd' })[0];
  const ivaLabel = defaultTax ? `${defaultTax.type} (${defaultTax.rate}%):` : 'IVA (16%):';
  const igtfLabel = transactionTax ? `${transactionTax.type} (${transactionTax.rate}%):` : 'IGTF (3%):';

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-card">
      <p className="text-sm font-semibold">Resumen</p>
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
            <span>Envio:</span>
            <span>{calculatingShipping ? '...' : `$${shippingCost.toFixed(2)}`}</span>
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
              Cliente Contribuyente Especial - Retencion a pagar al SENIAT
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
    </div>
  );
}
