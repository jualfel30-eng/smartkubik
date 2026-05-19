import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ARActionSheet from './ARActionSheet';

const makeRow = (overrides = {}) => ({
  orderNumber: 'ORD-042',
  customerName: 'Beta Corp',
  balance: '750',
  customerPhone: '+584121234567',
  dueDate: new Date(Date.now() - 5 * 86400000).toISOString(), // vencida hace 5 días
  status: 'pending',
  ...overrides,
});

describe('ARActionSheet', () => {
  let windowOpenSpy;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('no renderiza nada cuando receivable es null', () => {
    const { container } = render(
      <ARActionSheet open={true} onClose={vi.fn()} receivable={null}
        onRegisterPayment={vi.fn()} onSendPaymentLink={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  describe('cuando está abierto con un receivable', () => {
    const onClose = vi.fn();
    const onRegisterPayment = vi.fn();
    const onSendPaymentLink = vi.fn();
    const row = makeRow();

    beforeEach(() => {
      onClose.mockClear();
      onRegisterPayment.mockClear();
      onSendPaymentLink.mockClear();

      render(
        <ARActionSheet
          open={true}
          onClose={onClose}
          receivable={row}
          canSendPaymentLink={true}
          onRegisterPayment={onRegisterPayment}
          onSendPaymentLink={onSendPaymentLink}
        />
      );
    });

    it('muestra el nombre del cliente', () => {
      expect(screen.getByText('Beta Corp')).toBeInTheDocument();
    });

    it('muestra el número de orden', () => {
      expect(screen.getByText(/ORD-042/)).toBeInTheDocument();
    });

    it('muestra el botón "Registrar cobro ahora"', () => {
      expect(screen.getByRole('button', { name: /registrar cobro ahora/i })).toBeInTheDocument();
    });

    it('muestra el botón "Enviar link de pago" cuando canSendPaymentLink=true', () => {
      expect(screen.getByRole('button', { name: /enviar link de pago/i })).toBeInTheDocument();
    });

    it('muestra el botón de recordatorio WhatsApp', () => {
      expect(screen.getByRole('button', { name: /recordatorio por whatsapp/i })).toBeInTheDocument();
    });

    it('llama onClose y onRegisterPayment al hacer clic en "Registrar cobro"', async () => {
      await userEvent.click(screen.getByRole('button', { name: /registrar cobro ahora/i }));
      expect(onClose).toHaveBeenCalledOnce();
      expect(onRegisterPayment).toHaveBeenCalledWith(row);
    });

    it('llama onClose y onSendPaymentLink al hacer clic en "Enviar link"', async () => {
      await userEvent.click(screen.getByRole('button', { name: /enviar link de pago/i }));
      expect(onClose).toHaveBeenCalledOnce();
      expect(onSendPaymentLink).toHaveBeenCalledWith(row);
    });

    it('abre WhatsApp y llama onClose al hacer clic en recordatorio', async () => {
      await userEvent.click(screen.getByRole('button', { name: /recordatorio por whatsapp/i }));
      expect(windowOpenSpy).toHaveBeenCalledOnce();
      const url = windowOpenSpy.mock.calls[0][0];
      expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
      expect(decodeURIComponent(url)).toContain('Beta Corp');
      expect(decodeURIComponent(url)).toContain('ORD-042');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('oculta el botón de link de pago cuando canSendPaymentLink=false', () => {
    render(
      <ARActionSheet
        open={true}
        onClose={vi.fn()}
        receivable={makeRow()}
        canSendPaymentLink={false}
        onRegisterPayment={vi.fn()}
        onSendPaymentLink={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /enviar link de pago/i })).not.toBeInTheDocument();
  });
});
