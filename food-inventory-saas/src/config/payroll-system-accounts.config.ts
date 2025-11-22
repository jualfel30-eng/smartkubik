import { ACCOUNT_TYPES } from "../schemas/chart-of-accounts.schema";

type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface SystemAccountBlueprint {
  code: string;
  name: string;
  type: AccountType;
  isSystemAccount: boolean;
  metadata?: Record<string, any>;
}

export const PAYROLL_SYSTEM_ACCOUNTS: SystemAccountBlueprint[] = [
  {
    code: "5201",
    name: "Gasto de Sueldos y Salarios",
    type: "Gasto",
    isSystemAccount: false,
    metadata: { payrollCategory: "salary" },
  },
  {
    code: "2103",
    name: "Sueldos y Salarios por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: { payrollCategory: "net_pay" },
  },
  {
    code: "2104",
    name: "Prestaciones Sociales por Pagar",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: { payrollCategory: "benefits" },
  },
  {
    code: "2105",
    name: "Aportes Patronales Seguridad Social",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: { payrollCategory: "statutory_contribution" },
  },
  {
    code: "2106",
    name: "Aportes Paro Forzoso / FAOV",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: { payrollCategory: "statutory_contribution" },
  },
  {
    code: "2102",
    name: "Retenciones de ISLR",
    type: "Pasivo",
    isSystemAccount: true,
    metadata: { payrollCategory: "withholding" },
  },
  {
    code: "5205",
    name: "Gasto de Prestaciones Sociales",
    type: "Gasto",
    isSystemAccount: false,
    metadata: { payrollCategory: "expense_benefit" },
  },
  {
    code: "5206",
    name: "Gasto de Seguridad Social",
    type: "Gasto",
    isSystemAccount: false,
    metadata: { payrollCategory: "expense_contribution" },
  },
  {
    code: "5207",
    name: "Gasto de Aguinaldos y Bonos Especiales",
    type: "Gasto",
    isSystemAccount: false,
    metadata: { payrollCategory: "bonus" },
  },
  {
    code: "5208",
    name: "Gasto de Vacaciones y Bono Vacacional",
    type: "Gasto",
    isSystemAccount: false,
    metadata: { payrollCategory: "vacation" },
  },
];
