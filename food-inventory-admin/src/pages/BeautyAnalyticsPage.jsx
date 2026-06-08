import React from 'react';
import BeautyReportsWidget from '@/components/BeautyReportsWidget';

/**
 * Página de Analítica para perfiles beauty (barbershop-salon, clinic-spa).
 *
 * Concentra los reportes estratégicos del negocio:
 * ingresos por profesional, servicios populares, tasa de no-show,
 * retención de clientes, horas pico, utilización de profesionales.
 *
 * Complementa al BeautyDashboardView (operación del día) con métricas
 * de tendencia.
 */
const BeautyAnalyticsPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <BeautyReportsWidget />
    </div>
  );
};

export default BeautyAnalyticsPage;
