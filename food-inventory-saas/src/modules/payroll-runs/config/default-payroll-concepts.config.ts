import { PayrollConceptType } from "../../../schemas/payroll-concept.schema";

export type PayrollConceptCalculationMethod =
  | "fixed_amount"
  | "percentage_of_base"
  | "custom_formula";

export interface DefaultPayrollConceptBlueprint {
  code: string;
  name: string;
  conceptType: PayrollConceptType;
  description?: string;
  debitAccountCode?: string;
  creditAccountCode?: string;
  calculation?: {
    method: PayrollConceptCalculationMethod;
    value?: number;
    formula?: string;
  };
  isActive?: boolean;
  metadata?: Record<string, any>;
  localization?: string;
}

const defaultCalculation = {
  method: "fixed_amount" as PayrollConceptCalculationMethod,
};

export const DEFAULT_PAYROLL_CONCEPTS: DefaultPayrollConceptBlueprint[] = [
  {
    code: "SALARIO_BASE",
    name: "Salario base",
    conceptType: "earning",
    description: "Sueldo integral mensual del trabajador.",
    debitAccountCode: "5201",
    creditAccountCode: "2103",
    calculation: defaultCalculation,
    metadata: { category: "salary", localization: "VE" },
    localization: "VE",
  },
  {
    code: "BONO_VACACIONAL",
    name: "Bono vacacional",
    conceptType: "earning",
    description: "Pago adicional asociado a vacaciones.",
    debitAccountCode: "5208",
    creditAccountCode: "2103",
    calculation: defaultCalculation,
    metadata: { category: "vacation_bonus", localization: "VE" },
    localization: "VE",
  },
  {
    code: "UTILIDADES_ANUALES",
    name: "Utilidades / Aguinaldos",
    conceptType: "earning",
    description: "Bono de utilidades o aguinaldos.",
    debitAccountCode: "5207",
    creditAccountCode: "2103",
    calculation: defaultCalculation,
    metadata: { category: "bonus", localization: "VE" },
    localization: "VE",
  },
  {
    code: "PRESTACIONES_SOCIALES",
    name: "Prestaciones sociales",
    conceptType: "earning",
    description: "Acreditación mensual de prestaciones sociales.",
    debitAccountCode: "5205",
    creditAccountCode: "2104",
    calculation: defaultCalculation,
    metadata: { category: "severance", localization: "VE" },
    localization: "VE",
  },
  {
    code: "APORTE_PATRONAL_IVSS",
    name: "Aporte patronal IVSS",
    conceptType: "employer",
    description: "Contribución patronal a la seguridad social.",
    debitAccountCode: "5206",
    creditAccountCode: "2105",
    calculation: defaultCalculation,
    metadata: { category: "employer_contribution", localization: "VE" },
    localization: "VE",
  },
  {
    code: "APORTE_PATRONAL_PARAFISCALES",
    name: "Aporte patronal FAOV/INCES",
    conceptType: "employer",
    description: "Contribuciones patronales para FAOV / INCE / Paro forzoso.",
    debitAccountCode: "5206",
    creditAccountCode: "2106",
    calculation: defaultCalculation,
    metadata: { category: "employer_contribution", localization: "VE" },
    localization: "VE",
  },
  {
    code: "RETENCION_ISLR",
    name: "Retención ISLR trabajador",
    conceptType: "deduction",
    description: "Retención de ISLR aplicada al trabajador.",
    debitAccountCode: "2103",
    creditAccountCode: "2102",
    calculation: defaultCalculation,
    metadata: { category: "withholding", localization: "VE" },
    localization: "VE",
  },
  {
    code: "RETENCION_IVSS_TRABAJADOR",
    name: "Aporte IVSS trabajador",
    conceptType: "deduction",
    description: "Porcentaje del IVSS descontado al trabajador.",
    debitAccountCode: "2103",
    creditAccountCode: "2105",
    calculation: defaultCalculation,
    metadata: { category: "worker_contribution", localization: "VE" },
    localization: "VE",
  },
  {
    code: "RETENCION_PARAFISCALES_TRABAJADOR",
    name: "Aporte parafiscal trabajador",
    conceptType: "deduction",
    description: "FAOV / Paro forzoso aportado por el trabajador.",
    debitAccountCode: "2103",
    creditAccountCode: "2106",
    calculation: defaultCalculation,
    metadata: { category: "worker_contribution", localization: "VE" },
    localization: "VE",
  },
];
