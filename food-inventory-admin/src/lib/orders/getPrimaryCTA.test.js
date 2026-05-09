import { describe, it, expect } from 'vitest';
import { getPrimaryCTA } from './getPrimaryCTA';

const make = (overrides = {}) => ({
  status: 'pending',
  paymentStatus: 'pending',
  totalAmount: 100,
  paidAmount: 0,
  ...overrides,
});

describe('getPrimaryCTA', () => {
  it('returns "view" for null/undefined', () => {
    expect(getPrimaryCTA(null).id).toBe('noop');
    expect(getPrimaryCTA(undefined).id).toBe('noop');
  });

  it('returns "pay-full" for fully unpaid order', () => {
    const cta = getPrimaryCTA(make());
    expect(cta.id).toBe('pay-full');
    expect(cta.action).toBe('pay');
    expect(cta.label).toContain('100');
  });

  it('returns "pay-balance" for partial payment', () => {
    const cta = getPrimaryCTA(make({ paymentStatus: 'partial', paidAmount: 30 }));
    expect(cta.id).toBe('pay-balance');
    expect(cta.label).toContain('70');
    expect(cta.subLabel).toContain('70');
  });

  it('returns "invoice" for paid order with no invoice yet', () => {
    const cta = getPrimaryCTA(make({ paymentStatus: 'paid', paidAmount: 100, status: 'confirmed' }));
    expect(cta.id).toBe('invoice');
    expect(cta.action).toBe('invoice');
  });

  it('returns "view-invoice" for paid order with existing invoice (not delivered)', () => {
    const cta = getPrimaryCTA(make({
      paymentStatus: 'paid',
      paidAmount: 100,
      status: 'shipped',
      billingDocumentId: 'inv-1',
    }));
    expect(cta.id).toBe('view-invoice');
  });

  it('returns "complete" for paid + delivered + invoiced', () => {
    const cta = getPrimaryCTA(make({
      paymentStatus: 'paid',
      paidAmount: 100,
      status: 'delivered',
      billingDocumentId: 'inv-1',
    }));
    expect(cta.id).toBe('complete');
  });

  it('returns "reopen" for cancelled order', () => {
    const cta = getPrimaryCTA(make({ status: 'cancelled' }));
    expect(cta.id).toBe('reopen');
  });

  it('handles delivery_note effective total correctly', () => {
    const cta = getPrimaryCTA(make({
      billingDocumentType: 'delivery_note',
      subtotal: 80,
      shippingCost: 10,
      totalAmount: 100,
      paidAmount: 90,
    }));
    expect(cta.id).toBe('invoice');
  });
});
