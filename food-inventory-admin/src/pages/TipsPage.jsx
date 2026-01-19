import TipsManagementDashboard from '@/components/TipsManagementDashboard';

/**
 * Página principal del módulo de Propinas
 *
 * Este módulo permite:
 * - Ver dashboard de propinas con KPIs
 * - Configurar reglas de distribución (equitativa, por horas, por ventas)
 * - Distribuir propinas manualmente o automáticamente
 * - Ver reportes consolidados por empleado y período
 * - Integrar propinas con nómina
 *
 * La funcionalidad completa está implementada en TipsManagementDashboard
 */
const TipsPage = () => {
  return <TipsManagementDashboard />;
};

export default TipsPage;
