import { ACCOUNT_TYPES } from "../schemas/chart-of-accounts.schema";

type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface SystemAccountBlueprint {
  code: string;
  name: string;
  type: AccountType;
  isSystemAccount: boolean;
  metadata?: Record<string, any>;
}

/**
 * Cuentas contables del sistema para el módulo de Comisiones y Bonos
 *
 * Estas cuentas se crean automáticamente para cada tenant cuando se
 * activa el módulo de comisiones.
 *
 * Flujo contable de COMISIONES:
 * ════════════════════════════
 * Al completar venta con vendedor:
 *   DR 5301 Gasto de Comisiones      $XX
 *   CR 2107 Comisiones por Pagar           $XX
 *
 * Al pagar nómina:
 *   DR 2107 Comisiones por Pagar     $XX
 *   CR 2103 Sueldos por Pagar              $XX
 *
 * Flujo contable de BONOS:
 * ════════════════════════
 * Al otorgar bono (meta alcanzada):
 *   DR 5302 Gasto de Bonos por Metas $XX
 *   CR 2108 Bonos por Pagar                $XX
 *
 * Al pagar nómina:
 *   DR 2108 Bonos por Pagar          $XX
 *   CR 2103 Sueldos por Pagar              $XX
 *
 * Flujo contable de PROPINAS:
 * ═══════════════════════════
 * Al recibir propina del cliente:
 *   DR 1101 Caja y Bancos            $XX
 *   CR 2109 Propinas por Pagar             $XX
 *
 * Al distribuir propinas a empleados:
 *   DR 2109 Propinas por Pagar       $XX
 *   CR 2103 Sueldos por Pagar              $XX
 */
export const COMMISSION_SYSTEM_ACCOUNTS: SystemAccountBlueprint[] = [
  // ════════════════════════════════════════════════════════════════════
  // PASIVOS - Obligaciones con empleados
  // ════════════════════════════════════════════════════════════════════
  {
    code: "2107",
    name: "Comisiones por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: {
      commissionCategory: "commission_payable",
      description: "Comisiones devengadas pendientes de pago a vendedores",
    },
  },
  {
    code: "2108",
    name: "Bonos por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: {
      commissionCategory: "bonus_payable",
      description: "Bonos por metas alcanzadas pendientes de pago",
    },
  },
  {
    code: "2109",
    name: "Propinas por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: {
      commissionCategory: "tips_payable",
      description: "Propinas recaudadas pendientes de distribuir a empleados",
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // GASTOS - Reducen el profit de la compañía
  // ════════════════════════════════════════════════════════════════════
  {
    code: "5301",
    name: "Gasto de Comisiones sobre Ventas",
    type: "Gasto",
    isSystemAccount: false,
    metadata: {
      commissionCategory: "commission_expense",
      description: "Comisiones pagadas a vendedores por ventas realizadas",
      affectsProfit: true,
    },
  },
  {
    code: "5302",
    name: "Gasto de Bonos por Metas",
    type: "Gasto",
    isSystemAccount: false,
    metadata: {
      commissionCategory: "bonus_expense",
      description: "Bonos pagados por cumplimiento de metas de ventas",
      affectsProfit: true,
    },
  },
];

/**
 * Mapa de códigos de cuenta para uso en servicios
 */
export const COMMISSION_ACCOUNT_CODES = {
  // Pasivos
  COMMISSIONS_PAYABLE: "2107",
  BONUSES_PAYABLE: "2108",
  TIPS_PAYABLE: "2109",

  // Gastos
  COMMISSION_EXPENSE: "5301",
  BONUS_EXPENSE: "5302",

  // Referencia a cuentas existentes (de payroll)
  SALARIES_PAYABLE: "2110", // Para reverso al pagar nómina
  CASH_BANK: "1101", // Para registro de propinas en efectivo
} as const;
