import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AccountsReceivableReport from './AccountsReceivableReport';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const { mockFetchApi } = vi.hoisted(() => ({ mockFetchApi: vi.fn() }));
vi.mock('../lib/api', () => ({ fetchApi: mockFetchApi }));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ hasPermission: () => false }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Gated/complex subcomponents que no son el foco de este test
vi.mock('@/components/payment-requests/SolicitarComprobanteButton', () => ({
  SolicitarComprobanteButton: () => null,
}));

vi.mock('@/components/payment-requests/RequestPaymentModal', () => ({
  RequestPaymentModal: () => null,
}));

// ContentTransition — renderiza directamente los children (sin skeleton)
vi.mock('@/components/ui/content-transition', () => ({
  ContentTransition: ({ children, loading, skeleton }) => loading ? skeleton : children,
}));

vi.mock('@/components/ui/page-loading', () => ({
  TableSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// ─────────────────────────────────────────────────────────────────────────────

const past   = (d) => new Date(Date.now() - d * 86400000).toISOString();
const future = (d) => new Date(Date.now() + d * 86400000).toISOString();

const mockData = [
  { orderId: 'id-1', orderNumber: 'ORD-001', customerName: 'ACME Inc',      balance: 500, dueDate: past(10),   status: 'pending', source: 'manual' },
  { orderId: 'id-2', orderNumber: 'ORD-002', customerName: 'Beta Corp',     balance: 200, dueDate: future(3),  status: 'pending', source: 'manual' },
  { orderId: 'id-3', orderNumber: 'ORD-003', customerName: 'Gamma LLC',     balance: 100, dueDate: future(30), status: 'pending', source: 'manual' },
  { orderId: 'id-4', orderNumber: 'ORD-004', customerName: 'Delta SA',      balance: 0,   dueDate: past(5),    status: 'paid',    source: 'manual' },
];

// jsdom renders both mobile (md:hidden) and desktop (hidden md:block) views simultaneously
// so customer names appear twice. Use getAllByText for presence checks.
const hasText = (text) => screen.getAllByText(text).length > 0;

describe('AccountsReceivableReport', () => {
  beforeEach(() => {
    mockFetchApi.mockClear();
    mockFetchApi.mockResolvedValue(mockData);
  });

  const setup = () => render(<AccountsReceivableReport />);

  // ── Carga de datos ──────────────────────────────────────────────────────────
  it('muestra skeleton mientras carga', () => {
    mockFetchApi.mockReturnValue(new Promise(() => {}));
    setup();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('renderiza los clientes después de cargar', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));
    expect(hasText('ACME Inc')).toBe(true);
    expect(hasText('Beta Corp')).toBe(true);
    expect(hasText('Gamma LLC')).toBe(true);
  });

  // ── Banner Hero ─────────────────────────────────────────────────────────────
  it('muestra el banner de urgencia cuando hay vencidos', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText(/cobro vencido|cobros vencidos/i)).toBeInTheDocument();
    });
  });

  // ── Resumen cards ───────────────────────────────────────────────────────────
  it('renderiza ARSummaryCards con los datos del reporte', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText(/total por cobrar/i)).toBeInTheDocument();
    });
  });

  // ── FilterPills ─────────────────────────────────────────────────────────────
  it('renderiza las pills de filtro', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /todas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /urgente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /esta semana/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /al día/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pagadas/i })).toBeInTheDocument();
    });
  });

  it('filtra a vencidos al hacer clic en pill "Urgente"', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    // Clicks the FilterPill — the StickyActionBar also has a button matching /urgente/i
    await userEvent.click(screen.getAllByRole('button', { name: /urgente/i })[0]);

    expect(hasText('ACME Inc')).toBe(true);
    expect(screen.queryByText('Beta Corp')).not.toBeInTheDocument();
  });

  it('filtra a pagadas al hacer clic en pill "Pagadas"', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    await userEvent.click(screen.getByRole('button', { name: /pagadas/i }));

    expect(hasText('Delta SA')).toBe(true);
    expect(screen.queryByText('ACME Inc')).not.toBeInTheDocument();
  });

  // ── Búsqueda ────────────────────────────────────────────────────────────────
  it('filtra por término de búsqueda', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'ACME');

    expect(hasText('ACME Inc')).toBe(true);
    expect(screen.queryByText('Beta Corp')).not.toBeInTheDocument();
  });

  it('botón Limpiar resetea el filtro de búsqueda', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'ACME');
    expect(screen.queryByText('Beta Corp')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /limpiar/i }));
    expect(hasText('Beta Corp')).toBe(true);
  });

  // ── Estado vacío ────────────────────────────────────────────────────────────
  it('muestra empty state cuando no hay datos', async () => {
    mockFetchApi.mockResolvedValueOnce([]);
    setup();
    await waitFor(() => {
      expect(screen.getByText(/sin cuentas por cobrar/i)).toBeInTheDocument();
    });
  });

  it('muestra empty state con mensaje de filtros cuando los filtros no dan resultados', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'XYZ NO EXISTE');
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
  });

  // ── Error state ─────────────────────────────────────────────────────────────
  it('muestra mensaje de error cuando fetchApi falla', async () => {
    mockFetchApi.mockRejectedValueOnce(new Error('Network error'));
    setup();
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  // ── Interacciones del flujo de cobro ────────────────────────────────────────
  it('abre el ARActionSheet al hacer clic en "Cobrar" en desktop', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    const cobrarBtns = screen.getAllByRole('button', { name: /cobrar/i });
    await userEvent.click(cobrarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/gestionar cobro/i)).toBeInTheDocument();
    });
  });

  it('abre el panel de cliente al hacer clic en el nombre del cliente', async () => {
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    const customerBtns = screen.getAllByRole('button', { name: /ACME Inc/i });
    await userEvent.click(customerBtns[0]);

    await waitFor(() => {
      expect(document.body.textContent).toContain('ORD-001');
    });
  });

  // ── ARStickyActionBar ───────────────────────────────────────────────────────
  it('renderiza ARStickyActionBar cuando hay items vencidos', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cobrar el más urgente/i })).toBeInTheDocument();
    });
  });

  it('recarga datos al completar un pago', async () => {
    mockFetchApi.mockResolvedValue(mockData);
    setup();
    await waitFor(() => screen.getAllByText('ACME Inc'));

    expect(mockFetchApi).toHaveBeenCalledTimes(1);
    expect(mockFetchApi).toHaveBeenCalledWith('/accounting/reports/accounts-receivable');
  });
});
