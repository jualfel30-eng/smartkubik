import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PayrollConcept,
  PayrollConceptDocument,
} from "../../schemas/payroll-concept.schema";
import {
  PayrollRun,
  PayrollRunDocument,
} from "../../schemas/payroll-run.schema";
import {
  PayrollCalendar,
  PayrollCalendarDocument,
} from "../../schemas/payroll-calendar.schema";
import {
  PayrollStructure,
  PayrollStructureDocument,
} from "../../schemas/payroll-structure.schema";
import {
  PayrollRule,
  PayrollRuleDocument,
} from "../../schemas/payroll-rule.schema";
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from "../../schemas/employee-profile.schema";
import {
  EmployeeContract,
  EmployeeContractDocument,
} from "../../schemas/employee-contract.schema";
import {
  PayrollAuditLog,
  PayrollAuditLogDocument,
} from "../../schemas/payroll-audit-log.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { CreatePayrollConceptDto } from "./dto/create-payroll-concept.dto";
import { UpdatePayrollConceptDto } from "./dto/update-payroll-concept.dto";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { PayrollRunFiltersDto } from "./dto/payroll-run-filters.dto";
import { ExportPayrollRunDto } from "./dto/export-payroll-run.dto";
import { PayrollConceptFiltersDto } from "./dto/payroll-concept-filters.dto";
import { format } from "date-fns";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require("pdfkit");
import { AccountingService } from "../accounting/accounting.service";
import { PayrollEngineService } from "../payroll-structures/payroll.engine.service";
import { evaluateStructureMatch } from "../payroll-structures/utils/structure-matcher.util";

type LeanEmployeeProfile = EmployeeProfile & {
  _id: Types.ObjectId;
  customerId?: Types.ObjectId;
};

type LeanEmployeeContract = EmployeeContract & {
  _id: Types.ObjectId;
};

type LeanPayrollConcept = PayrollConcept & {
  _id?: Types.ObjectId;
};

type LeanPayrollStructure = PayrollStructure & {
  _id: Types.ObjectId;
};

interface PayrollRunCalculationMetadata {
  employeeId: string;
  contractId?: string;
  structureId?: string;
  structureVersion?: number;
  usedStructure: boolean;
  previewTotals?: {
    earnings: number;
    deductions: number;
    employerCosts: number;
    netPay: number;
  };
  ruleLogs?: any[];
}

interface PayrollComputationResult {
  entries: PayrollRun["entries"];
  grossPay: number;
  deductions: number;
  employerCosts: number;
  calculationMetadata: PayrollRunCalculationMetadata[];
}

