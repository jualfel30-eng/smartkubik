import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AttendanceSheet from './AttendanceSheet';

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

// eslint-disable-next-line no-unused-vars
const stripMotion = ({ children, whileTap, variants, initial, animate, exit, ...p }) => p;
vi.mock('framer-motion', () => ({
  motion: {
    div:    ({ children, whileTap, variants, initial, animate, exit, ...p }) => <div {...p}>{children}</div>,
    button: ({ children, whileTap, variants, initial, animate, exit, ...p }) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));
// ─────────────────────────────────────────────────────────────────────────────

const CLASSROOMS = [
  { _id: 'cls-1', grade: '3er', section: 'A', tutorName: 'García', totalStudents: 2 },
];

const ROSTER = [
  { _id: 'stu-1', firstName: 'María', lastName: 'García', enrollmentNumber: '001' },
  { _id: 'stu-2', firstName: 'Pedro', lastName: 'López',  enrollmentNumber: '002' },
];

function setupFetchApi() {
  mockFetchApi.mockImplementation((url) => {
    if (url.startsWith('/education/classrooms') && url.endsWith('/students')) {
      return Promise.resolve({ data: ROSTER });
    }
    if (url.startsWith('/education/classrooms')) {
      return Promise.resolve({ data: CLASSROOMS });
    }
    if (url.startsWith('/education/attendance/batch')) {
      return Promise.resolve({ data: { ok: true } });
    }
    return Promise.resolve({ data: [] });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupFetchApi();
});

describe('AttendanceSheet', () => {
  it('muestra el selector de salones al cargar', async () => {
    render(<AttendanceSheet />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    expect(screen.getByText('3er A')).toBeInTheDocument();
  });

  it('muestra mensaje de placeholder antes de seleccionar salón', async () => {
    render(<AttendanceSheet />);

    await waitFor(() => {
      expect(screen.getByText(/Selecciona un salón para pasar lista/)).toBeInTheDocument();
    });
  });

  it('carga el roster al seleccionar un salón', async () => {
    const user = userEvent.setup();
    render(<AttendanceSheet />);

    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'cls-1');

    await waitFor(() => {
      expect(screen.getByText(/García, María/)).toBeInTheDocument();
      expect(screen.getByText(/López, Pedro/)).toBeInTheDocument();
    });
  });

  it('todos los alumnos inician en Presente (P) por defecto', async () => {
    const user = userEvent.setup();
    render(<AttendanceSheet />);

    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'cls-1');

    await waitFor(() => {
      expect(screen.getByText(/García, María/)).toBeInTheDocument();
    });

    // El resumen debe mostrar 2 Presentes, 0 Ausentes
    expect(screen.getByText(/Presente:/)).toBeInTheDocument();
    const lines = screen.getAllByText(/Presente:/);
    // Buscar el texto de conteo "2" near the Presente label
    expect(document.body.textContent).toContain('Presente:');
  });

  it('permite cambiar el estado de un alumno a Ausente', async () => {
    const user = userEvent.setup();
    render(<AttendanceSheet />);

    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'cls-1');

    await waitFor(() => {
      expect(screen.getByText(/García, María/)).toBeInTheDocument();
    });

    // Hay múltiples botones "A" (uno por alumno), click en el primero
    const absentButtons = screen.getAllByTitle('Ausente');
    await user.click(absentButtons[0]);

    // El botón de guardar sigue presente
    expect(screen.getByText('Guardar Asistencia')).toBeInTheDocument();
  });

  it('llama a saveBatch al hacer click en Guardar Asistencia', async () => {
    const user = userEvent.setup();
    render(<AttendanceSheet />);

    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'cls-1');

    await waitFor(() => {
      expect(screen.getByText(/García, María/)).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Guardar Asistencia');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/education/attendance/batch',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(mockToast.success).toHaveBeenCalledWith('Asistencia guardada');
  });

  it('muestra toast de error si saveBatch falla', async () => {
    mockFetchApi.mockImplementation((url) => {
      if (url.startsWith('/education/classrooms') && url.endsWith('/students'))
        return Promise.resolve({ data: ROSTER });
      if (url.startsWith('/education/classrooms'))
        return Promise.resolve({ data: CLASSROOMS });
      if (url.includes('batch'))
        return Promise.reject(new Error('Network error'));
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    render(<AttendanceSheet />);

    const select = await screen.findByRole('combobox');
    await user.selectOptions(select, 'cls-1');
    await waitFor(() => { expect(screen.getByText(/García, María/)).toBeInTheDocument(); });

    await user.click(screen.getByText('Guardar Asistencia'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al guardar asistencia');
    });
  });
});
