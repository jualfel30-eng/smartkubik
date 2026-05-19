import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ARReceivableCard from './ARReceivableCard';

const past   = (days) => new Date(Date.now() - days * 86400000).toISOString();
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();

const makeRow = (overrides = {}) => ({
  orderNumber: 'ORD-001',
  customerName: 'ACME Inc',
  balance: '500',
  dueDate: future(30),
  status: 'pending',
  ...overrides,
});

describe('ARReceivableCard', () => {
  describe('renderizado básico', () => {
    it('muestra nombre del cliente y número de orden', () => {
      render(<ARReceivableCard row={makeRow()} />);
      expect(screen.getByText('ACME Inc')).toBeInTheDocument();
      expect(screen.getByText(/ORD-001/)).toBeInTheDocument();
    });

    it('muestra el balance formateado', () => {
      render(<ARReceivableCard row={makeRow({ balance: '500' })} />);
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });
  });

  describe('botón Cobrar', () => {
    it('muestra botón Cobrar cuando balance > 0 y no es isPaidView', () => {
      render(<ARReceivableCard row={makeRow({ balance: '200' })} />);
      expect(screen.getByRole('button', { name: /cobrar/i })).toBeInTheDocument();
    });

    it('NO muestra botón Cobrar cuando balance = 0', () => {
      render(<ARReceivableCard row={makeRow({ balance: '0' })} />);
      expect(screen.queryByRole('button', { name: /cobrar/i })).not.toBeInTheDocument();
    });

    it('llama onAction con el row al hacer clic en Cobrar', async () => {
      const onAction = vi.fn();
      const row = makeRow({ balance: '300' });
      render(<ARReceivableCard row={row} onAction={onAction} />);
      await userEvent.click(screen.getByRole('button', { name: /cobrar/i }));
      expect(onAction).toHaveBeenCalledWith(row);
    });
  });

  describe('vista de pagados (isPaidView)', () => {
    it('muestra botón "Ver" en lugar de "Cobrar"', () => {
      render(<ARReceivableCard row={makeRow({ balance: '0', status: 'paid' })} isPaidView />);
      expect(screen.getByRole('button', { name: /ver/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cobrar/i })).not.toBeInTheDocument();
    });

    it('llama onAction al hacer clic en "Ver"', async () => {
      const onAction = vi.fn();
      const row = makeRow({ balance: '0', status: 'paid' });
      render(<ARReceivableCard row={row} onAction={onAction} isPaidView />);
      await userEvent.click(screen.getByRole('button', { name: /ver/i }));
      expect(onAction).toHaveBeenCalledWith(row);
    });
  });

  describe('tap en nombre del cliente', () => {
    it('llama onOpenCustomer al hacer clic en el nombre', async () => {
      const onOpenCustomer = vi.fn();
      const row = makeRow();
      render(<ARReceivableCard row={row} onOpenCustomer={onOpenCustomer} />);
      await userEvent.click(screen.getByRole('button', { name: /ACME Inc/i }));
      expect(onOpenCustomer).toHaveBeenCalledWith(row);
    });
  });

  describe('etiqueta de urgencia', () => {
    it('muestra "Vencida" para items con dueDate en el pasado', () => {
      render(<ARReceivableCard row={makeRow({ dueDate: past(5) })} />);
      expect(screen.getByText(/vencida/i)).toBeInTheDocument();
    });

    it('muestra "Vence en" para items que vencen en los próximos 7 días', () => {
      render(<ARReceivableCard row={makeRow({ dueDate: future(3) })} />);
      expect(screen.getByText(/vence en/i)).toBeInTheDocument();
    });

    it('no muestra etiqueta de urgencia para items sin vencer pronto', () => {
      render(<ARReceivableCard row={makeRow({ dueDate: future(30) })} />);
      expect(screen.queryByText(/vencida/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/vence en/i)).not.toBeInTheDocument();
    });
  });
});
