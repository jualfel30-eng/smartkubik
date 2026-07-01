import { Eye, FileText, ChefHat, MessageCircle, XCircle, Receipt, ReceiptText, RotateCcw, Undo2, Wallet, ArrowLeftRight } from 'lucide-react';

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
  {
    id: 'apply-credit',
    label: 'Aplicar saldo a favor',
    sublabel: 'Usa el crédito del cliente para cubrir el saldo',
    icon: Wallet,
    requires: 'can-apply-credit',
  },
  { id: 'invoice', label: 'Generar factura', icon: Receipt, requires: 'paid' },
  { id: 'view-invoice', label: 'Ver factura', icon: FileText, requires: 'has-invoice' },
  { id: 'kitchen', label: 'Enviar a cocina', icon: ChefHat, requires: 'restaurant' },
  { id: 'notify', label: 'Notificar al cliente', icon: MessageCircle },
  {
    id: 'return',
    label: 'Devolver orden',
    sublabel: 'Reintegra el stock y reembolsa en efectivo',
    icon: Undo2,
    requires: 'can-return',
  },
  {
    id: 'exchange',
    label: 'Cambiar por otro producto',
    sublabel: 'Devuelve a saldo a favor y crea la orden nueva',
    icon: ArrowLeftRight,
    requires: 'can-return',
  },
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
    case 'can-return':
      // Sólo órdenes pagadas, no ya devueltas/canceladas y sin factura fiscal
      // (devolver facturadas requiere Nota de Crédito — fase posterior).
      return ctx.isPaid && !ctx.isCancelled && !ctx.hasInvoice;
    case 'can-apply-credit':
      // Aplicar saldo a favor: orden con saldo pendiente, no cancelada, con
      // cliente. El diálogo muestra el saldo real (0 → mensaje claro).
      return !ctx.isPaid && !ctx.isCancelled && ctx.hasCustomer;
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
    hasCustomer: Boolean(order?.customerId),
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
