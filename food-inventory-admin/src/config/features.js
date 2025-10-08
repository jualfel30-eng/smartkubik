/**
 * Feature Flags Configuration - Frontend
 *
 * Este archivo centraliza el control de features en el frontend.
 * Sincronizado con backend para consistencia.
 */

export const FEATURES = {
  // Fase 1: Fixes Críticos
  EMPLOYEE_PERFORMANCE_TRACKING:
    import.meta.env.VITE_ENABLE_EMPLOYEE_PERFORMANCE === 'true',

  // Fase 2: Cuentas Bancarias
  BANK_ACCOUNTS_MOVEMENTS:
    import.meta.env.VITE_ENABLE_BANK_MOVEMENTS === 'true',

  BANK_ACCOUNTS_RECONCILIATION:
    import.meta.env.VITE_ENABLE_BANK_RECONCILIATION === 'true',

  BANK_ACCOUNTS_TRANSFERS:
    import.meta.env.VITE_ENABLE_BANK_TRANSFERS === 'true',

  // Fase 3: Dashboard y Reportes
  DASHBOARD_CHARTS:
    import.meta.env.VITE_ENABLE_DASHBOARD_CHARTS === 'true',

  ADVANCED_REPORTS:
    import.meta.env.VITE_ENABLE_ADVANCED_REPORTS === 'true',

  // Fase 4: Features Avanzadas
  PREDICTIVE_ANALYTICS:
    import.meta.env.VITE_ENABLE_PREDICTIVE_ANALYTICS === 'true',

  CUSTOMER_SEGMENTATION:
    import.meta.env.VITE_ENABLE_CUSTOMER_SEGMENTATION === 'true',

  // Fase 1B: Login Multi-Tenant
  MULTI_TENANT_LOGIN:
    import.meta.env.VITE_ENABLE_MULTI_TENANT_LOGIN === 'true',
};

/**
 * Helper para logging del estado de features
 */
export function logFeatureStatus() {
  console.log('🎛️  Frontend Feature Flags Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  Object.entries(FEATURES).forEach(([key, value]) => {
    const icon = value ? '✅' : '❌';
    const status = value ? 'ENABLED ' : 'DISABLED';
    console.log(`  ${icon} ${status} - ${key}`);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Verificar si una feature específica está activa
 */
export function isFeatureEnabled(featureName) {
  return FEATURES[featureName] === true;
}

/**
 * Obtener lista de features activas
 */
export function getEnabledFeatures() {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}

// Log en desarrollo
if (import.meta.env.DEV) {
  logFeatureStatus();
}
