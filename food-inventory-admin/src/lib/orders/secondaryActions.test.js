import { describe, it, expect } from 'vitest';
import { buildActionContext, passesRequires, getSecondaryActions } from './secondaryActions';

const make = (overrides = {}) => ({
  status: 'pending',
  paymentStatus: 'pending',
  source: 'pos',
  ...overrides,
});

describe('buildActionContext', () => {
  it('derives flags from the order + tenant flags', () => {
    const ctx = buildActionContext(
      make({ paymentStatus: 'paid', billingDocumentId: 'doc1', source: 'storefront' }),
      { restaurantEnabled: true, canRequestPayment: true },
    );
    expect(ctx).toMatchObject({
      isPaid: true,
      isCancelled: false,
      hasInvoice: true,
      isStorefrontOrder: true,
      restaurantEnabled: true,
      canRequestPayment: true,
    });
  });
});

describe('passesRequires (request-payment gate)', () => {
  it('passes for an unpaid non-storefront order with permission', () => {
    const ctx = buildActionContext(make(), { canRequestPayment: true });
    const action = { requires: 'can-request-payment' };
    expect(passesRequires(action, ctx)).toBe(true);
  });

  it('fails for a storefront order (auto-issues payment request upstream)', () => {
    const ctx = buildActionContext(make({ source: 'storefront' }), { canRequestPayment: true });
    expect(passesRequires({ requires: 'can-request-payment' }, ctx)).toBe(false);
  });

  it('fails when already paid', () => {
    const ctx = buildActionContext(make({ paymentStatus: 'paid' }), { canRequestPayment: true });
    expect(passesRequires({ requires: 'can-request-payment' }, ctx)).toBe(false);
  });

  it('fails without permission', () => {
    const ctx = buildActionContext(make(), { canRequestPayment: false });
    expect(passesRequires({ requires: 'can-request-payment' }, ctx)).toBe(false);
  });
});

describe('passesRequires (can-return gate)', () => {
  const action = { requires: 'can-return' };

  it('passes for a paid, non-cancelled order without fiscal invoice', () => {
    const ctx = buildActionContext(make({ paymentStatus: 'paid' }), {});
    expect(passesRequires(action, ctx)).toBe(true);
  });

  it('fails when the order is not paid', () => {
    const ctx = buildActionContext(make({ paymentStatus: 'partial' }), {});
    expect(passesRequires(action, ctx)).toBe(false);
  });

  it('fails when the order already has a fiscal invoice', () => {
    const ctx = buildActionContext(
      make({ paymentStatus: 'paid', billingDocumentId: 'doc1' }),
      {},
    );
    expect(passesRequires(action, ctx)).toBe(false);
  });

  it('fails when the order is already cancelled/refunded', () => {
    const ctx = buildActionContext(
      make({ paymentStatus: 'paid', status: 'refunded' }),
      {},
    );
    expect(passesRequires(action, ctx)).toBe(false);
  });
});

describe('passesRequires (can-apply-credit gate)', () => {
  const action = { requires: 'can-apply-credit' };

  it('passes for an unpaid, non-cancelled order with a customer', () => {
    const ctx = buildActionContext(
      make({ paymentStatus: 'partial', customerId: 'c1' }),
      {},
    );
    expect(passesRequires(action, ctx)).toBe(true);
  });

  it('fails when the order is already paid', () => {
    const ctx = buildActionContext(
      make({ paymentStatus: 'paid', customerId: 'c1' }),
      {},
    );
    expect(passesRequires(action, ctx)).toBe(false);
  });

  it('fails when the order has no customer', () => {
    const ctx = buildActionContext(make({ paymentStatus: 'partial' }), {});
    expect(passesRequires(action, ctx)).toBe(false);
  });
});

describe('getSecondaryActions', () => {
  it('excludes ids passed in options', () => {
    const ctx = buildActionContext(make(), { canRequestPayment: true });
    const ids = getSecondaryActions(make(), ctx, { exclude: ['request-payment'] }).map((a) => a.id);
    expect(ids).not.toContain('request-payment');
    expect(ids).toContain('view-detail');
  });

  it('incluye "return" y "exchange" en una orden pagada sin factura', () => {
    const order = make({ paymentStatus: 'paid', customerId: 'c1' });
    const ctx = buildActionContext(order, {});
    const ids = getSecondaryActions(order, ctx).map((a) => a.id);
    expect(ids).toContain('return');
    expect(ids).toContain('exchange');
  });

  it('includes "cancel" for a non-cancelled order and "reopen" only when cancelled', () => {
    const pendingCtx = buildActionContext(make(), {});
    const pendingIds = getSecondaryActions(make(), pendingCtx).map((a) => a.id);
    expect(pendingIds).toContain('cancel');
    expect(pendingIds).not.toContain('reopen');

    const cancelledCtx = buildActionContext(make({ status: 'cancelled' }), {});
    const cancelledIds = getSecondaryActions(make({ status: 'cancelled' }), cancelledCtx).map((a) => a.id);
    expect(cancelledIds).toContain('reopen');
    expect(cancelledIds).not.toContain('cancel');
  });
});
