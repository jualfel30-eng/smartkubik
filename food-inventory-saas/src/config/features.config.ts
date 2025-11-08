import { config as loadEnv } from "dotenv";
import { join } from "path";
import { existsSync } from "fs";

const envPath = join(__dirname, "../../", ".env");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

/**
 * Feature Flags Configuration
 *
 * Este archivo centraliza el control de todas las features nuevas.
 * Usar variables de entorno para activar/desactivar features sin recompilar.
 */

export interface FeatureFlags {
  // Fase 1: Fixes Críticos
  EMPLOYEE_PERFORMANCE_TRACKING: boolean;

  // Fase 2: Cuentas Bancarias
  BANK_ACCOUNTS_MOVEMENTS: boolean;
  BANK_ACCOUNTS_RECONCILIATION: boolean;
  BANK_ACCOUNTS_TRANSFERS: boolean;

  // Fase 3: Dashboard y Reportes
  DASHBOARD_CHARTS: boolean;
  ADVANCED_REPORTS: boolean;

  // Fase 4: Features Avanzadas
  PREDICTIVE_ANALYTICS: boolean;
  CUSTOMER_SEGMENTATION: boolean;

  // Fase 1B: Login Multi-Tenant
  MULTI_TENANT_LOGIN: boolean;

  // Servicios & Booking
  SERVICE_BOOKING_PORTAL: boolean;
  APPOINTMENT_REMINDERS: boolean;
}

/**
 * Estado actual de feature flags
 * Lee desde variables de entorno con fallback a false (seguro por defecto)
 */
export const FEATURES: FeatureFlags = {
  // Fase 1
  EMPLOYEE_PERFORMANCE_TRACKING:
    process.env.ENABLE_EMPLOYEE_PERFORMANCE === "true",

  // Fase 2
  BANK_ACCOUNTS_MOVEMENTS: process.env.ENABLE_BANK_MOVEMENTS === "true",

  BANK_ACCOUNTS_RECONCILIATION:
    process.env.ENABLE_BANK_RECONCILIATION === "true",

  BANK_ACCOUNTS_TRANSFERS: process.env.ENABLE_BANK_TRANSFERS === "true",

  // Fase 3
  DASHBOARD_CHARTS: process.env.ENABLE_DASHBOARD_CHARTS === "true",

  ADVANCED_REPORTS: process.env.ENABLE_ADVANCED_REPORTS === "true",

  // Fase 4
  PREDICTIVE_ANALYTICS: process.env.ENABLE_PREDICTIVE_ANALYTICS === "true",

  CUSTOMER_SEGMENTATION: process.env.ENABLE_CUSTOMER_SEGMENTATION === "true",

  // Fase 1B
  MULTI_TENANT_LOGIN: process.env.ENABLE_MULTI_TENANT_LOGIN === "true",

  // Servicios & Booking
  SERVICE_BOOKING_PORTAL: process.env.ENABLE_SERVICE_BOOKING_PORTAL === "true",
  APPOINTMENT_REMINDERS: process.env.ENABLE_APPOINTMENT_REMINDERS === "true",
};

/**
 * Helper para logging del estado de features
 * Útil para debugging y verificación
 */
export function logFeatureStatus(): void {
  console.log("🎛️  Feature Flags Status:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  Object.entries(FEATURES).forEach(([key, value]) => {
    const icon = value ? "✅" : "❌";
    const status = value ? "ENABLED " : "DISABLED";
    console.log(`  ${icon} ${status} - ${key}`);
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

/**
 * Verificar si una feature específica está activa
 * @param featureName - Nombre de la feature
 * @returns boolean
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  return FEATURES[featureName] === true;
}

/**
 * Obtener lista de features activas
 * @returns Array de nombres de features activas
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([name]) => name);
}

/**
 * Obtener lista de features inactivas
 * @returns Array de nombres de features inactivas
 */
export function getDisabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, enabled]) => !enabled)
    .map(([name]) => name);
}
