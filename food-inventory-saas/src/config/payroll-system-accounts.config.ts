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
];
