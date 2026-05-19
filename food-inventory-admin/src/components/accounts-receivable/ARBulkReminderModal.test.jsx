import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ARBulkReminderModal from './ARBulkReminderModal';

// jsdom no implementa navigator.clipboard — lo creamos como mock global
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

const makeRow = (overrides = {}) => ({
  orderNumber: 'ORD-001',
  customerName: 'Cliente A',
  balance: '300',
  customerPhone: '+584121234567',
  ...overrides,
});

describe('ARBulkReminderModal', () => {
  let windowOpenSpy;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    vi.mocked(navigator.clipboard.writeText).mockClear();
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('no renderiza cuando está cerrado', () => {
    render(<ARBulkReminderModal open={false} onClose={vi.fn()} receivables={[makeRow()]} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el título con el conteo correcto', () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[makeRow(), makeRow({ orderNumber: 'ORD-002', customerName: 'Cliente B' })]}
      />
    );
    expect(screen.getByText(/recordatorio a 2 clientes/i)).toBeInTheDocument();
  });

  it('usa singular cuando hay solo 1 cliente', () => {
    render(
      <ARBulkReminderModal open={true} onClose={vi.fn()} receivables={[makeRow()]} />
    );
    expect(screen.getByText(/recordatorio a 1 cliente/i)).toBeInTheDocument();
  });

  it('lista clientes CON teléfono con checkmark', () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[makeRow({ customerName: 'Con Teléfono', customerPhone: '+58412' })]}
      />
    );
    expect(screen.getByText('Con Teléfono')).toBeInTheDocument();
    expect(screen.getByText('+58412')).toBeInTheDocument();
  });

  it('lista clientes SIN teléfono con advertencia', () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[makeRow({ customerName: 'Sin Tel', customerPhone: null })]}
      />
    );
    expect(screen.getByText('Sin Tel')).toBeInTheDocument();
    expect(screen.getByText(/sin teléfono registrado/i)).toBeInTheDocument();
  });

  it('muestra nota informativa cuando hay clientes sin teléfono', () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[
          makeRow({ customerPhone: '+58412' }),
          makeRow({ orderNumber: 'ORD-002', customerPhone: null }),
        ]}
      />
    );
    expect(screen.getByText(/1 cliente no tiene teléfono/i)).toBeInTheDocument();
  });

  it('botón WhatsApp aparece solo si hay clientes con teléfono', () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[makeRow({ customerPhone: '+58412' })]}
      />
    );
    expect(screen.getByRole('button', { name: /whatsapp \(1\)/i })).toBeInTheDocument();
  });

  it('NO muestra botón WhatsApp si ningún cliente tiene teléfono', () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[makeRow({ customerPhone: null })]}
      />
    );
    expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument();
  });

  it('copia mensajes al portapapeles al hacer clic en "Copiar mensajes"', async () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[makeRow({ customerName: 'Gamma LLC' })]}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /copiar mensajes/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const copied = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    expect(copied).toContain('Gamma LLC');
  });

  it('abre window.open con URLs de wa.me al hacer clic en WhatsApp', async () => {
    render(
      <ARBulkReminderModal
        open={true}
        onClose={vi.fn()}
        receivables={[
          makeRow({ customerPhone: '+584121111111', customerName: 'Cliente A' }),
          makeRow({ orderNumber: 'ORD-002', customerPhone: '+584122222222', customerName: 'Cliente B' }),
        ]}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /whatsapp \(2\)/i }));

    // Primer wa.me se abre inmediatamente
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy.mock.calls[0][0]).toMatch(/wa\.me\/584121111111/);

    // Segundo wa.me se abre con 350ms de delay — waitFor lo captura sin fake timers
    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
  });
});
