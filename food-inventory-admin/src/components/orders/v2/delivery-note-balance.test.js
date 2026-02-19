/**
 * Unit tests for the delivery note balance & payment status calculation rules
 * mirrored from OrdersHistoryV2.jsx.
 *
 * These tests document and protect the logic that was fixed to prevent
 * delivery note orders from showing IVA/IGTF as "pending payment".
 */

import { describe, it, expect } from 'vitest';

// ─── Logic extracted from OrdersHistoryV2.jsx ────────────────────────────────
// These pure functions mirror the inline cell renderer logic so we can unit-test
// it without rendering the full table component.

function getEffectiveTotal(order) {
  // Delivery notes only charge subtotal + shipping; IVA/IGTF are excluded.
  if (order.billingDocumentType === 'delivery_note') {
    return (order.subtotal || 0) + (order.shippingCost || 0);
  }
  return order.totalAmount || 0;
}

function computeBalance(order) {
  const effectiveTotal = getEffectiveTotal(order);
  const rawBalance = effectiveTotal - (order.paidAmount || 0);
  // Clamp to 0 if order is already marked paid (avoids negative display from IGTF rounding)
  return order.paymentStatus === 'paid' && rawBalance < 0 ? 0 : rawBalance;
}

function resolveEffectivePaymentStatus(order) {
  // For delivery note orders that are stored as 'partial' (pre-migration),
  // consider them 'paid' if paidAmount covers the effective total.
  if (order.paymentStatus === 'partial' && order.billingDocumentType === 'delivery_note') {
    const effectiveTotal = getEffectiveTotal(order);
    if ((order.paidAmount || 0) >= effectiveTotal - 0.01) {
      return 'paid';
    }
  }
  return order.paymentStatus;
}
// ─────────────────────────────────────────────────────────────────────────────

describe('getEffectiveTotal', () => {
  it('returns totalAmount for regular invoice orders', () => {
    const order = { billingDocumentType: 'invoice', totalAmount: 116, subtotal: 100, shippingCost: 0 };
    expect(getEffectiveTotal(order)).toBe(116);
  });

  it('returns subtotal + shippingCost for delivery_note orders', () => {
    const order = { billingDocumentType: 'delivery_note', totalAmount: 116, subtotal: 100, shippingCost: 0 };
    expect(getEffectiveTotal(order)).toBe(100);
  });

  it('includes shippingCost for delivery_note orders', () => {
    const order = { billingDocumentType: 'delivery_note', totalAmount: 131, subtotal: 100, shippingCost: 15 };
    expect(getEffectiveTotal(order)).toBe(115);
  });

  it('handles missing shippingCost as zero', () => {
    const order = { billingDocumentType: 'delivery_note', subtotal: 100, totalAmount: 116 };
    expect(getEffectiveTotal(order)).toBe(100);
  });

  it('handles null/undefined gracefully', () => {
    const order = { billingDocumentType: 'delivery_note' };
    expect(getEffectiveTotal(order)).toBe(0);
  });
});

describe('computeBalance', () => {
  it('invoice: shows positive balance when underpaid', () => {
    const order = {
      billingDocumentType: 'invoice',
      totalAmount: 116,
      paidAmount: 80,
      paymentStatus: 'partial',
    };
    expect(computeBalance(order)).toBe(36);
  });

  it('invoice: shows zero balance when fully paid', () => {
    const order = {
      billingDocumentType: 'invoice',
      totalAmount: 116,
      paidAmount: 116,
      paymentStatus: 'paid',
    };
    expect(computeBalance(order)).toBe(0);
  });

  it('delivery_note: shows zero balance when subtotal is fully paid (IVA excluded)', () => {
    const order = {
      billingDocumentType: 'delivery_note',
      totalAmount: 116, // includes IVA — irrelevant
      subtotal: 100,
      shippingCost: 0,
      paidAmount: 100,
      paymentStatus: 'partial', // stored before migration
    };
    expect(computeBalance(order)).toBe(0);
  });

  it('delivery_note: shows positive balance only if subtotal+shipping not yet covered', () => {
    const order = {
      billingDocumentType: 'delivery_note',
      totalAmount: 116,
      subtotal: 100,
      shippingCost: 0,
      paidAmount: 60,
      paymentStatus: 'partial',
    };
    expect(computeBalance(order)).toBe(40);
  });

  it('delivery_note with shipping: balance based on subtotal+shipping', () => {
    const order = {
      billingDocumentType: 'delivery_note',
      totalAmount: 131,
      subtotal: 100,
      shippingCost: 15,
      paidAmount: 115,
      paymentStatus: 'partial',
    };
    expect(computeBalance(order)).toBe(0);
  });

  it('clamps to 0 when order is paid but paidAmount slightly exceeds (IGTF rounding)', () => {
    const order = {
      billingDocumentType: 'invoice',
      totalAmount: 100,
      paidAmount: 100.3, // includes IGTF
      paymentStatus: 'paid',
    };
    expect(computeBalance(order)).toBe(0);
  });
});

describe('resolveEffectivePaymentStatus', () => {
  it('returns stored status for non-delivery-note orders', () => {
    const order = {
      billingDocumentType: 'invoice',
      paymentStatus: 'partial',
      paidAmount: 80,
      totalAmount: 116,
      subtotal: 100,
      shippingCost: 0,
    };
    expect(resolveEffectivePaymentStatus(order)).toBe('partial');
  });

  it('upgrades delivery_note "partial" → "paid" when effective total covered', () => {
    const order = {
      billingDocumentType: 'delivery_note',
      paymentStatus: 'partial',
      paidAmount: 100,
      totalAmount: 116, // IVA included in totalAmount but not charged
      subtotal: 100,
      shippingCost: 0,
    };
    expect(resolveEffectivePaymentStatus(order)).toBe('paid');
  });

  it('keeps "partial" for delivery_note when genuinely underpaid', () => {
    const order = {
      billingDocumentType: 'delivery_note',
      paymentStatus: 'partial',
      paidAmount: 50,
      totalAmount: 116,
      subtotal: 100,
      shippingCost: 0,
    };
    expect(resolveEffectivePaymentStatus(order)).toBe('partial');
  });

  it('does not downgrade a "paid" delivery_note', () => {
    const order = {
      billingDocumentType: 'delivery_note',
      paymentStatus: 'paid',
      paidAmount: 100,
      totalAmount: 116,
      subtotal: 100,
      shippingCost: 0,
    };
    expect(resolveEffectivePaymentStatus(order)).toBe('paid');
  });

  it('handles tolerance of ±0.01 for floating point', () => {
    // paidAmount is 99.995 — within 0.01 of effectiveTotal 100
    const order = {
      billingDocumentType: 'delivery_note',
      paymentStatus: 'partial',
      paidAmount: 99.995,
      totalAmount: 116,
      subtotal: 100,
      shippingCost: 0,
    };
    expect(resolveEffectivePaymentStatus(order)).toBe('paid');
  });
});
