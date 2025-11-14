import { PayrollEngineService } from '../../src/modules/payroll-structures/payroll.engine.service';
import { PayrollRule } from '../../src/schemas/payroll-rule.schema';
import { PayrollStructure } from '../../src/schemas/payroll-structure.schema';

const buildStructure = (overrides: Partial<PayrollStructure> = {}): PayrollStructure => ({
  _id: 'structure-1' as any,
  tenantId: 'tenant-1' as any,
  name: 'Estructura QA',
  description: '',
  periodType: 'monthly',
  appliesToRoles: [],
  appliesToDepartments: [],
  appliesToContractTypes: [],
  effectiveFrom: new Date(),
  isActive: true,
  version: 1,
  scopeKey: '*#*#*',
  roleKey: '*',
  departmentKey: '*',
  contractTypeKey: '*',
  metadata: {},
  ...overrides,
} as PayrollStructure);

const buildRule = (overrides: Partial<PayrollRule>): PayrollRule =>
  ({
    _id: (overrides as any)._id ?? `rule-${Math.random()}`,
    conceptId: overrides.conceptId,
    conceptType: overrides.conceptType ?? 'earning',
    calculationType: overrides.calculationType ?? 'fixed',
    amount: overrides.amount ?? 0,
    percentage: overrides.percentage,
    baseConceptCodes: overrides.baseConceptCodes,
    priority: overrides.priority ?? 0,
    formula: overrides.formula,
    isActive: overrides.isActive ?? true,
    tenantId: overrides.tenantId ?? ('tenant-1' as any),
    structureId: overrides.structureId ?? ('structure-1' as any),
  } as PayrollRule);

describe('PayrollEngineService', () => {
  const engine = new PayrollEngineService();
  const structure = buildStructure();

  const conceptMap = new Map([
    [
      'earning-1',
      { code: 'E001', name: 'Salario base', conceptType: 'earning' },
    ],
    [
      'deduction-1',
      { code: 'D001', name: 'IVA retención', conceptType: 'deduction' },
    ],
  ]);

  it('should keep net equals earnings minus deductions', () => {
    const rules = [
      buildRule({
        conceptId: 'earning-1' as any,
        conceptType: 'earning',
        amount: 1000,
        priority: 1,
      }),
      buildRule({
        conceptId: 'deduction-1' as any,
        conceptType: 'deduction',
        amount: 200,
        priority: 2,
      }),
    ];

    const preview = engine.previewStructure(
      structure,
      rules,
      { baseSalary: 1000, context: {} },
      { conceptMap },
    );

    expect(preview.totals.earnings).toBe(1000);
    expect(preview.totals.deductions).toBe(200);
    expect(preview.totals.netPay).toBe(800);
  });

  it('should support percentage rules referencing other concepts', () => {
    const rules = [
      buildRule({
        conceptId: 'earning-1' as any,
        conceptType: 'earning',
        amount: 1000,
        priority: 1,
      }),
      buildRule({
        conceptId: 'deduction-1' as any,
        conceptType: 'deduction',
        calculationType: 'percentage',
        percentage: 10,
        baseConceptCodes: ['E001'],
        priority: 2,
      }),
    ];

    const preview = engine.previewStructure(
      structure,
      rules,
      { baseSalary: 1000, context: {} },
      { conceptMap },
    );

    const deductionEntry = preview.entries.find(
      (entry) => entry.conceptType === 'deduction',
    );
    expect(deductionEntry?.amount).toBe(100);
    expect(preview.totals.deductions).toBe(100);
    expect(preview.totals.netPay).toBe(900);
  });

  it('should skip rules that reference themselves in baseConceptCodes', () => {
    const rules = [
      buildRule({
        conceptId: 'deduction-1' as any,
        conceptType: 'deduction',
        calculationType: 'percentage',
        percentage: 10,
        baseConceptCodes: ['D001'],
        priority: 1,
      }),
    ];

    const preview = engine.previewStructure(
      structure,
      rules,
      { baseSalary: 1000, context: {} },
      { conceptMap },
    );

    expect(preview.entries).toHaveLength(0);
    expect(preview.logs?.[0]?.skipped).toBe(true);
    expect(preview.logs?.[0]?.reason).toBe('self-reference');
  });
});
