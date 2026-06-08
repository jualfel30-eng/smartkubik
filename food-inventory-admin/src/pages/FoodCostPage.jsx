import React from 'react';
import FoodCostWidget from '@/components/FoodCostWidget';

/**
 * Página de Food Cost % para restaurantes.
 *
 * KPI #1 para food-service: costo de ingredientes vs ventas.
 * La implementación funcional vive en FoodCostWidget (selector de
 * período, gauge de porcentaje, comparación con benchmark del 30%,
 * desglose de ventas / costos / costo por orden).
 */
const FoodCostPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <FoodCostWidget />
    </div>
  );
};

export default FoodCostPage;
