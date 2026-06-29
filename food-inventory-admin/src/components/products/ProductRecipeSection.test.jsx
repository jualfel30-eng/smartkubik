import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks de hooks/servicios (antes de importar el componente) ---
const getBomByProduct = vi.fn();
const createBom = vi.fn();
const updateBom = vi.fn();
const calculateTotalCost = vi.fn().mockResolvedValue(10);
const previewProduction = vi.fn();
const produceBatch = vi.fn();

vi.mock('@/hooks/useBillOfMaterials', () => ({
  useBillOfMaterials: () => ({
    getBomByProduct,
    createBom,
    updateBom,
    calculateTotalCost,
    previewProduction,
    produceBatch,
  }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({ products: [], loadProducts: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import ProductRecipeSection from './ProductRecipeSection.jsx';

const product = {
  _id: 'prod-1',
  name: 'Galletas de avena',
  sku: 'GALLETAS-001',
  unitOfMeasure: 'unidad',
};

const existingBom = {
  _id: 'bom-1',
  productionQuantity: 20,
  productionUnit: 'unidad',
  components: [
    {
      componentProductId: { _id: 'avena-1', name: 'Avena' },
      quantity: 2,
      unit: 'kg',
      scrapPercentage: 0,
    },
  ],
};

describe('ProductRecipeSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calculateTotalCost.mockResolvedValue(10);
  });

  it('muestra el toggle de elaboración propia', async () => {
    getBomByProduct.mockResolvedValue([]);
    render(<ProductRecipeSection product={product} />);
    expect(
      await screen.findByText(/este producto lo elaboro yo/i),
    ).toBeInTheDocument();
  });

  it('carga una receta existente y muestra la sección Producir lote', async () => {
    getBomByProduct.mockResolvedValue([existingBom]);
    render(<ProductRecipeSection product={product} />);

    expect(await screen.findByText('Avena')).toBeInTheDocument();
    expect(screen.getByText(/producir lote/i)).toBeInTheDocument();
  });

  it('produce un lote llamando produceBatch con la cantidad', async () => {
    getBomByProduct.mockResolvedValue([existingBom]);
    previewProduction.mockResolvedValue({
      allAvailable: true,
      missing: [],
      estimatedCost: 20,
      estimatedUnitCost: 0.5,
    });
    produceBatch.mockResolvedValue({ produced: 40, unit: 'unidad', unitCost: 0.5 });

    render(<ProductRecipeSection product={product} />);
    const input = await screen.findByLabelText('Cantidad a producir');
    await userEvent.type(input, '40');
    await userEvent.tab(); // dispara la vista previa (onBlur)

    // Espera a que la vista previa resuelva (botón deja de estar deshabilitado).
    expect(await screen.findByText(/costo del lote/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^producir$/i }));

    expect(produceBatch).toHaveBeenCalledWith('bom-1', 40);
  });
});
