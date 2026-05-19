import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ARHeroBanner from './ARHeroBanner';

// Render + click sin fake timers (usaremos real timers para interacciones)
const renderBanner = (props) => render(<ARHeroBanner {...props} />);

describe('ARHeroBanner', () => {
  describe('estado: con vencidos', () => {
    it('muestra el conteo y monto de cobros vencidos', () => {
      renderBanner({ overdueCount: 3, overdueTotal: 1400, dueSoonTotal: 0, onFilterOverdue: vi.fn(), onFilterDueSoon: vi.fn() });
      expect(screen.getByText(/3 cobros vencidos/i)).toBeInTheDocument();
    });

    it('llama onFilterOverdue al hacer clic en el banner rojo', async () => {
      const onFilterOverdue = vi.fn();
      renderBanner({ overdueCount: 2, overdueTotal: 500, dueSoonTotal: 0, onFilterOverdue, onFilterDueSoon: vi.fn() });
      await userEvent.click(screen.getByRole('button'));
      expect(onFilterOverdue).toHaveBeenCalledOnce();
    });

    it('usa singular cuando overdueCount=1', () => {
      renderBanner({ overdueCount: 1, overdueTotal: 200, dueSoonTotal: 0, onFilterOverdue: vi.fn(), onFilterDueSoon: vi.fn() });
      expect(screen.getByText(/1 cobro vencido/i)).toBeInTheDocument();
    });
  });

  describe('estado: por vencer (sin vencidos)', () => {
    it('muestra banner azul con monto por cobrar esta semana', () => {
      renderBanner({ overdueCount: 0, overdueTotal: 0, dueSoonTotal: 3200, onFilterOverdue: vi.fn(), onFilterDueSoon: vi.fn() });
      expect(screen.getByText(/por cobrar esta semana/i)).toBeInTheDocument();
    });

    it('llama onFilterDueSoon al hacer clic', async () => {
      const onFilterDueSoon = vi.fn();
      renderBanner({ overdueCount: 0, overdueTotal: 0, dueSoonTotal: 1000, onFilterOverdue: vi.fn(), onFilterDueSoon });
      await userEvent.click(screen.getByRole('button'));
      expect(onFilterDueSoon).toHaveBeenCalledOnce();
    });
  });

  describe('estado: todo al día', () => {
    it('muestra banner de éxito cuando no hay vencidos ni por vencer', () => {
      render(
        <ARHeroBanner
          overdueCount={0}
          overdueTotal={0}
          dueSoonTotal={0}
          onFilterOverdue={vi.fn()}
          onFilterDueSoon={vi.fn()}
        />
      );
      expect(screen.getByText(/sin vencimientos/i)).toBeInTheDocument();
    });

    it('desaparece automáticamente después de 4 segundos', () => {
      vi.useFakeTimers();
      render(
        <ARHeroBanner
          overdueCount={0}
          overdueTotal={0}
          dueSoonTotal={0}
          onFilterOverdue={vi.fn()}
          onFilterDueSoon={vi.fn()}
        />
      );
      expect(screen.getByText(/sin vencimientos/i)).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(4100); });

      vi.useRealTimers();
      expect(screen.queryByText(/sin vencimientos/i)).not.toBeInTheDocument();
    });
  });
});
