import { PayrollStructurePeriodType } from "../../../schemas/payroll-structure.schema";

export interface DefaultStructureBlueprint {
  slug: string;
  name: string;
  description: string;
  appliesToRoles?: string[];
  appliesToDepartments?: string[];
  appliesToContractTypes?: string[];
  periodType: PayrollStructurePeriodType;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export const DEFAULT_PAYROLL_STRUCTURES: DefaultStructureBlueprint[] = [
  {
    slug: "general-monthly",
    name: "Estructura General Mensual",
    description:
      "Cobertura base para colaboradores administrativos con beneficios estándar y pagos mensuales.",
    periodType: "monthly",
    isActive: true,
    metadata: {
      tags: ["default", "general"],
    },
  },
  {
    slug: "operations-biweekly",
    name: "Estructura Operativa Quincenal",
    description:
      "Pensada para equipos operativos/producción que requieren pagos quincenales y asignaciones variables.",
    periodType: "biweekly",
    isActive: false,
    appliesToDepartments: ["Operaciones", "Producción", "Logística"],
    metadata: {
      tags: ["operativo", "quincenal"],
    },
  },
  {
    slug: "sales-commissions",
    name: "Estructura Ventas y Comisiones",
    description:
      "Plantilla para áreas comerciales con variables por comisiones y asignaciones especiales.",
    periodType: "monthly",
    isActive: false,
    appliesToDepartments: ["Ventas"],
    appliesToContractTypes: ["comisionista"],
    metadata: {
      tags: ["ventas", "variable"],
    },
  },
];
