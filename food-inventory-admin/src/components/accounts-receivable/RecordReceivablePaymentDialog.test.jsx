import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecordReceivablePaymentDialog from './RecordReceivablePaymentDialog';

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn().mockImplementation((url) => {
    if (url === '/bank-accounts') return Promise.resolve([]);
    if (url === '/exchange-rate/bcv') return Promise.resolve({ rate: 36.5 });
    return Promise.resolve({});
  }),
  createPayment: vi.fn().mockResolvedValue({ _id: 'pay-123' }),
}));

vi.mock('@/lib/payment-methods', () => ({
  PAYMENT_METHODS: [
    { id: 'transferencia_usd', name: 'Transferencia USD' },
    { id: 'efectivo_ves',       name: 'Efectivo VES' },
  ],
  isVesMethod: (id) => id === 'efectivo_ves',
  mapPaymentMethodToName: (id) => ({ transferencia_usd: 'Transferencia USD', efectivo_ves: 'Efectivo VES' }[id] ?? id),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
// ─────────────────────────────────────────────────────────────────────────────

const receivable = {
  orderId: 'order-abc',
  orderNumber: 'ORD-9999',
  customerName: 'Gamma LLC',
  balance: 500,
  totalAmount: 500,
  paidAmount: 0,
};

describe('RecordReceivablePaymentDialog', () => {
  const onClose = vi.fn();
  const onPaymentSuccess = vi.fn();
  const onShowReceipt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (overrides = {}) =>
    render(
      <RecordReceivablePaymentDialog
        isOpen={true}
        onClose={onClose}
        receivable={receivable}
        onPaymentSuccess={onPaymentSuccess}
        onShowReceipt={onShowReceipt}
        {...overrides}
      />
    );

  it('no renderiza cuando receivable es null', () => {
    const { container } = render(
      <RecordReceivablePaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        receivable={null}
        onPaymentSuccess={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('no renderiza cuando isOpen=false', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el título y los datos del receivable', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /registrar cobro/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/ORD-9999/)).toBeInTheDocument();
    expect(screen.getByText(/Gamma LLC/)).toBeInTheDocument();
  });

  it('pre-rellena el monto con el saldo pendiente', async () => {
    setup();
    await waitFor(() => {
      const input = screen.getByRole('spinbutton');
      expect(input.value).toBe('500');
    });
  });

  it('muestra error si el monto es 0 o negativo al enviar', async () => {
    setup();
    await waitFor(() => screen.getByRole('spinbutton'));

    const amountInput = screen.getByRole('spinbutton');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '0');

    await userEvent.click(screen.getByRole('button', { name: /registrar cobro/i }));
    expect(await screen.findByText(/monto debe ser mayor a cero/i)).toBeInTheDocument();
  });

  it('llama onShowReceipt después de un pago exitoso', async () => {
    const { createPayment } = await import('@/lib/api');
    vi.mocked(createPayment).mockResolvedValueOnce({ _id: 'pay-ok' });

    setup();
    await waitFor(() => screen.getByRole('spinbutton'));
    await userEvent.click(screen.getByRole('button', { name: /registrar cobro/i }));

    await waitFor(() => {
      expect(onShowReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          receivable: expect.objectContaining({ orderNumber: 'ORD-9999' }),
          amount: 500,
        })
      );
    });
  });

  it('llama onPaymentSuccess después de un pago exitoso', async () => {
    const { createPayment } = await import('@/lib/api');
    vi.mocked(createPayment).mockResolvedValueOnce({ _id: 'pay-ok' });

    setup();
    await waitFor(() => screen.getByRole('spinbutton'));
    await userEvent.click(screen.getByRole('button', { name: /registrar cobro/i }));

    await waitFor(() => {
      expect(onPaymentSuccess).toHaveBeenCalledOnce();
    });
  });

  it('NO llama onShowReceipt si no se pasa la prop', async () => {
    const { createPayment } = await import('@/lib/api');
    vi.mocked(createPayment).mockResolvedValueOnce({ _id: 'pay-ok' });

    render(
      <RecordReceivablePaymentDialog
        isOpen={true}
        onClose={vi.fn()}
        receivable={receivable}
        onPaymentSuccess={vi.fn()}
        // onShowReceipt no se pasa
      />
    );

    await waitFor(() => screen.getByRole('spinbutton'));
    await userEvent.click(screen.getByRole('button', { name: /registrar cobro/i }));
    // No debe lanzar excepción; onShowReceipt es opcional
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  it('llama onClose al hacer clic en Cancelar', async () => {
    setup();
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
