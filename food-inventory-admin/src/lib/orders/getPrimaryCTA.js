/**
 * Pure function: returns the primary contextual CTA for an order based on
 * (paymentStatus, status, hasInvoice). Mirrors the table in
 * docs/PROMPT-MOBILE-FIRST-ORDERS-HISTORY-REDESIGN.md section 1.4.
 *
 * Output shape: { id, label, subLabel, action, variant }
 *   id: stable string identifier the orchestrator switches on
 *   label: short button text
 *   subLabel: helper text under CTA
 *   action: 'pay' | 'invoice' | 'view-invoice' | 'complete' | 'reopen'
 *   variant: 'default' | 'outline' | 'destructive' (Shadcn Button variant)
 */

function effectiveBalance(order) {
  const effectiveTotal = order?.billingDocumentType === 'delivery_note'
    ? (order?.subtotal || 0) + (order?.shippingCost || 0)
    : (order?.totalAmount || 0);
  return Math.max(0, effectiveTotal - (order?.paidAmount || 0));
}

function fmt(amount) {
  return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getPrimaryCTA(order) {
  if (!order) {
    return { id: 'noop', label: 'Ver detalle', subLabel: '', action: 'view', variant: 'outline' };
  }

  const status = order.status;
  const paymentStatus = order.paymentStatus;
  const hasInvoice = Boolean(order.billingDocumentId);
  const balance = effectiveBalance(order);
  const totalAmount = order.totalAmount || 0;

  if (status === 'cancelled' || status === 'refunded') {
    return {
      id: 'reopen',
      label: 'Reabrir orden',
      subLabel: 'Permite reintentar el cobro',
      action: 'reopen',
      variant: 'outline',
    };
  }

  const isEffectivelyPaid = paymentStatus === 'paid' || balance <= 0.01;

  if (!isEffectivelyPaid && (paymentStatus === 'pending' || balance >= totalAmount - 0.01)) {
    return {
      id: 'pay-full',
      label: `Cobrar ${fmt(balance || totalAmount)}`,
      subLabel: 'Registra el pago para continuar',
      action: 'pay',
      variant: 'default',
    };
  }

  if (!isEffectivelyPaid && (paymentStatus === 'partial' || (balance > 0.01 && balance < totalAmount))) {
    return {
      id: 'pay-balance',
      label: `Cobrar saldo ${fmt(balance)}`,
      subLabel: `Falta ${fmt(balance)} de ${fmt(totalAmount)}`,
      action: 'pay',
      variant: 'default',
    };
  }

  if (isEffectivelyPaid && !hasInvoice && status !== 'delivered') {
    return {
      id: 'invoice',
      label: 'Generar factura',
      subLabel: 'Cobro completo, listo para facturar',
      action: 'invoice',
      variant: 'default',
    };
  }

  if (paymentStatus === 'paid' && hasInvoice && status === 'delivered') {
    return {
      id: 'complete',
      label: 'Marcar completada',
      subLabel: 'Cierra el ciclo de la orden',
      action: 'complete',
      variant: 'outline',
    };
  }

  if (paymentStatus === 'paid' && hasInvoice) {
    return {
      id: 'view-invoice',
      label: 'Ver factura',
      subLabel: 'Factura ya emitida',
      action: 'view-invoice',
      variant: 'outline',
    };
  }

  return {
    id: 'view',
    label: 'Ver detalle',
    subLabel: '',
    action: 'view',
    variant: 'outline',
  };
}

export default getPrimaryCTA;
