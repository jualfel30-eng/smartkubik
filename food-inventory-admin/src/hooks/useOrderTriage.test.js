import { describe, it, expect } from 'vitest';
import { classifyOrder } from './useOrderTriage';

const NOW = new Date('2026-05-09T12:00:00.000Z');

const make = (overrides = {}) => ({
  status: 'pending',
  paymentStatus: 'pending',
  totalAmount: 100,
  paidAmount: 0,
  createdAt: NOW.toISOString(),
  ...overrides,
});

describe('classifyOrder', () => {
  it('returns "pending" when order is null/undefined', () => {
    expect(classifyOrder(null, NOW)).toBe('pending');
    expect(classifyOrder(undefined, NOW)).toBe('pending');
  });

  it('returns "cancelled" when status is cancelled', () => {
    expect(classifyOrder(make({ status: 'cancelled' }), NOW)).toBe('cancelled');
  });

  it('returns "cancelled" when status is refunded', () => {
    expect(classifyOrder(make({ status: 'refunded' }), NOW)).toBe('cancelled');
  });

  it('returns "paid" when paymentStatus is paid', () => {
    expect(classifyOrder(make({ paymentStatus: 'paid', paidAmount: 100 }), NOW)).toBe('paid');
  });

  it('returns "paid" when balance <= 0.01 even if paymentStatus mismatched', () => {
    expect(classifyOrder(make({ paymentStatus: 'partial', paidAmount: 100 }), NOW)).toBe('paid');
  });

  it('returns "overdue" when unpaid and createdAt > 5 days', () => {
    const old = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(classifyOrder(make({ createdAt: old }), NOW)).toBe('overdue');
  });

  it('returns "today" when unpaid and createdAt is today', () => {
    const today = new Date(NOW.getTime()).toISOString();
    expect(classifyOrder(make({ createdAt: today }), NOW)).toBe('today');
  });

  it('returns "pending" when unpaid and createdAt is yesterday (1-5 days)', () => {
    const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(classifyOrder(make({ createdAt: yesterday }), NOW)).toBe('pending');
  });

  it('treats delivery_note effective total = subtotal + shipping', () => {
    const order = make({
      billingDocumentType: 'delivery_note',
      subtotal: 80,
      shippingCost: 10,
      totalAmount: 100,
      paidAmount: 90,
    });
    expect(classifyOrder(order, NOW)).toBe('paid');
  });
});
