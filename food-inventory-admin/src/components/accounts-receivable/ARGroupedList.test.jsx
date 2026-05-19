import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ARGroupedList from './ARGroupedList';

const past   = (d) => new Date(Date.now() - d * 86400000).toISOString();
const future = (d) => new Date(Date.now() + d * 86400000).toISOString();

const rows = [
  { orderNumber: 'OVR-1', customerName: 'Vencido 1',  balance: '500', dueDate: past(10),   status: 'pending' },
  { orderNumber: 'OVR-2', customerName: 'Vencido 2',  balance: '200', dueDate: past(3),    status: 'partial' },
  { orderNumber: 'DUE-1', customerName: 'Por Vencer', balance: '300', dueDate: future(2),  status: 'pending' },
  { orderNumber: 'CUR-1', customerName: 'Al Día',     balance: '100', dueDate: future(30), status: 'pending' },
];

describe('ARGroupedList', () => {
  describe('modo normal (no isPaidView)', () => {
    it('renderiza encabezados de sección por urgencia', () => {
      render(<ARGroupedList data={rows} onAction={vi.fn()} />);
      expect(screen.getByText(/vencidas \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/por vencer \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/al día \(1\)/i)).toBeInTheDocument();
    });

    it('renderiza todos los nombres de clientes', () => {
      render(<ARGroupedList data={rows} onAction={vi.fn()} />);
      expect(screen.getByText('Vencido 1')).toBeInTheDocument();
      expect(screen.getByText('Vencido 2')).toBeInTheDocument();
      expect(screen.getByText('Por Vencer')).toBeInTheDocument();
      expect(screen.getByText('Al Día')).toBeInTheDocument();
    });

    it('no muestra sección si no hay items en ese bucket', () => {
      const soloVencidos = [rows[0], rows[1]];
      render(<ARGroupedList data={soloVencidos} onAction={vi.fn()} />);
      expect(screen.queryByText(/por vencer/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/al día/i)).not.toBeInTheDocument();
    });

    it('renderiza lista vacía sin errores', () => {
      const { container } = render(<ARGroupedList data={[]} onAction={vi.fn()} />);
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.queryByText(/vencidas/i)).not.toBeInTheDocument();
    });
  });

  describe('modo isPaidView', () => {
    const paidRows = [
      { orderNumber: 'PAI-1', customerName: 'Pagado 1', balance: '0', status: 'paid', dueDate: past(5) },
      { orderNumber: 'PAI-2', customerName: 'Pagado 2', balance: '0', status: 'paid', dueDate: past(2) },
    ];

    it('muestra sección "Pagadas" con todos los items', () => {
      render(<ARGroupedList data={paidRows} onAction={vi.fn()} isPaidView />);
      expect(screen.getByText('Pagado 1')).toBeInTheDocument();
      expect(screen.getByText('Pagado 2')).toBeInTheDocument();
    });

    it('no muestra secciones de urgencia en isPaidView', () => {
      render(<ARGroupedList data={paidRows} onAction={vi.fn()} isPaidView />);
      expect(screen.queryByText(/vencidas/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/por vencer/i)).not.toBeInTheDocument();
    });
  });
});
