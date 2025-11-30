import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MixedPaymentDialog } from './MixedPaymentDialog';
import { CrmContext } from '@/context/CrmContext';

// Mock del contexto para proveer los métodos de pago
const mockPaymentMethods = [
  { id: 'efectivo_usd', name: 'Efectivo (USD)', igtfApplicable: true },
  { id: 'zelle_usd', name: 'Zelle (USD)', igtfApplicable: true },
  { id: 'pago_movil_ves', name: 'Pago Móvil (VES)', igtfApplicable: false },
  { id: 'pos_ves', name: 'Punto de Venta (VES)', igtfApplicable: false },
  { id: 'pago_mixto', name: 'Pago Mixto', igtfApplicable: false },
];

const mockCrmContextValue = {
  paymentMethods: mockPaymentMethods,
  loading: false,
};

// Wrapper para proveer el contexto al componente
const renderWithContext = (component) => {
  return render(
    <CrmContext.Provider value={mockCrmContextValue}>
      {component}
    </CrmContext.Provider>
  );
};

describe('MixedPaymentDialog', () => {
  const totalAmount = 100;
  const onClose = vi.fn();
  const onSave = vi.fn();

  it('debería renderizarse y pre-llenar la primera línea con el monto total', () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    expect(screen.getByText('Registro de Pago Mixto')).toBeInTheDocument();
    // Se espera que el input de monto tenga el valor total de la orden
    const amountInput = screen.getByPlaceholderText('Monto');
    expect(amountInput.value).toBe(totalAmount.toFixed(2));
  });

  it('el botón de guardar debería estar habilitado cuando el total pagado coincide con el total de la orden', () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    // Por defecto, el monto ya coincide, así que el botón debe estar habilitado
    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('el botón de guardar debería estar deshabilitado si los montos no coinciden', async () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    const amountInput = screen.getByPlaceholderText('Monto');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '50');

    // Ahora el total no coincide, el botón debería deshabilitarse
    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/ajuste los montos para poder guardar/i)).toBeInTheDocument();
  });

  it('debería añadir una nueva línea de pago con el monto restante', async () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    const amountInput1 = screen.getByPlaceholderText('Monto');
    await userEvent.clear(amountInput1);
    await userEvent.type(amountInput1, '70');

    const addButton = screen.getByRole('button', { name: /añadir línea de pago/i });
    await userEvent.click(addButton);

    // Debería haber dos inputs de monto
    const amountInputs = screen.getAllByPlaceholderText('Monto');
    expect(amountInputs).toHaveLength(2);

    // El segundo input debería tener el monto restante (100 - 70 = 30)
    expect(amountInputs[1].value).toBe('30.00');

    // Y ahora que los montos suman el total, el botón de guardar debe estar habilitado
    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('debería llamar a onSave con los datos correctos al guardar', async () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    await userEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      payments: expect.any(Array),
      igtf: expect.any(Number),
    }));
  });

  it('debería calcular el IGTF correctamente', async () => {
    renderWithContext(
        <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    // Limpiar la línea inicial
    const removeButton = screen.getByRole('button', { name: '' }); // Botón X
    await userEvent.click(removeButton);

    // Añadir dos líneas de pago
    const addButton = screen.getByRole('button', { name: /añadir línea de pago/i });
    await userEvent.click(addButton); // Línea 1
    await userEvent.click(addButton); // Línea 2

    const amountInputs = screen.getAllByPlaceholderText('Monto');
    const methodSelects = screen.getAllByRole('combobox');

    // Pago 1: 50 USD
    await userEvent.clear(amountInputs[0]);
    await userEvent.type(amountInputs[0], '50');
    await userEvent.click(methodSelects[0]);
    await userEvent.click(screen.getByRole('option', { name: 'Efectivo (USD)' }));

    // Pago 2: 50 VES
    await userEvent.clear(amountInputs[1]);
    await userEvent.type(amountInputs[1], '50');
    await userEvent.click(methodSelects[1]);
    await userEvent.click(screen.getByRole('option', { name: 'Pago Móvil (VES)' }));

    // IGTF = 50 * 0.03 = 1.5
    expect(screen.getByText(/igtf/i).nextSibling.textContent).toBe('$1.50');

    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    await userEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        igtf: 1.5
    }));
  });
});
