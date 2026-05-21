import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EduDashboard from './EduDashboard';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const { mockFetchApi } = vi.hoisted(() => ({ mockFetchApi: vi.fn() }));
vi.mock('@/lib/api', () => ({ fetchApi: mockFetchApi }));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ tenant: { ownerFirstName: 'Directora' } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/haptics', () => ({ default: { tap: vi.fn() } }));
vi.mock('@/lib/toast', () => ({ toast: { error: vi.fn() } }));

vi.mock('@/hooks/use-reduced-motion-safe', () => ({
  useReducedMotionSafe: () => ({ v: (x) => x, t: (x) => x }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div:    ({ children, whileTap, variants, initial, animate, exit, ...p }) => <div {...p}>{children}</div>,
    button: ({ children, whileTap, variants, initial, animate, exit, ...p }) => <button {...p}>{children}</button>,
    section:({ children, whileTap, variants, initial, animate, exit, ...p }) => <section {...p}>{children}</section>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('@/components/mobile/primitives/AnimatedNumber.jsx', () => ({
  default: ({ value, format: fmt }) => <span>{fmt ? fmt(value) : value}</span>,
}));
// ─────────────────────────────────────────────────────────────────────────────

const makeSummary = (overrides = {}) => ({
  activeStudents: 120,
  solventStudents: 95,
  delinquentStudents: 25,
  attendanceRateToday: 88,
  overdueFeesCount: 0,
  unpublishedGradePeriods: 0,
  feesdueSoon: 0,
  classroomsToday: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EduDashboard', () => {
  it('muestra KPIs del summary cuando la carga es exitosa', async () => {
    mockFetchApi.mockResolvedValueOnce({ data: makeSummary() });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('muestra el saludo con el nombre del director', async () => {
    mockFetchApi.mockResolvedValueOnce({ data: makeSummary() });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Directora/)).toBeInTheDocument();
    });
  });

  it('muestra AlertCard cuando hay cuotas vencidas >30 días', async () => {
    mockFetchApi.mockResolvedValueOnce({
      data: makeSummary({ overdueFeesCount: 8 }),
    });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/8 cuotas vencidas >30 días/)).toBeInTheDocument();
    });
  });

  it('muestra AlertCard cuando hay lapsos sin publicar', async () => {
    mockFetchApi.mockResolvedValueOnce({
      data: makeSummary({ unpublishedGradePeriods: 3 }),
    });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/3 lapsos sin publicar/)).toBeInTheDocument();
    });
  });

  it('muestra AlertCard de cuotas que vencen esta semana', async () => {
    mockFetchApi.mockResolvedValueOnce({
      data: makeSummary({ feesdueSoon: 12 }),
    });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/12 cuotas vencen esta semana/)).toBeInTheDocument();
    });
  });

  it('NO muestra AlertCards cuando no hay alertas', async () => {
    mockFetchApi.mockResolvedValueOnce({ data: makeSummary() });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/cuotas vencidas/)).not.toBeInTheDocument();
      expect(screen.queryByText(/lapsos sin publicar/)).not.toBeInTheDocument();
    });
  });

  it('muestra los salones de hoy cuando están en el summary', async () => {
    mockFetchApi.mockResolvedValueOnce({
      data: makeSummary({
        classroomsToday: [
          { _id: 'cls-1', grade: '3er', section: 'A', tutorName: 'García', presentToday: 21, totalStudents: 24, delinquentCount: 6 },
        ],
      }),
    });

    render(<EduDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/3er A/)).toBeInTheDocument();
      expect(screen.getByText(/Prof. García/)).toBeInTheDocument();
      expect(screen.getByText(/21\/24 presentes/)).toBeInTheDocument();
    });
  });

  it('muestra skeleton de carga inicialmente', () => {
    // fetchApi nunca resuelve → loading queda en true
    mockFetchApi.mockReturnValueOnce(new Promise(() => {}));

    render(<EduDashboard />);

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
