import { Injectable, Logger } from "@nestjs/common";
import { PayrollStructure } from "../../schemas/payroll-structure.schema";
import { PayrollRule } from "../../schemas/payroll-rule.schema";
import { PreviewPayrollStructureDto } from "./dto/preview-payroll-structure.dto";
import jsonLogic from "json-logic-js";

interface PreviewEntry {
  conceptId: string;
  conceptType: string;
  calculationType: string;
  amount: number;
  priority: number;
  label?: string;
  baseAmount?: number;
  appliedPercentage?: number;
  references?: string[];
}

interface RuleEvaluationLog {
  ruleId: string;
  conceptId: string;
  conceptType: string;
  calculationType: PayrollRule["calculationType"];
  priority: number;
  baseAmount: number;
  amount: number;
  skipped: boolean;
  reason?: string;
  references?: string[];
  missingReferences?: string[];
  fallbackUsed?: boolean;
  contextKeys?: string[];
  error?: string;
}

interface RuntimeIndexes {
  byConceptId: Map<string, number>;
  byConceptCode: Map<string, number>;
}

interface PayrollEnginePreview {
  structure: PayrollStructure;
  totals: {
    earnings: number;
    deductions: number;
    employerCosts: number;
    netPay: number;
  };
  entries: PreviewEntry[];
  logs?: RuleEvaluationLog[];
}

interface ConceptMeta {
  code?: string;
  name?: string;
  conceptType?: string;
}

interface PayrollEngineOptions {
  conceptMap?: Map<string, ConceptMeta>;
  captureLogs?: boolean;
}

@Injectable()
export class PayrollEngineService {
  private readonly logger = new Logger(PayrollEngineService.name);

  previewStructure(
    structure: PayrollStructure,
    rules: PayrollRule[],
    payload: PreviewPayrollStructureDto,
    options: PayrollEngineOptions = {},
  ): PayrollEnginePreview {
    const baseSalary = payload.baseSalary ?? payload.baseAmount ?? 0;
    const baseAmount = payload.baseAmount ?? payload.baseSalary ?? 0;
    const runtimeContext: Record<string, any> = {
      baseSalary,
      baseAmount,
      ...(payload.context || {}),
    };
    const indexes: RuntimeIndexes = {
      byConceptId: new Map<string, number>(),
      byConceptCode: new Map<string, number>(),
    };
    const sortedRules = [...rules].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );
    const entries: PreviewEntry[] = [];
    const logs: RuleEvaluationLog[] = [];

    for (const rule of sortedRules) {
      if (!rule.isActive) continue;
      const conceptId = rule.conceptId?.toString();
      if (!conceptId) continue;
      const conceptMeta = options.conceptMap?.get(conceptId);
      const result = this.evaluateRule(
        rule,
        runtimeContext,
        indexes,
        conceptMeta,
      );
      if (options.captureLogs !== false && result.log) {
        logs.push(result.log);
      }
      if (result.entry) {
        entries.push(result.entry);
        this.registerComputedValue(
          runtimeContext,
          indexes,
          conceptId,
          result.entry.amount,
          conceptMeta,
        );
      }
    }

    const totals = entries.reduce(
      (acc, entry) => {
        if (entry.conceptType === "earning") {
          acc.earnings += entry.amount;
        } else if (entry.conceptType === "deduction") {
          acc.deductions += entry.amount;
        } else {
          acc.employerCosts += entry.amount;
        }
        return acc;
      },
      { earnings: 0, deductions: 0, employerCosts: 0 },
    );

