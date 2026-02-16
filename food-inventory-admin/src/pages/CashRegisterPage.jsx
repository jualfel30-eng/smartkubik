import CashRegisterDashboard from '@/components/cash-register/CashRegisterDashboard';

/**
 * Página principal del módulo de Cierre de Caja
 *
 * Este módulo permite:
 * - Abrir y cerrar sesiones de caja
 * - Registrar movimientos de efectivo (entradas/salidas)
 * - Generar cierres de caja individuales por cajero
 * - Generar cierres globales/consolidados (Admin)
 * - Ver historial de cierres con filtros
 * - Aprobar/rechazar cierres
 * - Exportar reportes en PDF/Excel
 * - Ver resumen por método de pago, impuestos y diferencias
 *
 * La funcionalidad completa está implementada en CashRegisterDashboard
 */
const CashRegisterPage = () => {
  return <CashRegisterDashboard />;
};

export default CashRegisterPage;
