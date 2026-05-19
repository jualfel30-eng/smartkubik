import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ARCustomerPanel from './ARCustomerPanel';

const past   = (d) => new Date(Date.now() - d * 86400000).toISOString();
const future = (d) => new Date(Date.now() + d * 86400000).toISOString();

const allData = [
  { orderNumber: 'ORD-1', customerName: 'ACME Inc', balance: '500', dueDate: past(5),   status: 'pending' },
  { orderNumber: 'ORD-2', customerName: 'ACME Inc', balance: '0',   dueDate: past(10),  status: 'paid' },
  { orderNumber: 'ORD-3', customerName: 'Otra Empresa', balance: '300', dueDate: future(10), status: 'pending' },
];

describe('ARCustomerPanel', () => {
  it('no renderiza cuando está cerrado', () => {
    render(
      <ARCustomerPanel
        open={false}
        onClose={vi.fn()}
        customerName="ACME Inc"
        allData={allData}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('cuando está abierto', () => {
    const setup = (overrides = {}) => {
      render(
        <ARCustomerPanel
          open={true}
          onClose={vi.fn()}
          customerName="ACME Inc"
          allData={allData}
          onAction={vi.fn()}
          {...overrides}
        />
      );
    };

    it('muestra el nombre del cliente como título', () => {
      setup();
      expect(screen.getAllByText('ACME Inc').length).toBeGreaterThan(0);
    });

    it('muestra solo los registros del cliente seleccionado', () => {
      setup();
      expect(screen.getByText(/ORD-1/)).toBeInTheDocument();
      expect(screen.getByText(/ORD-2/)).toBeInTheDocument();
      expect(screen.queryByText(/ORD-3/)).not.toBeInTheDocument(); // pertenece a Otra Empresa
    });

    it('separa cobros pendientes de cobros realizados', () => {
      setup();
      expect(screen.getByText(/cobros pendientes/i)).toBeInTheDocument();
      expect(screen.getByText(/cobros realizados/i)).toBeInTheDocument();
    });

    it('muestra botón Cobrar para items pendientes', () => {
      setup();
      expect(screen.getByRole('button', { name: /cobrar/i })).toBeInTheDocument();
    });

    it('muestra el saldo total pendiente', () => {
      setup();
      // ORD-1 tiene balance=500; puede aparecer en varias líneas → getAllByText
      expect(screen.getAllByText(/500/).length).toBeGreaterThan(0);
    });

    it('muestra mensaje vacío cuando el cliente no tiene registros', () => {
      setup({ customerName: 'Cliente Sin Registros' });
      expect(screen.getByText(/sin registros para este cliente/i)).toBeInTheDocument();
    });

    it('al hacer clic en Cobrar llama onClose y luego onAction', async () => {
      const onClose = vi.fn();
      const onAction = vi.fn();
      render(
        <ARCustomerPanel
          open={true}
          onClose={onClose}
          customerName="ACME Inc"
          allData={allData}
          onAction={onAction}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /cobrar/i }));
      expect(onClose).toHaveBeenCalledOnce();
      expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: 'ORD-1' }));
    });
  });
});
