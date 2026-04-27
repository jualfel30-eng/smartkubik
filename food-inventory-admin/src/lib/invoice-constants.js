// Unified status, aging, and urgency constants for AP and AR modules.
// Single source of truth — import from here, never hardcode status strings.

export const PAYABLE_STATUS = {
  open: { label: 'Pendiente', variant: 'outline', color: 'text-muted-foreground' },
  partially_paid: { label: 'Parcial', variant: 'secondary', color: 'text-yellow-600 dark:text-yellow-400' },
  paid: { label: 'Pagado', variant: 'default', color: 'text-emerald-600 dark:text-emerald-400' },
  void: { label: 'Anulado', variant: 'destructive', color: 'text-red-600 dark:text-red-400' },
  draft: { label: 'Borrador', variant: 'outline', color: 'text-muted-foreground' },
};

export const AR_STATUS = {
  pending: { label: 'Pendiente', variant: 'outline', color: 'text-muted-foreground' },
  partial: { label: 'Parcial', variant: 'secondary', color: 'text-yellow-600 dark:text-yellow-400' },
  paid: { label: 'Pagado', variant: 'default', color: 'text-emerald-600 dark:text-emerald-400' },
  overdue: { label: 'Vencida', variant: 'destructive', color: 'text-red-600 dark:text-red-400' },
};

export const AGING_BUCKETS = {
  current: { label: 'Al día', color: 'emerald', icon: 'CheckCircle2' },
  days30: { label: '1-30 días', color: 'yellow', icon: 'Clock' },
  days60: { label: '31-60 días', color: 'orange', icon: 'AlertTriangle' },
  days90plus: { label: '60+ días', color: 'red', icon: 'AlertTriangle' },
};

export const URGENCY_STYLES = {
  overdue: 'border-l-4 border-l-red-500 bg-red-500/10 dark:bg-red-500/15',
  'due-soon': 'border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10',
  current: 'border-l-4 border-l-emerald-500',
};

export const getUrgency = (dueDate) => {
  if (!dueDate) return 'current';
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  if (days > 0) return 'overdue';
  if (days > -7) return 'due-soon';
  return 'current';
};

export const getDaysLabel = (dueDate) => {
  if (!dueDate) return null;
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  if (days > 0) return { text: `Vencida hace ${days} día${days === 1 ? '' : 's'}`, className: 'text-red-500 dark:text-red-400 text-xs font-medium' };
  if (days === 0) return { text: 'Vence hoy', className: 'text-amber-600 dark:text-amber-400 text-xs font-medium' };
  if (days > -7) return { text: `Vence en ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`, className: 'text-amber-600 dark:text-amber-400 text-xs' };
  return null;
};

export const getPayableStatusInfo = (status) => {
  return PAYABLE_STATUS[status] || PAYABLE_STATUS.open;
};

export const getARStatusInfo = (status, dueDate) => {
  if (status === 'paid') return AR_STATUS.paid;
  if (status === 'partial') return AR_STATUS.partial;
  const isOverdue = dueDate && new Date(dueDate) < new Date();
  if (isOverdue) return AR_STATUS.overdue;
  return AR_STATUS.pending;
};

export const getTotalAmount = (lines) =>
  (lines || []).reduce((acc, line) => acc + Number(line.amount || 0), 0);

export const EXPENSE_TYPES = [
  { value: 'purchase_order', label: 'Factura de Compra' },
  { value: 'service_payment', label: 'Pago de Servicio' },
  { value: 'utility_bill', label: 'Servicio Público' },
  { value: 'payroll', label: 'Nómina' },
  { value: 'other', label: 'Otro' },
];
