import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MixedPaymentDialog } from './MixedPaymentDialog';
import { CrmContext } from '@/context/CrmContext';

// ─── Mock i18n / country plugin layer ────────────────────────────────────────
// MixedPaymentDialog uses useCountryPlugin() internally after the i18n refactor.
// We mock the module so tests don't need a real CountryPluginProvider.
vi.mock('@/country-plugins/CountryPluginContext', () => ({
  useCountryPlugin: () => ({
    currencyEngine: {
      getPrimaryCurrency: () => ({ code: 'VES', symbol: 'Bs' }),
      getExchangeRateConfig: () => ({ endpoint: '/exchange-rate/bcv', refreshIntervalMs: 3600000 }),
    },
    localeProvider: {
      getNumberLocale: () => 'es-VE',
    },
    taxEngine: {
      // Only efectivo_usd / zelle_usd are IGTF-liable; VES methods are not
      getTransactionTaxes: ({ paymentMethodId }) =>
        ['efectivo_usd', 'zelle_usd'].includes(paymentMethodId)
          ? [{ type: 'IGTF', rate: 3 }]
          : [],
    },
  }),
}));

// useExchangeRate uses a module-level singleton that also calls useCountryPlugin
vi.mock('@/hooks/useExchangeRate', () => ({
  useExchangeRate: () => ({ rate: 36.5, loading: false, error: null, lastUpdate: new Date() }),
}));
// ─────────────────────────────────────────────────────────────────────────────

// VES method is FIRST so it becomes the default (the component picks the first
// non-pago_mixto method). This avoids IGTF being applied in basic tests.
const mockPaymentMethods = [
  { id: 'pago_movil_ves', name: 'Pago Móvil (VES)', igtfApplicable: false },
  { id: 'pos_ves',        name: 'Punto de Venta (VES)', igtfApplicable: false },
  { id: 'efectivo_usd',   name: 'Efectivo (USD)', igtfApplicable: true },
  { id: 'zelle_usd',      name: 'Zelle (USD)',    igtfApplicable: true },
  { id: 'pago_mixto',     name: 'Pago Mixto',     igtfApplicable: false },
];

const mockCrmContextValue = {
  paymentMethods: mockPaymentMethods,
  loading: false,
};

const renderWithContext = (component) =>
  render(
    <CrmContext.Provider value={mockCrmContextValue}>
      {component}
    </CrmContext.Provider>
  );

describe('MixedPaymentDialog', () => {
  const totalAmount = 100;
  const onClose = vi.fn();
  const onSave  = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    onSave.mockClear();
  });

  it('debería renderizarse y pre-llenar la primera línea con el monto total', () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    expect(screen.getByText('Registro de Pago Mixto')).toBeInTheDocument();
    const amountInput = screen.getByPlaceholderText('Monto ($)');
    expect(amountInput.value).toBe(totalAmount.toFixed(2));
  });

  it('el botón de guardar debería estar habilitado cuando el total pagado coincide con el total (sin IGTF)', () => {
    // Default method = pago_movil_ves (no IGTF) → totalRequired = $100 → matches the pre-filled amount
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('el botón de guardar debería estar deshabilitado si los montos no coinciden', async () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    const amountInput = screen.getByPlaceholderText('Monto ($)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '50');

    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    expect(saveButton).toBeDisabled();
    // The warning message uses "Falta cubrir el monto total." when remaining > 0
    expect(screen.getByText(/falta cubrir el monto total/i)).toBeInTheDocument();
  });

  it('debería añadir una nueva línea de pago con el monto restante', async () => {
    // Default method is VES → no IGTF → totalRequired = $100
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    const amountInput1 = screen.getByPlaceholderText('Monto ($)');
    await userEvent.clear(amountInput1);
    await userEvent.type(amountInput1, '70');

    const addButton = screen.getByRole('button', { name: /añadir línea de pago/i });
    await userEvent.click(addButton);

    const amountInputs = screen.getAllByPlaceholderText('Monto ($)');
    expect(amountInputs).toHaveLength(2);
    // remaining = 100 - 70 = 30
    expect(amountInputs[1].value).toBe('30.00');

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
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        payments: expect.any(Array),
        igtf: expect.any(Number),
      })
    );
  });

  it('no debería aplicar IGTF a métodos de pago en bolívares (VES)', async () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    // Default is already VES — IGTF section should not be visible
    expect(screen.queryByText(/igtf/i)).not.toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /guardar pagos/i });
    await userEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ igtf: 0 }));
  });

  it('debería mostrar el monto de IGTF al cambiar a un método en divisa extranjera', async () => {
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    // Switch to USD method
    const methodSelect = screen.getByRole('combobox');
    await userEvent.click(methodSelect);
    await userEvent.click(screen.getByRole('option', { name: 'Efectivo (USD)' }));

    // IGTF = 100 * 0.03 = 3.00 should be displayed in the summary
    const igtfLabel = screen.getByText(/igtf/i);
    expect(igtfLabel).toBeInTheDocument();
    // The IGTF amount is shown next to the label
    expect(igtfLabel.nextSibling?.textContent).toContain('3.00');

    // totalRequired should now be $103 (appears in the summary footer)
    expect(screen.getAllByText('$103.00').length).toBeGreaterThanOrEqual(1);
  });

  it('debería calcular el IGTF correctamente cuando hay pagos mixtos USD + VES', async () => {
    // Arrange: start with a clean dialog using VES default
    renderWithContext(
      <MixedPaymentDialog isOpen={true} onClose={onClose} totalAmount={totalAmount} onSave={onSave} />
    );

    // Clear first line amount so we can set it to 50
    const amountInput1 = screen.getByPlaceholderText('Monto ($)');
    await userEvent.clear(amountInput1);
    await userEvent.type(amountInput1, '50');

    // Add second line
    const addButton = screen.getByRole('button', { name: /añadir línea de pago/i });
    await userEvent.click(addButton);

    // Change first line to Efectivo USD (IGTF-liable)
    const methodSelects = screen.getAllByRole('combobox');
    await userEvent.click(methodSelects[0]);
    await userEvent.click(screen.getByRole('option', { name: 'Efectivo (USD)' }));

    // IGTF = 50 (USD amount) * 0.03 = 1.50 should appear in summary
    const igtfLabel = screen.getByText(/igtf/i);
    expect(igtfLabel).toBeInTheDocument();
    expect(igtfLabel.nextSibling?.textContent).toContain('1.50');
  });
});
