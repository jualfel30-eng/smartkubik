const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function classifyOrder(order, now = new Date()) {
  if (!order) return 'pending';

  const status = order.status;
  if (status === 'cancelled' || status === 'refunded') return 'cancelled';

  const effectiveTotal = order.billingDocumentType === 'delivery_note'
    ? (order.subtotal || 0) + (order.shippingCost || 0)
    : (order.totalAmount || 0);
  const balance = effectiveTotal - (order.paidAmount || 0);

  const isPaid = order.paymentStatus === 'paid' || balance <= 0.01;
  if (isPaid) return 'paid';

  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    const ageDays = (now.getTime() - createdAt.getTime()) / MS_PER_DAY;
    if (ageDays > 5) return 'overdue';

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (createdAt.getTime() >= today.getTime()) return 'today';
  }

  return 'pending';
}

export function useOrderTriage(order, now) {
  return classifyOrder(order, now);
}

export default useOrderTriage;
