import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ARPaymentReceiptModal from './ARPaymentReceiptModal';

// mapPaymentMethodToName usa una lookup table simple
vi.mock('@/lib/payment-methods', () => ({
  mapPaymentMethodToName: (id) => ({ transferencia_usd: 'Transferencia USD', efectivo: 'Efectivo' }[id] ?? id),
}));

const makeData = (overrides = {}) => ({
  receivable: {
    customerName: 'ACME Inc',
    orderNumber: 'ORD-2401',
    customerPhone: '+584121234567',
  },
  amount: 500,
  method: 'transferencia_usd',
  reference: 'TXN-99999',
  date: '2024-05-15',
  ...overrides,
});

describe('ARPaymentReceiptModal', () => {
  it('no renderiza cuando data es null', () => {
    render(<ARPaymentReceiptModal open={false} onClose={vi.fn()} data={null} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no renderiza cuando open=false aunque haya data', () => {
    render(<ARPaymentReceiptModal open={false} onClose={vi.fn()} data={makeData()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('cuando está abierto', () => {
    let windowOpenSpy;
    let printSpy;

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
      printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
      printSpy.mockRestore();
    });

    const setup = (data = makeData()) =>
      render(<ARPaymentReceiptModal open={true} onClose={vi.fn()} data={data} />);

    it('muestra nombre del cliente', () => {
      setup();
      expect(screen.getAllByText('ACME Inc').length).toBeGreaterThan(0);
    });

    it('muestra número de orden', () => {
      setup();
      // Puede haber múltiples elementos con "#ORD-2401" (visible + copia print)
      expect(screen.getAllByText(/#ORD-2401/).length).toBeGreaterThan(0);
    });

    it('muestra el método de pago traducido', () => {
      setup();
      expect(screen.getAllByText('Transferencia USD').length).toBeGreaterThan(0);
    });

    it('muestra la referencia cuando está disponible', () => {
      setup();
      expect(screen.getAllByText('TXN-99999').length).toBeGreaterThan(0);
    });

    it('muestra "Nuevo saldo: $0.00" o similar', () => {
      setup();
      expect(screen.getByText(/nuevo saldo/i)).toBeInTheDocument();
    });

    it('llama window.print al hacer clic en Imprimir', async () => {
      setup();
      await userEvent.click(screen.getByRole('button', { name: /imprimir/i }));
      expect(printSpy).toHaveBeenCalledOnce();
    });

    it('abre WhatsApp con el teléfono del cliente al hacer clic en Compartir', async () => {
      setup();
      await userEvent.click(screen.getByRole('button', { name: /compartir/i }));
      expect(windowOpenSpy).toHaveBeenCalledOnce();
      const url = windowOpenSpy.mock.calls[0][0];
      expect(url).toMatch(/wa\.me\/584121234567/);
      expect(decodeURIComponent(url)).toContain('ACME Inc');
      expect(decodeURIComponent(url)).toContain('ORD-2401');
    });

    it('abre WhatsApp genérico cuando el cliente no tiene teléfono', async () => {
      setup(makeData({ receivable: { customerName: 'Sin Tel', orderNumber: 'X1', customerPhone: null } }));
      await userEvent.click(screen.getByRole('button', { name: /compartir/i }));
      expect(windowOpenSpy).toHaveBeenCalledOnce();
      const url = windowOpenSpy.mock.calls[0][0];
      expect(url).toMatch(/wa\.me\/\?text=/);
    });

    it('llama onClose al hacer clic en Cerrar', async () => {
      const onClose = vi.fn();
      render(<ARPaymentReceiptModal open={true} onClose={onClose} data={makeData()} />);
      await userEvent.click(screen.getByRole('button', { name: /cerrar/i }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
