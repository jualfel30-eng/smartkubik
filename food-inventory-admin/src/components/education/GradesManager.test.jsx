import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GradesManager from './GradesManager';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const { mockFetchApi, mockToast } = vi.hoisted(() => ({
  mockFetchApi: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api', () => ({ fetchApi: mockFetchApi }));
vi.mock('@/lib/toast', () => ({ toast: mockToast }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/lib/haptics', () => ({ default: { tap: vi.fn() } }));

vi.mock('@/hooks/use-reduced-motion-safe', () => ({
  useReducedMotionSafe: () => ({ v: (x) => x }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div:    ({ children, whileTap, variants, initial, animate, exit, ...p }) => <div {...p}>{children}</div>,
    button: ({ children, whileTap, variants, initial, animate, exit, ...p }) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));
// ─────────────────────────────────────────────────────────────────────────────

const CLASSROOMS = [
  { _id: 'cls-1', grade: '3er', section: 'A' },
];

const makeDraftGrades = () => [
  { _id: 'g-1', studentId: 'stu-1', studentFirstName: 'María', studentLastName: 'García', score: 14, period: 'L1', status: 'draft' },
  { _id: 'g-2', studentId: 'stu-2', studentFirstName: 'Pedro', studentLastName: 'López',  score: 8,  period: 'L1', status: 'draft' },
];

const makePublishedGrades = () =>
  makeDraftGrades().map(g => ({ ...g, status: 'published' }));

function setupMocks(grades = makeDraftGrades()) {
  mockFetchApi.mockImplementation((url) => {
    if (url.startsWith('/education/classrooms')) return Promise.resolve({ data: CLASSROOMS });
    if (url.startsWith('/education/grades') && !url.includes('publish')) return Promise.resolve({ data: grades });
    if (url.includes('/publish') || url.endsWith('publish')) return Promise.resolve({ data: { ok: true } });
    return Promise.resolve({ data: [] });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

async function selectClassroom(user) {
  const [classroomSelect] = screen.getAllByRole('combobox');
  await user.selectOptions(classroomSelect, 'cls-1');
}

describe('GradesManager', () => {
  it('muestra selector de salón al cargar', async () => {
    render(<GradesManager />);

    await waitFor(() => {
      expect(screen.getByText('3er A')).toBeInTheDocument();
    });
  });

  it('muestra mensaje de placeholder antes de seleccionar salón', async () => {
    render(<GradesManager />);

    await waitFor(() => {
      expect(screen.getByText(/Selecciona un salón para ver calificaciones/)).toBeInTheDocument();
    });
  });

  it('carga calificaciones al seleccionar salón', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);

    await waitFor(() => {
      expect(screen.getByText(/García, María/)).toBeInTheDocument();
      expect(screen.getByText(/López, Pedro/)).toBeInTheDocument();
    });
  });

  it('muestra badge Aprobado para nota >= 10', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);

    await waitFor(() => {
      expect(screen.getByText('Aprobado')).toBeInTheDocument();
    });
  });

  it('muestra badge Reprobado para nota < 10', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);

    await waitFor(() => {
      expect(screen.getByText('Reprobado')).toBeInTheDocument();
    });
  });

  it('muestra botón Publicar cuando las notas son draft', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);

    await waitFor(() => {
      expect(screen.getByText(/Publicar L1/)).toBeInTheDocument();
    });
  });

  it('abre modal de confirmación al hacer click en Publicar', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);
    await waitFor(() => { expect(screen.getByText(/Publicar L1/)).toBeInTheDocument(); });

    await user.click(screen.getByText(/Publicar L1/));

    expect(screen.getByText(/Esta acción es irreversible/)).toBeInTheDocument();
  });

  it('llama a publish API al confirmar en el modal', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);
    await waitFor(() => { expect(screen.getByText(/Publicar L1/)).toBeInTheDocument(); });

    await user.click(screen.getByText(/Publicar L1/));
    await user.click(screen.getByRole('button', { name: /^Publicar$/ }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/education/grades/publish',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(mockToast.success).toHaveBeenCalledWith('L1 publicado exitosamente');
  });

  it('NO muestra botón Publicar cuando las notas ya están publicadas', async () => {
    setupMocks(makePublishedGrades());
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);

    await waitFor(() => {
      expect(screen.queryByText(/Publicar L1/)).not.toBeInTheDocument();
    });
  });

  it('cancela el modal sin llamar a publish', async () => {
    const user = userEvent.setup();
    render(<GradesManager />);

    await waitFor(() => { expect(screen.getByText('3er A')).toBeInTheDocument(); });
    await selectClassroom(user);
    await waitFor(() => { expect(screen.getByText(/Publicar L1/)).toBeInTheDocument(); });

    await user.click(screen.getByText(/Publicar L1/));
    expect(screen.getByText(/Esta acción es irreversible/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText(/Esta acción es irreversible/)).not.toBeInTheDocument();
    expect(mockFetchApi).not.toHaveBeenCalledWith('/education/grades/publish', expect.anything());
  });
});