@Injectable()
export class PayrollRunsService {
  constructor(
    @InjectModel(PayrollConcept.name)
    private readonly conceptModel: Model<PayrollConceptDocument>,
    @InjectModel(PayrollRun.name)
    private readonly runModel: Model<PayrollRunDocument>,
    @InjectModel(PayrollStructure.name)
    private readonly structureModel: Model<PayrollStructureDocument>,
    @InjectModel(PayrollRule.name)
    private readonly ruleModel: Model<PayrollRuleDocument>,
    @InjectModel(EmployeeProfile.name)
    private readonly profileModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeContract.name)
    private readonly contractModel: Model<EmployeeContractDocument>,
    @InjectModel(PayrollAuditLog.name)
    private readonly auditLogModel: Model<PayrollAuditLogDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(PayrollCalendar.name)
    private readonly calendarModel: Model<PayrollCalendarDocument>,
    private readonly accountingService: AccountingService,
    private readonly payrollEngine: PayrollEngineService,
  ) {}

  private toObjectId(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) return id;
    return new Types.ObjectId(id);
  }

  async createConcept(
    tenantId: string,
    dto: CreatePayrollConceptDto,
    userId?: string,
  ) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.conceptModel.findOne({
      tenantId: this.toObjectId(tenantId),
      code: normalizedCode,
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe un concepto con el código ${normalizedCode}`,
      );
    }

    const concept = await this.conceptModel.create({
      ...dto,
      code: normalizedCode,
      tenantId: this.toObjectId(tenantId),
    });

    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollConcept",
      entityId: concept._id,
      action: "create",
      after: concept.toObject(),
    });

    return concept;
  }

  async updateConcept(
    tenantId: string,
    conceptId: string,
    dto: UpdatePayrollConceptDto,
    userId?: string,
  ) {
    const concept = await this.conceptModel.findOne({
      _id: conceptId,
      tenantId: this.toObjectId(tenantId),
    });
    if (!concept) {
      throw new NotFoundException("Concepto no encontrado");
    }

    const before = concept.toObject();
    if (dto.code) {
      dto.code = dto.code.trim().toUpperCase();
    }

    Object.assign(concept, dto);
    await concept.save();

    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollConcept",
      entityId: concept._id,
      action: "update",
      before,
      after: concept.toObject(),
    });

    return concept;
  }

  async listConcepts(tenantId: string, filters: PayrollConceptFiltersDto = {}) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (filters.conceptType) {
      query.conceptType = filters.conceptType;
    }
    if (typeof filters.onlyActive === "boolean") {
      query.isActive = filters.onlyActive;
    }
    if (filters.debitAccountId) {
      query.debitAccountId = this.toObjectId(filters.debitAccountId);
    }
    if (filters.creditAccountId) {
      query.creditAccountId = this.toObjectId(filters.creditAccountId);
    }
    if (filters.search?.trim()) {
      const regex = new RegExp(filters.search.trim(), "i");
      query.$or = [{ code: regex }, { name: regex }, { description: regex }];
    }
    return this.conceptModel
      .find(query)
      .sort({ conceptType: 1, code: 1 })
      .lean();
  }

  async listRuns(tenantId: string, filters: PayrollRunFiltersDto) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (filters.status) query.status = filters.status;
    if (filters.periodType) query.periodType = filters.periodType;
    if (filters.calendarId) {
      query.calendarId = this.toObjectId(filters.calendarId);
    }
    if (filters.startDate || filters.endDate) {
      query.periodStart = {};
      if (filters.startDate) {
        query.periodStart.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.periodStart.$lte = new Date(filters.endDate);
      }
    }

    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 25;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.runModel
        .find(query)
        .sort({ periodStart: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.runModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRun(tenantId: string, runId: string) {
    const run = await this.runModel.findOne({
      _id: runId,
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) throw new NotFoundException("Payroll run no encontrado");
    return run;
  }

  private async syncCalendarFromRun(
    tenantId: Types.ObjectId,
    calendar: PayrollCalendarDocument,
    run: PayrollRunDocument,
    structureSummary: Record<string, any>,
  ) {
    const [totalRuns, pendingRuns] = await Promise.all([
      this.runModel.countDocuments({
        tenantId,
        calendarId: calendar._id,
      }),
      this.runModel.countDocuments({
        tenantId,
        calendarId: calendar._id,
        status: { $in: ["draft", "calculating", "calculated"] },
      }),
    ]);

    const coveragePercent = structureSummary?.coveragePercent ?? 0;

    const complianceFlags = {
      ...(calendar.metadata?.complianceFlags || {}),
      pendingRuns: pendingRuns > 0,
      pendingRunCount: pendingRuns,
      structureCoverageOk: coveragePercent >= 100,
      structureCoveragePercent: coveragePercent,
    };

    await this.calendarModel.updateOne(
      { _id: calendar._id, tenantId },
      {
        $set: {
          "metadata.structureSummary": structureSummary,
          "metadata.runStats": {
            totalRuns,
            pendingRuns,
          },
          "metadata.complianceFlags": complianceFlags,
          "metadata.lastRunId": run._id,
          "metadata.lastRunLabel": run.label,
          "metadata.lastRunStatus": run.status,
          "metadata.lastRunNetPay": run.netPay,
          "metadata.lastRunAt": new Date(),
        },
      },
    );
  }

  async createRun(tenantId: string, dto: CreatePayrollRunDto, userId?: string) {
    const tenantObjectId = this.toObjectId(tenantId);
    let calendar: PayrollCalendarDocument | null = null;
    const requestedPeriodStart = new Date(dto.periodStart);
    const requestedPeriodEnd = new Date(dto.periodEnd);

    if (dto.calendarId) {
      calendar = await this.calendarModel.findOne({
        _id: this.toObjectId(dto.calendarId),
        tenantId: tenantObjectId,
      });
      if (!calendar) {
        throw new BadRequestException(
          "Calendario no encontrado para el tenant.",
        );
      }
      if (["closed", "posted"].includes(calendar.status)) {
        throw new BadRequestException(
          "El período seleccionado ya está cerrado/publicado.",
        );
      }
      if (
        calendar.periodStart.getTime() !== requestedPeriodStart.getTime() ||
        calendar.periodEnd.getTime() !== requestedPeriodEnd.getTime()
      ) {
        throw new BadRequestException(
          "Las fechas del calendario no coinciden con el rango solicitado.",
        );
      }
    }

    const periodStart = calendar
      ? new Date(calendar.periodStart)
      : requestedPeriodStart;
    const periodEnd = calendar
      ? new Date(calendar.periodEnd)
      : requestedPeriodEnd;
    const employeeFilter: Record<string, any> = {
      tenantId: tenantObjectId,
    };
    if (dto.employeeIds?.length) {
      employeeFilter._id = {
        $in: dto.employeeIds.map((id) => this.toObjectId(id)),
      };
    }

    const [employees, concepts, contracts] = await Promise.all([
      this.profileModel.find(employeeFilter).lean<LeanEmployeeProfile[]>(),
      this.conceptModel
        .find({ tenantId: tenantObjectId, isActive: true })
        .lean<LeanPayrollConcept[]>(),
      this.contractModel
        .find({
          tenantId: tenantObjectId,
          status: { $in: ["active", "draft"] },
        })
        .lean<LeanEmployeeContract[]>(),
    ]);

    const customerIds = employees
      .map((employee) => employee.customerId)
      .filter(Boolean)
      .map((id) => id.toString());
    const customers = await this.customerModel
      .find({ _id: { $in: customerIds }, tenantId: tenantObjectId })
      .select(["name", "companyName"])
      .lean();
    const customerMap = new Map(
      customers.map((customer) => [customer._id.toString(), customer]),
    );

    if (!employees.length) {
      throw new BadRequestException(
        "No hay empleados para procesar en la nómina",
      );
    }

    const activeContractMap = new Map<string, LeanEmployeeContract>();
    contracts.forEach((contract) => {
      const key = contract.employeeId.toString();
      if (!activeContractMap.has(key)) {
        activeContractMap.set(key, contract);
      }
    });

    const conceptMap = new Map<string, LeanPayrollConcept>();
    const conceptById = new Map<string, LeanPayrollConcept>();
    concepts.forEach((concept) => {
      conceptMap.set(concept.code, concept);
      if (concept._id) {
        conceptById.set(concept._id.toString(), concept);
      }
    });

    const structures: LeanPayrollStructure[] = await this.structureModel
      .find({
        tenantId: tenantObjectId,
        isActive: true,
      })
      .lean<LeanPayrollStructure[]>();
    const structureObjectIds = structures.map((structure) => structure._id);
    const rules = structureObjectIds.length
      ? await this.ruleModel
          .find({
            structureId: { $in: structureObjectIds },
            tenantId: tenantObjectId,
            isActive: true,
          })
          .sort({ priority: 1 })
          .lean()
      : [];

    const structureMap = new Map<string, LeanPayrollStructure>();
    structures.forEach((structure) =>
      structureMap.set(structure._id.toString(), structure),
    );
    const rulesMap = new Map<string, PayrollRule[]>();
    rules.forEach((rule) => {
      const key = rule.structureId.toString();
      if (!rulesMap.has(key)) {
        rulesMap.set(key, []);
      }
      rulesMap.get(key)?.push(rule as any);
    });

    const computations = this.computeRunEntries(
      employees,
      activeContractMap,
      concepts,
      customerMap,
      structureMap,
      rulesMap,
      conceptById,
      structures,
    );

    const structureSummary = this.buildStructureSummary(
      computations.calculationMetadata,
      structureMap,
      employees.length,
    );

    const runPayload: Partial<PayrollRun> & {
      metadata: Record<string, any>;
    } = {
      tenantId: tenantObjectId,
      periodType: dto.periodType,
      periodStart,
      periodEnd,
      label:
        dto.label ||
        `Nómina ${format(new Date(dto.periodEnd), "MMMM yyyy")}`.toLowerCase(),
      status: "calculated" as const,
      totalEmployees: employees.length,
      grossPay: computations.grossPay,
      deductions: computations.deductions,
      employerCosts: computations.employerCosts,
      netPay: computations.grossPay - computations.deductions,
      entries: computations.entries,
      metadata: {
        dryRun: dto.dryRun ?? false,
        createdBy: userId,
        calculations: computations.calculationMetadata,
        structureSummary,
      },
    };

    if (calendar) {
      runPayload.calendarId = calendar._id;
      runPayload.metadata = {
        ...(runPayload.metadata || {}),
        calendarSnapshot: {
          calendarId: calendar._id.toString(),
          name: calendar.name,
          status: calendar.status,
          periodStart: calendar.periodStart,
          periodEnd: calendar.periodEnd,
          cutoffDate: calendar.cutoffDate,
          payDate: calendar.payDate,
        },
      };
    }

    const run = await this.runModel.create(runPayload);

    if (!dto.dryRun) {
      const journalEntryId = await this.postRunToAccounting(
        run,
        conceptMap,
        tenantId,
      );
      if (journalEntryId) {
        run.metadata = {
          ...(run.metadata || {}),
          journalEntryId,
        };
        await run.save();
      }
    }

    if (calendar) {
      await this.syncCalendarFromRun(
        tenantObjectId,
        calendar,
        run,
        structureSummary,
      );
    }

    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollRun",
      entityId: run._id,
      action: "create",
      after: run.toObject(),
    });

    return run;
  }

  async exportRun(
    tenantId: string,
    runId: string,
    dto: ExportPayrollRunDto,
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    const run = await this.getRun(tenantId, runId);
    const filenameBase = `${run.label || "payroll-run"}-${format(run.periodEnd, "yyyyMMdd")}`;

    if (dto.format === "csv") {
      const headers = ["Employee", "Department", "Concept", "Type", "Amount"];
      const rows = run.entries.map((entry) => [
        entry.employeeName || entry.employeeId?.toString() || "",
        entry.department || "",
        `${entry.conceptCode} - ${entry.conceptName || ""}`.trim(),
        entry.conceptType,
        entry.amount.toFixed(2),
      ]);
      const csv = [headers, ...rows]
        .map((row) =>
          row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      return {
        filename: `${filenameBase}.csv`,
        contentType: "text/csv",
        buffer: Buffer.from(csv, "utf8"),
      };
    }

    // PDF export
    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    doc.fontSize(18).text("Resumen de nómina", { align: "left" });
    doc
      .fontSize(12)
      .moveDown()
      .text(
        `Período: ${format(run.periodStart, "dd/MM/yyyy")} - ${format(run.periodEnd, "dd/MM/yyyy")}`,
      )
      .text(`Empleados: ${run.totalEmployees}`)
      .text(
        `Bruto: ${run.grossPay.toFixed(2)} | Deducciones: ${run.deductions.toFixed(2)} | Neta: ${run.netPay.toFixed(2)}`,
      )
      .moveDown();

    doc.fontSize(11).text("Detalle (primeros 50 registros):").moveDown(0.5);
    const sampleEntries = run.entries.slice(0, 50);
    sampleEntries.forEach((entry) => {
      doc
        .fontSize(10)
        .text(
          `${entry.employeeName || entry.employeeId?.toString() || "Empleado"} - ${entry.conceptCode}: ${entry.amount.toFixed(2)} (${entry.conceptType})`,
        );
    });

    if (run.entries.length > 50) {
      doc
        .moveDown()
        .fontSize(10)
        .text(`... ${run.entries.length - 50} registros adicionales omitidos.`);
    }

    doc.end();

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    return {
      filename: `${filenameBase}.pdf`,
      contentType: "application/pdf",
      buffer,
    };
  }

  async listAuditLogs(
    tenantId: string,
    options: { entity?: string; entityId?: string; limit?: number },
  ) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (options.entity) {
      query.entity = options.entity;
    }
    if (options.entityId) {
      query.entityId = this.toObjectId(options.entityId);
    }
    const limit = options.limit ?? 50;
    return this.auditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  private computeRunEntries(
    employees: LeanEmployeeProfile[],
    contracts: Map<string, LeanEmployeeContract>,
    concepts: LeanPayrollConcept[],
    customerMap: Map<string, Customer>,
    structureMap: Map<string, LeanPayrollStructure>,
    rulesMap: Map<string, PayrollRule[]>,
    conceptById: Map<string, LeanPayrollConcept>,
    allStructures: LeanPayrollStructure[],
  ): PayrollComputationResult {
    const entries: PayrollRun["entries"] = [];
    let grossPay = 0;
    let deductions = 0;
    let employerCosts = 0;
    const calculationMetadata: PayrollRunCalculationMetadata[] = [];
    const conceptByCode = new Map<string, LeanPayrollConcept>();
    concepts.forEach((concept) => {
      conceptByCode.set(concept.code, concept);
      if (concept._id && !conceptById.has(concept._id.toString())) {
        conceptById.set(concept._id.toString(), concept);
      }
    });

    employees.forEach((employee) => {
      const employeeId = employee._id.toString();
      const contract = contracts.get(employeeId);
      const baseAmount = contract?.compensationAmount || 0;
      if (baseAmount <= 0) {
        return;
      }

      const customer = customerMap.get(
        (employee as any).customerId?.toString?.() || "",
      );
      const employeeName =
        customer?.name ||
        customer?.companyName ||
        employee.position ||
        "Empleado";

      let structureId = contract?.payrollStructureId?.toString();
      let structure =
        structureId && structureMap.has(structureId)
          ? structureMap.get(structureId)
          : undefined;
      if (!structure) {
        const suggested = this.resolveStructureForEmployee(
          allStructures,
          employee,
          contract,
        );
        if (suggested) {
          structure = suggested;
          structureId = suggested._id.toString();
        }
      }
      const structureRules =
        structureId && rulesMap.has(structureId)
          ? rulesMap.get(structureId)
          : undefined;

      if (structure && structureRules?.length) {
        const preview = this.payrollEngine.previewStructure(
          structure,
          structureRules,
          {
            baseSalary: baseAmount,
            context: this.buildRuleContext(employee, contract, baseAmount),
          },
          {
            conceptMap: conceptById,
            captureLogs: true,
          },
        );
        const coveredConceptIds = new Set(
          preview.entries.map((entry) => entry.conceptId?.toString()),
        );
        preview.entries.forEach((entry) => {
          const concept =
            conceptById.get(entry.conceptId) ||
            conceptByCode.get(entry.conceptId);
          if (!concept) {
            return;
          }
          const normalizedAmount = Number(entry.amount) || 0;
          entries.push({
            employeeId: employee._id,
            contractId: contract?._id,
            employeeName,
            department: employee.department,
            conceptCode: concept.code,
            conceptName: concept.name,
            conceptType: entry.conceptType as any,
            amount: normalizedAmount,
            breakdown: {
              source: "structure",
              structureId: structure._id.toString(),
              structureVersion: structure.version,
              rulePriority: entry.priority,
              calculationType: entry.calculationType,
              baseAmount: entry.baseAmount,
              appliedPercentage: entry.appliedPercentage,
            },
          });
        });
        grossPay += preview.totals.earnings;
        deductions += preview.totals.deductions;
        employerCosts += preview.totals.employerCosts;
        const legacyAdjustments = this.applyLegacyConcepts({
          concepts,
          baseAmount,
          employee,
          contract,
          entries,
          coveredConceptIds,
          includeBaseEntry: false,
          employeeName,
        });
        grossPay += legacyAdjustments.grossPay;
        deductions += legacyAdjustments.deductions;
        employerCosts += legacyAdjustments.employerCosts;
        calculationMetadata.push({
          employeeId,
          contractId: contract?._id?.toString(),
          structureId: structure._id.toString(),
          structureVersion: structure.version,
          usedStructure: true,
          previewTotals: preview.totals,
          ruleLogs: (preview.logs || []).slice(0, 20),
        });
        return;
      }

      const legacyAdjustments = this.applyLegacyConcepts({
        concepts,
        baseAmount,
        employee,
        contract,
        entries,
        includeBaseEntry: true,
        employeeName,
      });

      grossPay += legacyAdjustments.grossPay;
      deductions += legacyAdjustments.deductions;
      employerCosts += legacyAdjustments.employerCosts;
      calculationMetadata.push({
        employeeId,
        contractId: contract?._id?.toString(),
        usedStructure: false,
      });
    });

    return {
      entries,
      grossPay,
      deductions,
      employerCosts,
      calculationMetadata,
    };
  }

  private resolveStructureForEmployee(
    structures: LeanPayrollStructure[],
    employee: LeanEmployeeProfile,
    contract?: LeanEmployeeContract,
  ): LeanPayrollStructure | null {
    let best: LeanPayrollStructure | null = null;
    let bestScore = -1;
    const filters = {
      role: employee.position,
      department: employee.department,
      contractType: contract?.contractType,
    };
    structures.forEach((structure) => {
      if (structure.isActive === false) {
        return;
      }
      const match = evaluateStructureMatch(structure, filters);
      if (!match) {
        return;
      }
      if (match.score > bestScore) {
        bestScore = match.score;
        best = structure;
      }
    });
    return best;
  }

  private buildStructureSummary(
    calculations: PayrollRunCalculationMetadata[],
    structureMap: Map<string, LeanPayrollStructure>,
    totalEmployees: number,
  ) {
    if (!Array.isArray(calculations) || calculations.length === 0) {
      return {
        totalEmployees,
        structuredEmployees: 0,
        legacyEmployees: totalEmployees,
        coveragePercent: 0,
        structures: [],
      };
    }
    const summaryMap = new Map<
      string,
      {
        structureId: string;
        structureVersion?: number;
        structureName?: string;
        periodType?: string;
        appliesToRoles: string[];
        appliesToDepartments: string[];
        appliesToContractTypes: string[];
        employees: number;
      }
    >();
    let legacyEmployees = 0;

    calculations.forEach((calculation) => {
      if (!calculation.structureId || calculation.usedStructure === false) {
        legacyEmployees += 1;
        return;
      }
      const key = `${calculation.structureId}:${
        calculation.structureVersion ?? "latest"
      }`;
      if (!summaryMap.has(key)) {
        const structure = structureMap.get(calculation.structureId);
        summaryMap.set(key, {
          structureId: calculation.structureId,
          structureVersion: calculation.structureVersion,
          structureName: structure?.name,
          periodType: structure?.periodType,
          appliesToRoles: structure?.appliesToRoles || [],
          appliesToDepartments: structure?.appliesToDepartments || [],
          appliesToContractTypes: structure?.appliesToContractTypes || [],
          employees: 0,
        });
      }
      const entry = summaryMap.get(key);
      if (entry) {
        entry.employees += 1;
      }
    });

    const structures = Array.from(summaryMap.values()).sort(
      (a, b) => b.employees - a.employees,
    );
    const structuredEmployees = structures.reduce(
      (acc, structure) => acc + structure.employees,
      0,
    );
    const coveragePercent =
      totalEmployees > 0
        ? Math.round((structuredEmployees / totalEmployees) * 100)
        : 0;

    return {
      totalEmployees,
      structuredEmployees,
      legacyEmployees: legacyEmployees,
      coveragePercent,
      structures,
    };
  }

  private applyLegacyConcepts(params: {
    concepts: LeanPayrollConcept[];
    baseAmount: number;
    employee: LeanEmployeeProfile;
    contract?: LeanEmployeeContract;
    entries: PayrollRun["entries"];
    coveredConceptIds?: Set<string | undefined>;
    includeBaseEntry: boolean;
    employeeName: string;
  }) {
    const {
      concepts,
      baseAmount,
      employee,
      contract,
      entries,
      coveredConceptIds,
      includeBaseEntry,
      employeeName,
    } = params;
    const deltas = {
      grossPay: 0,
      deductions: 0,
      employerCosts: 0,
    };

    if (includeBaseEntry) {
      const baseEntry = {
        employeeId: employee._id,
        contractId: contract?._id,
        employeeName,
        department: employee.department,
        conceptCode: "BASE_PAY",
        conceptName: "Salario base",
        conceptType: "earning" as const,
        amount: Number(baseAmount),
        breakdown: {
          source: "legacy",
        },
      };
      entries.push(baseEntry);
      deltas.grossPay += baseEntry.amount;
    }

    concepts.forEach((concept) => {
      const conceptId = concept._id?.toString();
      if (conceptId && coveredConceptIds?.has(conceptId)) {
        return;
      }
      const amount = this.calculateConceptAmount(
        concept,
        baseAmount,
        employee,
        contract,
      );
      if (!amount) return;

      entries.push({
        employeeId: employee._id,
        contractId: contract?._id,
        employeeName,
        department: employee.department,
        conceptCode: concept.code,
        conceptName: concept.name,
        conceptType: concept.conceptType,
        amount,
        breakdown: {
          source: "legacy",
        },
      });

      if (concept.conceptType === "earning") {
        deltas.grossPay += amount;
      } else if (concept.conceptType === "deduction") {
        deltas.deductions += amount;
      } else {
        deltas.employerCosts += amount;
      }
    });

    return deltas;
  }

  private buildRuleContext(
    employee: LeanEmployeeProfile,
    contract: LeanEmployeeContract | undefined,
    baseAmount: number,
  ) {
    const schedule = contract?.schedule || {};
    return {
      baseSalary: baseAmount,
      baseAmount,
      department: employee.department,
      position: employee.position,
      contractType: contract?.contractType,
      payFrequency: contract?.payFrequency,
      compensationType: contract?.compensationType,
      benefitsTotal: Array.isArray(contract?.benefits)
        ? contract!.benefits.reduce(
            (sum, benefit) => sum + (benefit.amount || 0),
            0,
          )
        : 0,
      deductionsTotal: Array.isArray(contract?.deductions)
        ? contract!.deductions.reduce(
            (sum, deduction) => sum + (deduction.amount || 0),
            0,
          )
        : 0,
      scheduleHours: schedule?.hoursPerWeek || 0,
    };
  }

  private async postRunToAccounting(
    run: PayrollRunDocument,
    conceptMap: Map<string, PayrollConcept>,
    tenantId: string,
  ) {
    const journalEntryId =
      await this.accountingService.createJournalEntryForPayrollRun({
        run,
        conceptMap,
        tenantId,
      });
    if (!journalEntryId) {
      return null;
    }

    await this.recordAudit({
      tenantId,
      entity: "payrollRun",
      entityId: run._id,
      action: "post_journal_entry",
      after: { journalEntryId },
    });

    return journalEntryId;
  }

  private calculateConceptAmount(
    concept: PayrollConcept,
    baseAmount: number,
    employee: LeanEmployeeProfile,
    contract?: LeanEmployeeContract,
  ): number {
    if (!concept.calculation) return 0;
    const method = concept.calculation.method;
    if (method === "fixed_amount") {
      return Math.max(concept.calculation.value ?? 0, 0);
    }

    if (method === "percentage_of_base") {
      const percentage = concept.calculation.value ?? 0;
      return (baseAmount * percentage) / 100;
    }

    // custom_formula placeholder
    if (method === "custom_formula" && concept.calculation.formula) {
      const scoped = {
        base: baseAmount,
        compensationType: contract?.compensationType,
        hoursPerWeek: contract?.schedule?.hoursPerWeek || 0,
      };
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("context", concept.calculation.formula) as (
          context: Record<string, any>,
        ) => number;
        const result = fn(scoped);
        if (Number.isFinite(result)) {
          return Number(result);
        }
      } catch {
        // Ignore invalid formulas – logged via audit
      }
    }

    return 0;
  }

  private async recordAudit(params: {
    tenantId: string;
    userId?: string;
    entity: string;
    entityId?: Types.ObjectId;
    action: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
  }) {
    await this.auditLogModel.create({
      tenantId: this.toObjectId(params.tenantId),
      userId: params.userId ? this.toObjectId(params.userId) : undefined,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      before: params.before,
      after: params.after,
    });
  }
}