    return {
      structure,
      totals: {
        ...totals,
        netPay: totals.earnings - totals.deductions,
      },
      entries,
      logs: options.captureLogs === false ? undefined : logs,
    };
  }

  private evaluateRule(
    rule: PayrollRule,
    context: Record<string, any>,
    indexes: RuntimeIndexes,
    conceptMeta?: ConceptMeta,
  ): { entry: PreviewEntry | null; log: RuleEvaluationLog } {
    const conceptId = rule.conceptId?.toString() || "unknown";
    const log: RuleEvaluationLog = {
      ruleId: (rule as any)._id?.toString?.() || conceptId,
      conceptId,
      conceptType: rule.conceptType,
      calculationType: rule.calculationType,
      priority: rule.priority ?? 0,
      baseAmount: 0,
      amount: 0,
      skipped: false,
      references: rule.baseConceptCodes || [],
      missingReferences: [],
      contextKeys: Object.keys(context || {}),
    };

    if (this.detectSelfReference(rule, conceptMeta)) {
      log.skipped = true;
      log.reason = "self-reference";
      return { entry: null, log };
    }

    const baseResolution = this.resolveBaseAmount(rule, context, indexes);
    log.baseAmount = baseResolution.value;
    log.missingReferences = baseResolution.missing;
    log.fallbackUsed = baseResolution.fallbackUsed;

    if (rule.calculationType === "percentage" && baseResolution.value === 0) {
      log.skipped = true;
      log.reason = "percentage-without-base";
      return { entry: null, log };
    }

    const amount = this.calculateAmount(rule, baseResolution.value, context);

    if (!Number.isFinite(amount)) {
      log.skipped = true;
      log.reason = "invalid-result";
      return { entry: null, log };
    }

    const normalizedAmount = this.normalizeAmount(amount, rule.conceptType);
    log.amount = normalizedAmount;

    if (normalizedAmount === 0) {
      log.skipped = true;
      log.reason = log.reason || "zero-result";
    }

    const entry: PreviewEntry = {
      conceptId,
      conceptType: rule.conceptType,
      calculationType: rule.calculationType,
      amount: normalizedAmount,
      priority: rule.priority ?? 0,
      label: conceptMeta?.name,
      baseAmount: baseResolution.value,
      appliedPercentage:
        rule.calculationType === "percentage" ? rule.percentage : undefined,
      references: rule.baseConceptCodes || [],
    };

    return { entry, log };
  }

  private resolveBaseAmount(
    rule: PayrollRule,
    context: Record<string, any>,
    indexes: RuntimeIndexes,
  ) {
    const references = Array.isArray(rule.baseConceptCodes)
      ? rule.baseConceptCodes
      : [];
    const resolvedValues: number[] = [];
    const missing: string[] = [];

    references.forEach((ref) => {
      if (!ref) return;
      const resolved = this.lookupReferenceValue(ref, context, indexes);
      if (typeof resolved === "number") {
        resolvedValues.push(resolved);
      } else {
        missing.push(ref);
      }
    });

    const valueFromRefs =
      resolvedValues.length > 0
        ? resolvedValues.reduce((sum, curr) => sum + curr, 0)
        : undefined;

    const fallbackValue =
      typeof context.baseSalary === "number"
        ? context.baseSalary
        : typeof context.baseAmount === "number"
          ? context.baseAmount
          : 0;

    return {
      value: typeof valueFromRefs === "number" ? valueFromRefs : fallbackValue,
      references,
      missing,
      fallbackUsed: typeof valueFromRefs !== "number",
    };
  }

  private lookupReferenceValue(
    reference: string,
    context: Record<string, any>,
    indexes: RuntimeIndexes,
  ) {
    const trimmed = reference.trim();
    if (!trimmed) return undefined;
    const normalized = trimmed.startsWith("concept:")
      ? trimmed.slice("concept:".length)
      : trimmed;
    if (indexes.byConceptId.has(normalized)) {
      return indexes.byConceptId.get(normalized);
    }
    if (indexes.byConceptCode.has(normalized)) {
      return indexes.byConceptCode.get(normalized);
    }
    if (indexes.byConceptId.has(trimmed)) {
      return indexes.byConceptId.get(trimmed);
    }
    if (indexes.byConceptCode.has(trimmed)) {
      return indexes.byConceptCode.get(trimmed);
    }
    if (typeof context[trimmed] === "number") {
      return context[trimmed];
    }
    if (typeof context[normalized] === "number") {
      return context[normalized];
    }
    return undefined;
  }

  private registerComputedValue(
    context: Record<string, any>,
    indexes: RuntimeIndexes,
    conceptId: string,
    amount: number,
    conceptMeta?: ConceptMeta,
  ) {
    indexes.byConceptId.set(conceptId, amount);
    context[conceptId] = amount;
    context[`concept:${conceptId}`] = amount;
    if (conceptMeta?.code) {
      indexes.byConceptCode.set(conceptMeta.code, amount);
      context[conceptMeta.code] = amount;
      context[`concept:${conceptMeta.code}`] = amount;
    }
    if (conceptMeta?.name) {
      context[`concept:${conceptMeta.name}`] = amount;
    }
  }

  private detectSelfReference(rule: PayrollRule, conceptMeta?: ConceptMeta) {
    if (!rule.baseConceptCodes?.length) {
      return false;
    }
    const conceptId = rule.conceptId?.toString();
    const conceptCode = conceptMeta?.code;
    return rule.baseConceptCodes.some((ref) => {
      if (!ref) return false;
      const normalized = ref.replace("concept:", "").trim();
      return (
        (conceptId && normalized === conceptId) ||
        (conceptCode && normalized.toLowerCase() === conceptCode.toLowerCase())
      );
    });
  }

  private calculateAmount(
    rule: PayrollRule,
    baseAmount: number,
    context: Record<string, any>,
  ) {
    switch (rule.calculationType) {
      case "percentage": {
        const pct =
          typeof rule.percentage === "number" ? rule.percentage : 0;
        return baseAmount * (pct / 100);
      }
      case "formula":
        return this.evaluateFormula(rule.formula, context);
      case "fixed":
      default:
        return typeof rule.amount === "number" ? rule.amount : 0;
    }
  }

  private evaluateFormula(
    formula: string | undefined,
    context: Record<string, any>,
  ) {
    if (!formula) return 0;
    try {
      const parsed =
        typeof formula === "string" ? JSON.parse(formula) : formula;
      const result = jsonLogic.apply(parsed, context);
      if (typeof result === "number" && Number.isFinite(result)) {
        return result;
      }
      return 0;
    } catch (error) {
      this.logger.warn(`Failed to evaluate payroll formula: ${error?.message}`);
      return 0;
    }
  }

  private normalizeAmount(value: number, conceptType: string) {
    let normalized = Number.isFinite(value) ? value : 0;
    if (conceptType === "deduction") {
      normalized = Math.abs(normalized);
    } else {
      normalized = Math.max(0, normalized);
    }
    return Number.isFinite(normalized)
      ? Math.round(normalized * 100) / 100
      : 0;
  }
}
