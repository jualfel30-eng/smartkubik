import { Eye, FileText, ChefHat, MessageCircle, XCircle, Receipt, ReceiptText, RotateCcw } from 'lucide-react';

/**
 * Acciones secundarias de una orden, compartidas entre el bottom-sheet mobile
 * (OrderActionSheet) y el dropdown desktop (OrdersSmartTable). Mantener una sola
 * fuente evita que las dos vistas deriven.
 */
export const SECONDARY_ACTIONS = [
  { id: 'view-detail', label: 'Ver detalle completo', icon: Eye },
  {
    id: 'request-payment',
    label: 'Pedir comprobante al cliente',
    sublabel: 'Le envías un enlace por WhatsApp para que pague',
    icon: ReceiptText,
    requires: 'can-request-payment',
  },
  { id: 'invoice', label: 'Generar factura', icon: Receipt, requires: 'paid' },
  { id: 'view-invoice', label: 'Ver factura', icon: FileText, requires: 'has-invoice' },
  { id: 'kitchen', label: 'Enviar a cocina', icon: ChefHat, requires: 'restaurant' },
  { id: 'notify', label: 'Notificar al cliente', icon: MessageCircle },
  { id: 'reopen', label: 'Reabrir orden', icon: RotateCcw, requires: 'cancelled' },
  { id: 'cancel', label: 'Cancelar orden', icon: XCircle, danger: true, requires: 'not-cancelled' },
];

export function passesRequires(action, ctx) {
  if (!action.requires) return true;
  switch (action.requires) {
    case 'paid':
      return ctx.isPaid && !ctx.hasInvoice;
    case 'has-invoice':
      return ctx.hasInvoice;
    case 'restaurant':
      return ctx.restaurantEnabled;
    case 'cancelled':
      return ctx.isCancelled;
    case 'not-cancelled':
      return !ctx.isCancelled;
    case 'can-request-payment':
      // Tres compuertas: permiso, no pagada aún, y no es orden de storefront
      // (esas auto-emiten PaymentRequests upstream).
      return ctx.canRequestPayment && !ctx.isPaid && !ctx.isStorefrontOrder;
    default:
      return true;
  }
}

/**
 * Construye el contexto de evaluación de gates a partir de la orden + flags del
 * tenant/usuario.
 */
export function buildActionContext(order, { restaurantEnabled = false, canRequestPayment = false } = {}) {
  return {
    isPaid: order?.paymentStatus === 'paid',
    isCancelled: order?.status === 'cancelled' || order?.status === 'refunded',
    hasInvoice: Boolean(order?.billingDocumentId),
    isStorefrontOrder: order?.source === 'storefront',
    restaurantEnabled,
    canRequestPayment,
  };
}

/**
 * Devuelve las acciones secundarias aplicables a la orden según el contexto,
 * opcionalmente excluyendo ids (p.ej. 'request-payment' cuando ya tiene botón propio).
 */
export function getSecondaryActions(order, ctx, { exclude = [] } = {}) {
  return SECONDARY_ACTIONS.filter(
    (a) => !exclude.includes(a.id) && passesRequires(a, ctx),
  );
}
