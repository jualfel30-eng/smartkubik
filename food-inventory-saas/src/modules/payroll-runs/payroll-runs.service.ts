import {
  BadRequestException,
  Injectable,
  Logger,
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
  PayrollRunStatus,
} from "../../schemas/payroll-run.schema";
import {
  SpecialPayrollRun,
  SpecialPayrollRunDocument,
  SpecialPayrollRunType,
} from "../../schemas/special-payroll-run.schema";
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
import { CustomerDocument } from "../../schemas/customer.schema";
import { CreatePayrollConceptDto } from "./dto/create-payroll-concept.dto";
import { UpdatePayrollConceptDto } from "./dto/update-payroll-concept.dto";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { PayrollRunFiltersDto } from "./dto/payroll-run-filters.dto";
import { ExportPayrollRunDto } from "./dto/export-payroll-run.dto";
import { PayrollConceptFiltersDto } from "./dto/payroll-concept-filters.dto";
import { format } from "date-fns";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require("pdfkit");
import { AccountingService } from "../accounting/accounting.service";
import { PayrollEngineService } from "../payroll-structures/payroll.engine.service";
import { evaluateStructureMatch } from "../payroll-structures/utils/structure-matcher.util";
import {
  PayablesService,
  CreatePayableDto,
} from "../payables/payables.service";
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from "../../schemas/chart-of-accounts.schema";
import { AddPayrollAdjustmentDto } from "./dto/add-payroll-adjustment.dto";
import { PaymentsService } from "../payments/payments.service";
import { CreatePaymentDto } from "../../dto/payment.dto";
import { PayPayrollRunDto } from "./dto/pay-payroll-run.dto";
import { NotificationsService } from "../notifications/notifications.service";
import {
  BankAccount,
  BankAccountDocument,
} from "../../schemas/bank-account.schema";
import { MailService } from "../mail/mail.service";
import { RemapPayrollAccountsDto } from "./dto/remap-payroll-accounts.dto";
import { CreateSpecialPayrollRunDto } from "./dto/create-special-payroll-run.dto";
import { SpecialPayrollRunFiltersDto } from "./dto/special-payroll-run-filters.dto";
import { PayrollWebhooksService } from "../payroll-webhooks/payroll-webhooks.service";
import { TipsService } from "../tips/tips.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CommissionService } from "../commissions/services/commission.service";
import { BonusService } from "../commissions/services/bonus.service";

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

type PayrollLineSnapshot = NonNullable<PayrollRun["lines"]>[number];
type PayrollEvidence = NonNullable<PayrollLineSnapshot["evidences"]>[number];

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
  private readonly logger = new Logger(PayrollRunsService.name);

  constructor(
    @InjectModel(PayrollConcept.name)
    private readonly conceptModel: Model<PayrollConceptDocument>,
    @InjectModel(PayrollRun.name)
    private readonly runModel: Model<PayrollRunDocument>,
    @InjectModel(SpecialPayrollRun.name)
    private readonly specialRunModel: Model<SpecialPayrollRunDocument>,
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
    @InjectModel("Customer")
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(PayrollCalendar.name)
    private readonly calendarModel: Model<PayrollCalendarDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(ChartOfAccounts.name)
    private readonly chartModel: Model<ChartOfAccountsDocument>,
    @InjectModel(BankAccount.name)
    private readonly bankAccountModel: Model<BankAccountDocument>,
    private readonly payablesService: PayablesService,
    private readonly paymentsService: PaymentsService,
    private readonly accountingService: AccountingService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly payrollEngine: PayrollEngineService,
    private readonly webhooksService: PayrollWebhooksService,
    private readonly tipsService: TipsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly commissionService: CommissionService,
    private readonly bonusService: BonusService,
  ) { }

  private toObjectId(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) return id;
    return new Types.ObjectId(id);
  }

  async updateRunStatus(
    tenantId: string,
    runId: string,
    nextStatus: PayrollRunStatus,
    userId?: string,
  ) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) {
      throw new NotFoundException("Nómina no encontrada");
    }
    const allowed: Record<PayrollRunStatus, PayrollRunStatus[]> = {
      draft: ["calculating", "calculated", "approved"],
      calculating: ["calculated"],
      calculated: ["approved"],
      approved: ["paid"],
      posted: ["paid"],
      paid: [],
    };
    const current = run.status as PayrollRunStatus;
    if (!(allowed[current] || []).includes(nextStatus)) {
      throw new BadRequestException(
        `No se puede pasar de ${current} a ${nextStatus}`,
      );
    }
    if (nextStatus === "approved") {
      await this.approveRunInternal(run, tenantId, userId);
      await this.webhooksService.dispatchEvent(
        tenantId,
        "payroll.run.approved",
        {
          runId: run._id.toString(),
          label: run.label,
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          totals: {
            grossPay: run.grossPay,
            deductions: run.deductions,
            employerCosts: run.employerCosts,
            netPay: run.netPay,
          },
          employees: run.totalEmployees,
          status: "approved",
        },
      );

      // Emit event for notification center - payroll pending payment
      this.eventEmitter.emit("payroll.run.pending", {
        runId: run._id.toString(),
        label: run.label,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        totalEmployees: run.totalEmployees,
        netPay: run.netPay,
        currency: (run as any).currency,
        tenantId,
      });
    } else if (nextStatus === "paid") {
      const before = { status: current };
      run.status = "paid";
      run.metadata = {
        ...(run.metadata || {}),
        paidBy: userId,
        paidAt: new Date(),
      };
      await run.save();
      await this.recordAudit({
        tenantId,
        userId,
        entity: "payrollRun",
        entityId: run._id,
        action: "statusChange",
        before,
        after: { status: "paid" },
      });
      await this.webhooksService.dispatchEvent(tenantId, "payroll.run.paid", {
        runId: run._id.toString(),
        label: run.label,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        totals: {
          grossPay: run.grossPay,
          deductions: run.deductions,
          employerCosts: run.employerCosts,
          netPay: run.netPay,
        },
        employees: run.totalEmployees,
        status: "paid",
      });

      // Emit event for notification center - payroll completed
      this.eventEmitter.emit("payroll.run.completed", {
        runId: run._id.toString(),
        label: run.label,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        totalEmployees: run.totalEmployees,
        netPay: run.netPay,
        currency: (run as any).currency,
        tenantId,
      });
    } else {
      run.status = nextStatus;
      await run.save();
      await this.recordAudit({
        tenantId,
        userId,
        entity: "payrollRun",
        entityId: run._id,
        action: "statusChange",
        before: { status: current },
        after: { status: nextStatus },
      });
    }
    return run.toObject();
  }

  async payRun(
    tenantId: string,
    runId: string,
    dto: PayPayrollRunDto,
    userId?: string,
  ) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) {
      throw new NotFoundException("Nómina no encontrada");
    }
    if (run.status !== "approved") {
      throw new BadRequestException("Solo se pueden pagar nóminas aprobadas.");
    }
    const payablesMeta = (run.metadata as any)?.payables;
    if (!Array.isArray(payablesMeta) || payablesMeta.length === 0) {
      throw new BadRequestException(
        "No hay payables generados para esta nómina. Aprueba antes de pagar.",
      );
    }
    const paymentsMeta: any[] = [];
    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();
    const applyIgtf = Boolean(dto.applyIgtf);
    const igtfRate = dto.igtfRate ?? 0.03;

    for (const payable of payablesMeta) {
      if (!payable.payableId) {
        continue;
      }
      const baseAmount = payable.netPay || run.netPay || 0;
      const igtfAmount =
        applyIgtf && dto.currency === "USD"
          ? parseFloat((baseAmount * igtfRate).toFixed(2))
          : 0;
      const totalAmount = baseAmount + igtfAmount;
      const paymentDto: CreatePaymentDto = {
        paymentType: "payable",
        payableId: payable.payableId,
        date: paymentDate.toISOString(),
        amount: totalAmount,
        amountVes: dto.currency === "VES" ? totalAmount : undefined,
        exchangeRate: dto.exchangeRate as any,
        method: dto.method,
        currency: dto.currency,
        reference: dto.reference,
        bankAccountId: dto.bankAccountId,
      };
      const payment = await this.paymentsService.create(paymentDto, {
        tenantId,
        id: userId || "SYSTEM",
      });

      paymentsMeta.push({
        paymentId: (payment as any)?._id?.toString?.(),
        payableId: payable.payableId,
        amount: payment.amount,
        igtf: igtfAmount,
        method: payment.method,
        currency: payment.currency,
        bankAccountId: dto.bankAccountId,
      });
    }

    if (!paymentsMeta.length) {
      throw new BadRequestException(
        "No se pudieron registrar pagos para esta nómina.",
      );
    }

    const before = { status: run.status };
    run.status = "paid";
    run.metadata = {
      ...(run.metadata || {}),
      payments: paymentsMeta,
      paidBy: userId,
      paidAt: paymentDate,
    };
    await run.save();

    // Marcar comisiones y bonos como pagados
    await this.markCommissionsAndBonusesAsPaid(run, tenantId);

    await this.notifyPayrollPayment(run, paymentsMeta, tenantId);

    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollRun",
      entityId: run._id,
      action: "statusChange",
      before,
      after: { status: run.status, payments: paymentsMeta },
    });

    return run.toObject();
  }

  /**
   * Marcar comisiones y bonos incluidos en la nómina como pagados
   */
  private async markCommissionsAndBonusesAsPaid(
    run: PayrollRunDocument,
    tenantId: string,
  ): Promise<void> {
    const runId = run._id.toString();

    // Obtener IDs de empleados en la nómina
    const employeeIds = (run.lines || [])
      .map((line) => line.employeeId?.toString())
      .filter(Boolean) as string[];

    if (employeeIds.length === 0) return;

    // Buscar comisiones aprobadas para estos empleados en el período
    const periodStart = run.periodStart;
    const periodEnd = run.periodEnd;

    // Marcar comisiones como pagadas
    let totalCommissionsMarked = 0;
    for (const employeeId of employeeIds) {
      try {
        const result = await this.commissionService.getApprovedCommissions(
          employeeId,
          periodStart,
          periodEnd,
          tenantId,
        );

        if (result.recordIds.length > 0) {
          const markedCount = await this.commissionService.markAsPaid(
            result.recordIds,
            runId,
            tenantId,
          );
          totalCommissionsMarked += markedCount;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to mark commissions as paid for employee ${employeeId}: ${error.message}`,
        );
      }
    }

    // Marcar bonos como pagados
    let totalBonusesMarked = 0;
    for (const employeeId of employeeIds) {
      try {
        const result = await this.bonusService.getApprovedBonuses(
          employeeId,
          periodStart,
          periodEnd,
          tenantId,
        );

        if (result.bonusIds.length > 0) {
          const periodLabel = run.label || `${run.periodStart?.toISOString()} - ${run.periodEnd?.toISOString()}`;
          const markedCount = await this.bonusService.markAsPaid(
            result.bonusIds,
            runId,
            periodLabel,
            tenantId,
          );
          totalBonusesMarked += markedCount;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to mark bonuses as paid for employee ${employeeId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Marked ${totalCommissionsMarked} commissions and ${totalBonusesMarked} bonuses as paid for payroll run ${runId}`,
    );
  }

  private async notifyPayrollPayment(
    run: PayrollRunDocument,
    paymentsMeta: any[],
    tenantId: string,
  ) {
    try {
      const tenant = await this.tenantModel
        .findById(this.toObjectId(tenantId))
        .lean<Tenant & { payroll?: Record<string, any> }>();
      const notificationEmails = (tenant as any)?.payroll?.notificationEmails;
      const recipients = Array.isArray(notificationEmails)
        ? notificationEmails
        : notificationEmails
          ? [notificationEmails]
          : [];

      const employeeIds = paymentsMeta
        .map((p) => p.employeeId)
        .filter(Boolean)
        .map((id: any) => id.toString());
      let employeeEmails: string[] = [];
      if (employeeIds.length) {
        const profiles = await this.profileModel
          .find({ _id: { $in: employeeIds.map((id) => this.toObjectId(id)) } })
          .lean();
        const customerIds = profiles
          .map((p) => p.customerId?.toString?.())
          .filter(Boolean);
        if (customerIds.length) {
          const customers = await this.customerModel
            .find({ _id: { $in: customerIds } })
            .lean();
          employeeEmails = customers
            .map((c) => {
              const emailContact = (c.contacts || []).find(
                (contact) =>
                  contact.type === "email" && contact.isActive !== false,
              );
              return emailContact?.value;
            })
            .filter(Boolean) as string[];
        }
      }

      const allRecipients = [...new Set([...recipients, ...employeeEmails])];
      if (!allRecipients.length) {
        return;
      }

      const subject = `Nómina pagada: ${run.label || run._id.toString()}`;
      const html = `
        <h3>Nómina pagada</h3>
        <p>Período: ${run.periodStart.toISOString().slice(0, 10)} - ${run.periodEnd
          .toISOString()
          .slice(0, 10)}</p>
        <p>Empleados: ${run.totalEmployees || 0}</p>
        <p>Neto total: ${run.netPay || 0}</p>
        <p>Pagos registrados: ${paymentsMeta.length}</p>
      `;

      const payslips =
        allRecipients.length && run?._id
          ? await this.exportPayslips(tenantId, run._id.toString())
          : null;

      for (const email of allRecipients) {
        await this.mailService.sendTemplatedEmail({
          to: email,
          subject,
          html,
          attachments: payslips
            ? [
              {
                filename: payslips.filename,
                content: payslips.buffer,
              },
            ]
            : undefined,
        });
      }
    } catch (error) {
      // no detener el flujo principal
      // eslint-disable-next-line no-console
      console.warn("No se pudo enviar notificación de pago de nómina", error);
    }
  }

  async recalculateRun(tenantId: string, runId: string, userId?: string) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) {
      throw new NotFoundException("Nómina no encontrada");
    }
    if (["approved", "paid"].includes(run.status as PayrollRunStatus)) {
      throw new BadRequestException(
        "No se puede recalcular una nómina aprobada o pagada",
      );
    }
    // deja status en calculating y limpia entries/lines previas para recalcular sobre el mismo doc
    run.status = "calculating";
    run.entries = [];
    (run as any).lines = [];
    await run.save();
    const updated = await this.createRun(
      tenantId,
      {
        periodType: run.periodType,
        periodStart: run.periodStart.toISOString(),
        periodEnd: run.periodEnd.toISOString(),
        label: run.label,
        employeeIds: (run as any).employeeIds,
        calendarId: run.calendarId?.toString(),
        dryRun: run.metadata?.dryRun || false,
      } as any,
      userId,
      run._id.toString(),
    );
    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollRun",
      entityId: run._id,
      action: "recalculate",
      after: updated || run.toObject(),
    });
    return updated;
  }

  async addAdjustment(
    tenantId: string,
    runId: string,
    dto: AddPayrollAdjustmentDto,
    userId?: string,
  ) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) {
      throw new NotFoundException("Nómina no encontrada");
    }
    if (["approved", "paid"].includes(run.status as PayrollRunStatus)) {
      throw new BadRequestException(
        "No se pueden agregar ajustes a una nómina aprobada o pagada",
      );
    }

    const signedAmount =
      dto.conceptType === "deduction"
        ? -Math.abs(dto.amount)
        : Math.abs(dto.amount);

    // Actualiza entries para mantener compatibilidad
    run.entries = run.entries || [];
    run.entries.push({
      employeeId: dto.employeeId ? this.toObjectId(dto.employeeId) : undefined,
      contractId: dto.contractId ? this.toObjectId(dto.contractId) : undefined,
      employeeName: dto.employeeName,
      conceptCode: dto.conceptCode,
      conceptName: dto.conceptName,
      conceptType: dto.conceptType,
      amount: signedAmount,
      breakdown: { manual: true, description: dto.description },
    } as any);

    // Calcula totales
    if (dto.conceptType === "earning") {
      run.grossPay = (run.grossPay || 0) + Math.abs(dto.amount);
    } else if (dto.conceptType === "deduction") {
      run.deductions = (run.deductions || 0) + Math.abs(dto.amount);
    } else {
      run.employerCosts = (run.employerCosts || 0) + Math.abs(dto.amount);
    }
    run.netPay = (run.grossPay || 0) - (run.deductions || 0);

    // Guarda en lines para trazabilidad granular
    run.lines = (run as any).lines || [];
    (run as any).lines.push({
      employeeId: dto.employeeId ? this.toObjectId(dto.employeeId) : undefined,
      contractId: dto.contractId ? this.toObjectId(dto.contractId) : undefined,
      structureId: undefined,
      structureVersion: undefined,
      employeeName: dto.employeeName,
      earnings:
        dto.conceptType === "earning"
          ? [{ ...dto, debitAccountId: dto.accountId }]
          : [],
      deductions:
        dto.conceptType === "deduction"
          ? [{ ...dto, debitAccountId: dto.accountId }]
          : [],
      employerCosts:
        dto.conceptType === "employer"
          ? [{ ...dto, debitAccountId: dto.accountId }]
          : [],
      grossPay: dto.conceptType === "earning" ? dto.amount : 0,
      deductionsTotal: dto.conceptType === "deduction" ? dto.amount : 0,
      employerCostsTotal: dto.conceptType === "employer" ? dto.amount : 0,
      netPay:
        dto.conceptType === "earning"
          ? dto.amount
          : dto.conceptType === "deduction"
            ? -dto.amount
            : 0,
      manual: true,
      calculationLog: { description: dto.description },
    });

    await run.save();
    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollRun",
      entityId: run._id,
      action: "add_adjustment",
      after: {
        conceptCode: dto.conceptCode,
        conceptType: dto.conceptType,
        amount: dto.amount,
      },
    });
    return run.toObject();
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

  async createRun(
    tenantId: string,
    dto: CreatePayrollRunDto,
    userId?: string,
    reuseRunId?: string,
  ) {
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

    const [employees, concepts, contracts, tenantSettings] = await Promise.all([
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
      this.tenantModel
        .findById(tenantObjectId)
        .select(["payroll.payablesMode"])
        .lean<Tenant & { _id: Types.ObjectId }>(),
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

    // Obtener propinas del período para cada empleado
    const employeeTipsMap = new Map<string, number>();
    try {
      const tipsReport = await this.tipsService.getConsolidatedReport(
        periodStart,
        periodEnd,
        tenantId,
      );

      // Mapear propinas por employeeId
      if (tipsReport.byEmployee && Array.isArray(tipsReport.byEmployee)) {
        tipsReport.byEmployee.forEach((empTips: any) => {
          if (empTips.employeeId && empTips.totalTips > 0) {
            employeeTipsMap.set(empTips.employeeId, empTips.totalTips);
          }
        });
      }

      this.logger.log(
        `Loaded tips for ${employeeTipsMap.size} employees in payroll period`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load tips for payroll period: ${error.message}`,
      );
      // Continuar sin propinas si hay error
    }

    // Obtener comisiones aprobadas del período para cada empleado
    const employeeCommissionsMap = new Map<string, number>();
    try {
      const commissionsReport =
        await this.commissionService.getAllApprovedCommissionsForPayroll(
          periodStart,
          periodEnd,
          tenantId,
        );

      // Mapear comisiones por employeeId
      if (commissionsReport && Array.isArray(commissionsReport)) {
        commissionsReport.forEach((empComm: any) => {
          if (empComm.employeeId && empComm.totalCommissions > 0) {
            employeeCommissionsMap.set(
              empComm.employeeId,
              empComm.totalCommissions,
            );
          }
        });
      }

      this.logger.log(
        `Loaded commissions for ${employeeCommissionsMap.size} employees in payroll period`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load commissions for payroll period: ${error.message}`,
      );
      // Continuar sin comisiones si hay error
    }

    // Obtener bonos aprobados del período para cada empleado
    const employeeBonusesMap = new Map<string, number>();
    try {
      const bonusesReport =
        await this.bonusService.getAllApprovedBonusesForPayroll(
          periodStart,
          periodEnd,
          tenantId,
        );

      // Mapear bonos por employeeId
      if (bonusesReport && Array.isArray(bonusesReport)) {
        bonusesReport.forEach((empBonus: any) => {
          if (empBonus.employeeId && empBonus.totalBonuses > 0) {
            employeeBonusesMap.set(empBonus.employeeId, empBonus.totalBonuses);
          }
        });
      }

      this.logger.log(
        `Loaded bonuses for ${employeeBonusesMap.size} employees in payroll period`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load bonuses for payroll period: ${error.message}`,
      );
      // Continuar sin bonos si hay error
    }

    const computations = this.computeRunEntries(
      employees,
      activeContractMap,
      concepts,
      customerMap,
      structureMap,
      rulesMap,
      conceptById,
      structures,
      employeeTipsMap,
      employeeCommissionsMap,
      employeeBonusesMap,
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
      lines: this.buildPayrollLines(
        computations.entries,
        conceptMap,
        computations.calculationMetadata,
      ),
      metadata: {
        dryRun: dto.dryRun ?? false,
        createdBy: userId,
        calculations: computations.calculationMetadata,
        structureSummary,
        payablesMode:
          (tenantSettings as any)?.payroll?.payablesMode || "aggregated",
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

    const run = reuseRunId
      ? await this.runModel.findOneAndUpdate(
        { _id: this.toObjectId(reuseRunId) },
        { $set: runPayload },
        { new: true },
      )
      : await this.runModel.create(runPayload);

    if (!run) {
      throw new BadRequestException("No se pudo crear/actualizar la nómina");
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

  async exportBankFile(
    tenantId: string,
    runId: string,
    bank: string,
    format: string,
    bankAccountId?: string,
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    const run = await this.getRun(tenantId, runId);
    const payables = (run.metadata as any)?.payables || [];
    if (!Array.isArray(payables) || !payables.length) {
      throw new BadRequestException(
        "No hay payables asociados a esta nómina (aprueba antes de exportar).",
      );
    }
    let bankAccount: BankAccountDocument | null = null;
    if (bankAccountId) {
      bankAccount = await this.bankAccountModel.findOne({
        _id: this.toObjectId(bankAccountId),
        tenantId: this.toObjectId(tenantId),
      });
    }
    const bankName = (bankAccount?.bankName || bank || "generic")
      .toString()
      .toLowerCase();
    const acceptedMethods = Array.isArray(bankAccount?.acceptedPaymentMethods)
      ? bankAccount?.acceptedPaymentMethods
      : [];
    const rows = payables.map((p: any) => ({
      employeeId: p.employeeId || "",
      employeeName: p.employeeName || p.payeeName || "",
      payableId: p.payableId || "",
      amount: p.netPay ?? p.amount ?? run.netPay ?? 0,
      reference: run.label || `Payroll ${runId}`,
    }));

    const filenameBase = `payroll-bank-${bankName}-${runId}`;
    if (format === "txt") {
      const lines = rows.map((r) => {
        switch (bankName) {
          case "banesco":
            return `${r.employeeId};${r.employeeName};${r.amount.toFixed(2)};${r.reference}`;
          case "provincial":
            return `${r.employeeId}|${r.employeeName}|${bankAccount?.accountNumber || ""}|${r.amount.toFixed(2)}|${r.reference}`;
          case "mercantil":
            return `${r.employeeName}|${r.employeeId}|${r.amount.toFixed(2)}|${bankAccount?.accountNumber || ""}|${r.reference}`;
          case "bod":
            return `${r.employeeId},${r.employeeName},${r.amount.toFixed(2)},${bankAccount?.accountNumber || ""},${r.reference}`;
          case "banco-venezuela":
            return `${r.employeeId};${r.employeeName};${r.amount.toFixed(2)};${bankAccount?.accountNumber || ""};${acceptedMethods[0] || ""};${r.reference}`;
          case "bancaribe":
            return `${r.employeeName}|${r.employeeId}|${r.amount.toFixed(2)}|${bankAccount?.accountNumber || ""}|${r.reference}`;
          case "banplus":
            return `${r.employeeId};${r.employeeName};${r.amount.toFixed(2)};${bankAccount?.accountNumber || ""};${r.reference}`;
          default:
            return `${r.employeeId}|${r.employeeName}|${r.payableId}|${r.amount.toFixed(2)}|${r.reference}`;
        }
      });
      return {
        filename: `${filenameBase}.txt`,
        contentType: "text/plain",
        buffer: Buffer.from(lines.join("\n"), "utf8"),
      };
    }

    const headers = [
      "employeeId",
      "employeeName",
      "payableId",
      "amount",
      "reference",
    ];
    const csvRows = rows.map((r) => {
      switch (bankName) {
        case "banesco":
          return [
            r.employeeId,
            r.employeeName,
            r.payableId,
            r.amount.toFixed(2),
            r.reference,
          ].join(";");
        case "provincial":
          return [
            r.employeeId,
            r.employeeName,
            r.amount.toFixed(2),
            bankAccount?.accountNumber || "",
            r.reference,
          ].join(",");
        case "mercantil":
          return [
            r.employeeName,
            r.employeeId,
            bankAccount?.accountNumber || "",
            (acceptedMethods[0] || "").toString(),
            r.amount.toFixed(2),
            r.reference,
          ].join(",");
        case "bod":
          return [
            r.employeeId,
            r.employeeName,
            r.amount.toFixed(2),
            bankAccount?.accountNumber || "",
            r.reference,
          ].join(",");
        case "banco-venezuela":
          return [
            r.employeeId,
            r.employeeName,
            r.amount.toFixed(2),
            bankAccount?.accountNumber || "",
            acceptedMethods[0] || "",
            r.reference,
          ].join(";");
        case "bancaribe":
          return [
            r.employeeName,
            r.employeeId,
            bankAccount?.accountNumber || "",
            r.amount.toFixed(2),
            r.reference,
          ].join(",");
        case "banplus":
          return [
            r.employeeId,
            r.employeeName,
            r.amount.toFixed(2),
            bankAccount?.accountNumber || "",
            r.reference,
          ].join(";");
        default:
          return [
            r.employeeId,
            `"${(r.employeeName || "").replace(/"/g, '""')}"`,
            r.payableId,
            r.amount,
            `"${(r.reference || "").replace(/"/g, '""')}"`,
          ].join(",");
      }
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    return {
      filename: `${filenameBase}.csv`,
      contentType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    };
  }

  async previewAccounting(
    tenantId: string,
    runId: string,
  ): Promise<{
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
    }>;
    totals: { debit: number; credit: number; difference: number };
  }> {
    const run = await this.getRun(tenantId, runId);
    if (!run) {
      throw new NotFoundException("Nómina no encontrada");
    }

    await this.ensureConceptAccounts(run.entries, this.toObjectId(tenantId));

    const conceptCodes = Array.from(
      new Set(run.entries.map((e) => e.conceptCode).filter(Boolean)),
    );
    const conceptDocs = conceptCodes.length
      ? await this.conceptModel
        .find({
          tenantId: this.toObjectId(tenantId),
          code: { $in: conceptCodes },
        })
        .lean<LeanPayrollConcept[]>()
      : [];
    const conceptMap = new Map(conceptDocs.map((c) => [c.code, c]));

    const grouped = new Map<
      string,
      {
        accountId: string;
        debit: number;
        credit: number;
      }
    >();

    for (const entry of run.entries) {
      const amount = Math.abs(Number(entry.amount) || 0);
      const concept = conceptMap.get(entry.conceptCode);
      const debitAccountId = (concept as any)?.debitAccountId;
      const creditAccountId = (concept as any)?.creditAccountId;
      if (!debitAccountId || !creditAccountId) {
        continue;
      }

      const debitKey = `${debitAccountId}:debit`;
      const creditKey = `${creditAccountId}:credit`;

      if (!grouped.has(debitKey)) {
        grouped.set(debitKey, {
          accountId: debitAccountId,
          debit: 0,
          credit: 0,
        });
      }
      grouped.get(debitKey)!.debit += amount;

      if (!grouped.has(creditKey)) {
        grouped.set(creditKey, {
          accountId: creditAccountId,
          debit: 0,
          credit: 0,
        });
      }
      grouped.get(creditKey)!.credit += amount;
    }

    let debitTotal = 0;
    let creditTotal = 0;
    const lines = Array.from(grouped.values()).map((line) => {
      debitTotal += line.debit;
      creditTotal += line.credit;
      return line;
    });

    return {
      lines,
      totals: {
        debit: debitTotal,
        credit: creditTotal,
        difference: debitTotal - creditTotal,
      },
    };
  }

  async remapConceptAccounts(
    tenantId: string,
    dto: RemapPayrollAccountsDto,
    userId?: string,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const conceptDocs = await this.conceptModel
      .find({ tenantId: tenantObjectId })
      .lean<LeanPayrollConcept[]>();

    const earningsCodes = dto.earningsCodes?.map((c) => c.toUpperCase()) || [];
    const bonusCodes = dto.bonusCodes?.map((c) => c.toUpperCase()) || [];
    const severanceCodes =
      dto.severanceCodes?.map((c) => c.toUpperCase()) || [];

    const updates: Array<Promise<any>> = [];
    conceptDocs.forEach((concept) => {
      const code = concept.code?.toUpperCase();
      if (!code) return;
      let debit: string | undefined;
      let credit: string | undefined;

      if (concept.conceptType === "earning") {
        if (bonusCodes.includes(code)) {
          debit = dto.bonusDebit || "5207";
          credit = dto.bonusCredit || "2103";
        } else if (severanceCodes.includes(code)) {
          debit = dto.severanceDebit || "5205";
          credit = dto.severanceCredit || "2104";
        } else if (earningsCodes.length === 0 || earningsCodes.includes(code)) {
          debit = dto.earningsDebit || "5201";
          credit = dto.earningsCredit || "2103";
        }
      } else if (concept.conceptType === "deduction") {
        debit = dto.deductionsDebit || "2103";
        credit = dto.deductionsCredit || "2102";
      } else if (concept.conceptType === "employer") {
        debit = dto.employerDebit || "5206";
        credit = dto.employerCredit || "2105";
      }

      if (debit || credit) {
        updates.push(
          this.conceptModel.updateOne(
            { _id: concept._id },
            {
              $set: {
                debitAccountId: debit || concept.debitAccountId,
                creditAccountId: credit || concept.creditAccountId,
              },
            },
          ),
        );
      }
    });

    await Promise.all(updates);
    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollConcept",
      action: "remapAccounts",
      after: dto,
    });
    return { updated: updates.length };
  }

  async exportPayslips(
    tenantId: string,
    runId: string,
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    const run = await this.getRun(tenantId, runId);
    const filenameBase = `${run.label || "payroll-run"}-${format(run.periodEnd, "yyyyMMdd")}-payslips`;
    const doc = new PDFDocument({
      margin: 36,
      size: "A4",
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const lines =
      (run.lines && run.lines.length
        ? run.lines
        : this.buildPayrollLines(run.entries || [], new Map(), [])) || [];
    lines.forEach((line, idx) => {
      if (idx > 0) {
        doc.addPage();
      }
      doc
        .fontSize(16)
        .text(line.employeeName || "Empleado", { align: "left" })
        .moveDown(0.25)
        .fontSize(11)
        .text(
          `Período: ${format(run.periodStart, "dd/MM/yyyy")} - ${format(run.periodEnd, "dd/MM/yyyy")}`,
        )
        .text(`Departamento: ${line.department || "-"}`)
        .text(
          `Estructura: ${line.structureId || "-"} v${line.structureVersion || ""}`,
        )
        .moveDown();

      const earningsTotal = line.grossPay || 0;
      const dedTotal = line.deductionsTotal || 0;
      const employerTotal = line.employerCostsTotal || 0;
      const net = line.netPay ?? earningsTotal - dedTotal - employerTotal;

      doc.fontSize(12).text("Earnings", { underline: true });
      (line.earnings || []).forEach((earning) => {
        doc
          .fontSize(10)
          .text(
            `${earning.conceptCode} - ${earning.conceptName || ""}: ${earning.amount.toFixed(2)}`,
          );
      });
      if (!line.earnings?.length) {
        doc.fontSize(10).text("Sin devengos");
      }

      doc.moveDown().fontSize(12).text("Deductions", { underline: true });
      (line.deductions || []).forEach((ded) => {
        doc
          .fontSize(10)
          .text(
            `${ded.conceptCode} - ${ded.conceptName || ""}: ${ded.amount.toFixed(2)}`,
          );
      });
      if (!line.deductions?.length) {
        doc.fontSize(10).text("Sin deducciones");
      }

      doc.moveDown().fontSize(12).text("Employer Costs", { underline: true });
      (line.employerCosts || []).forEach((emp) => {
        doc
          .fontSize(10)
          .text(
            `${emp.conceptCode} - ${emp.conceptName || ""}: ${emp.amount.toFixed(2)}`,
          );
      });
      if (!line.employerCosts?.length) {
        doc.fontSize(10).text("Sin aportes patronales");
      }

      doc
        .moveDown()
        .fontSize(12)
        .text(
          `Bruto: ${earningsTotal.toFixed(2)} | Deducciones: ${dedTotal.toFixed(2)} | Patronal: ${employerTotal.toFixed(2)} | Neto: ${net.toFixed(2)}`,
          { align: "left" },
        );
    });

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
    customerMap: Map<string, any>,
    structureMap: Map<string, LeanPayrollStructure>,
    rulesMap: Map<string, PayrollRule[]>,
    conceptById: Map<string, LeanPayrollConcept>,
    allStructures: LeanPayrollStructure[],
    employeeTipsMap: Map<string, number>,
    employeeCommissionsMap: Map<string, number> = new Map(),
    employeeBonusesMap: Map<string, number> = new Map(),
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

    // Incluir propinas del período como earnings
    employees.forEach((employee) => {
      const employeeId = employee._id.toString();
      const tipsAmount = employeeTipsMap.get(employeeId);

      if (tipsAmount && tipsAmount > 0) {
        const contract = contracts.get(employeeId);
        const customer = customerMap.get(
          (employee as any).customerId?.toString?.() || "",
        );
        const employeeName =
          customer?.name ||
          customer?.companyName ||
          employee.position ||
          "Empleado";

        // Buscar o crear concepto de propinas
        let tipsConcept =
          conceptByCode.get("TIPS") || conceptByCode.get("PROPINAS");

        if (!tipsConcept) {
          // Si no existe, crear una entrada con metadatos para el concepto de propinas
          tipsConcept = {
            tenantId: employee.tenantId,
            code: "TIPS",
            name: "Propinas",
            conceptType: "earning",
            calculation: { method: "fixed_amount" },
            isActive: true,
            metadata: {
              category: "variable",
              isTaxable: true,
              appliesToAllEmployees: true,
            },
          };
        }

        const resolvedTipsConcept = tipsConcept;

        entries.push({
          employeeId: employee._id,
          contractId: contract?._id,
          employeeName,
          department: employee.department,
          conceptCode: resolvedTipsConcept.code,
          conceptName: resolvedTipsConcept.name || "Propinas",
          conceptType: (resolvedTipsConcept.conceptType || "earning") as any,
          amount: tipsAmount,
          breakdown: {
            source: "tips",
            calculationType: "fixed",
            baseAmount: tipsAmount,
          },
        });

        grossPay += tipsAmount;
      }
    });

    // Incluir comisiones aprobadas del período como earnings
    employees.forEach((employee) => {
      const employeeId = employee._id.toString();
      const commissionsAmount = employeeCommissionsMap.get(employeeId);

      if (commissionsAmount && commissionsAmount > 0) {
        const contract = contracts.get(employeeId);
        const customer = customerMap.get(
          (employee as any).customerId?.toString?.() || "",
        );
        const employeeName =
          customer?.name ||
          customer?.companyName ||
          employee.position ||
          "Empleado";

        // Buscar o crear concepto de comisiones
        let commissionsConcept =
          conceptByCode.get("COMMISSION") || conceptByCode.get("COMISIONES");

        if (!commissionsConcept) {
          commissionsConcept = {
            tenantId: employee.tenantId,
            code: "COMMISSION",
            name: "Comisiones sobre Ventas",
            conceptType: "earning",
            calculation: { method: "fixed_amount" },
            isActive: true,
            metadata: {
              category: "variable",
              isTaxable: true,
              appliesToAllEmployees: false,
            },
          };
        }

        const resolvedCommissionsConcept = commissionsConcept;

        entries.push({
          employeeId: employee._id,
          contractId: contract?._id,
          employeeName,
          department: employee.department,
          conceptCode: resolvedCommissionsConcept.code,
          conceptName: resolvedCommissionsConcept.name || "Comisiones",
          conceptType: (resolvedCommissionsConcept.conceptType ||
            "earning") as any,
          amount: commissionsAmount,
          breakdown: {
            source: "commissions",
            calculationType: "fixed",
            baseAmount: commissionsAmount,
          },
        });

        grossPay += commissionsAmount;
      }
    });

    // Incluir bonos aprobados del período como earnings
    employees.forEach((employee) => {
      const employeeId = employee._id.toString();
      const bonusesAmount = employeeBonusesMap.get(employeeId);

      if (bonusesAmount && bonusesAmount > 0) {
        const contract = contracts.get(employeeId);
        const customer = customerMap.get(
          (employee as any).customerId?.toString?.() || "",
        );
        const employeeName =
          customer?.name ||
          customer?.companyName ||
          employee.position ||
          "Empleado";

        // Buscar o crear concepto de bonos
        let bonusConcept =
          conceptByCode.get("GOAL_BONUS") || conceptByCode.get("BONOS");

        if (!bonusConcept) {
          bonusConcept = {
            tenantId: employee.tenantId,
            code: "GOAL_BONUS",
            name: "Bonos por Metas",
            conceptType: "earning",
            calculation: { method: "fixed_amount" },
            isActive: true,
            metadata: {
              category: "variable",
              isTaxable: true,
              appliesToAllEmployees: false,
            },
          };
        }

        const resolvedBonusConcept = bonusConcept;

        entries.push({
          employeeId: employee._id,
          contractId: contract?._id,
          employeeName,
          department: employee.department,
          conceptCode: resolvedBonusConcept.code,
          conceptName: resolvedBonusConcept.name || "Bonos",
          conceptType: (resolvedBonusConcept.conceptType || "earning") as any,
          amount: bonusesAmount,
          breakdown: {
            source: "bonuses",
            calculationType: "fixed",
            baseAmount: bonusesAmount,
          },
        });

        grossPay += bonusesAmount;
      }
    });

    return {
      entries,
      grossPay,
      deductions,
      employerCosts,
      calculationMetadata,
    };
  }

  private buildPayrollLines(
    entries: PayrollRun["entries"],
    conceptMap: Map<string, LeanPayrollConcept>,
    calculationMetadata: PayrollRunCalculationMetadata[],
  ): PayrollRun["lines"] {
    const linesMap = new Map<string, PayrollLineSnapshot>();
    const metadataMap = new Map<string, PayrollRunCalculationMetadata>();
    calculationMetadata.forEach((meta) => {
      const key = `${meta.employeeId || "n/a"}:${meta.contractId || "n/a"}`;
      metadataMap.set(key, meta);
    });

    entries.forEach((entry) => {
      const key = `${entry.employeeId?.toString?.() || "n/a"}:${entry.contractId?.toString?.() || "n/a"
        }`;
      if (!linesMap.has(key)) {
        const meta = metadataMap.get(key);
        linesMap.set(key, {
          employeeId: entry.employeeId as any,
          contractId: entry.contractId as any,
          employeeName: entry.employeeName,
          department: entry.department,
          structureId: meta?.structureId
            ? (this.toObjectId(meta.structureId) as any)
            : undefined,
          structureVersion: meta?.structureVersion,
          earnings: [],
          deductions: [],
          employerCosts: [],
          grossPay: 0,
          deductionsTotal: 0,
          employerCostsTotal: 0,
          netPay: 0,
          hoursWorked: 0,
          overtimeHours: 0,
          manual: Boolean((entry as any)?.breakdown?.manual),
          calculationLog: {
            breakdown: entry.breakdown,
            ruleLogs: meta?.ruleLogs,
            previewTotals: meta?.previewTotals,
          },
          evidences: [],
        });
      }

      const line = linesMap.get(key)!;
      const concept = conceptMap.get(entry.conceptCode);
      const normalizedAmount = Math.abs(entry.amount ?? 0);
      const common = {
        conceptCode: entry.conceptCode,
        conceptName: entry.conceptName,
        amount: normalizedAmount,
        debitAccountId: concept?.debitAccountId?.toString(),
        creditAccountId: concept?.creditAccountId?.toString(),
        manual: Boolean((entry as any)?.breakdown?.manual),
      };

      if (entry.conceptType === "deduction") {
        line.deductions?.push(common);
        line.deductionsTotal = (line.deductionsTotal || 0) + normalizedAmount;
      } else if (entry.conceptType === "employer") {
        line.employerCosts?.push(common);
        line.employerCostsTotal =
          (line.employerCostsTotal || 0) + normalizedAmount;
      } else {
        line.earnings?.push(common);
        line.grossPay = (line.grossPay || 0) + normalizedAmount;
      }

      line.manual = line.manual || common.manual;
      const breakdown = (entry as any)?.breakdown || {};
      line.hoursWorked =
        (line.hoursWorked || 0) +
        (Number(breakdown.hoursWorked || breakdown.hours || 0) || 0);
      line.overtimeHours =
        (line.overtimeHours || 0) +
        (Number(breakdown.overtimeHours || breakdown.extraHours || 0) || 0);
      if (Array.isArray(breakdown.evidences)) {
        const evidenceToAdd: PayrollEvidence[] = breakdown.evidences
          .filter(Boolean)
          .map((ev: any) => ({
            type: ev?.type,
            reference: ev?.reference,
            url: ev?.url,
            notes: ev?.notes,
          }));
        line.evidences = [...(line.evidences || []), ...evidenceToAdd];
      }
      line.netPay =
        (line.grossPay || 0) -
        (line.deductionsTotal || 0) -
        (line.employerCostsTotal || 0);
    });

    return Array.from(linesMap.values());
  }

  private validateRunBalance(run: PayrollRun) {
    const totalEarnings = (run.entries || [])
      .filter((e) => e.conceptType === "earning")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalDeductions = (run.entries || [])
      .filter((e) => e.conceptType === "deduction")
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
    const totalEmployer = (run.entries || [])
      .filter((e) => e.conceptType === "employer")
      .reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
    const calculatedNet = totalEarnings - totalDeductions;
    const tolerance = 0.01;

    if (Math.abs((run.grossPay || 0) - totalEarnings) > tolerance) {
      throw new BadRequestException(
        "Desbalance: el bruto almacenado no coincide con la suma de devengos.",
      );
    }
    if (Math.abs((run.deductions || 0) - totalDeductions) > tolerance) {
      throw new BadRequestException(
        "Desbalance: las deducciones almacenadas no coinciden con la suma de deducciones.",
      );
    }
    if (Math.abs((run.employerCosts || 0) - totalEmployer) > tolerance) {
      throw new BadRequestException(
        "Desbalance: los aportes patronales no coinciden con la suma de líneas patronales.",
      );
    }
    if (Math.abs((run.netPay || 0) - calculatedNet) > tolerance) {
      throw new BadRequestException(
        "Desbalance: neto distinto a devengos menos deducciones.",
      );
    }
  }

  private async ensureConceptAccounts(
    entries: PayrollRun["entries"],
    tenantId: Types.ObjectId,
  ) {
    if (!entries?.length) {
      throw new BadRequestException(
        "No se pueden aprobar nóminas sin líneas de detalle.",
      );
    }
    const conceptCodes = Array.from(
      new Set(entries.map((e) => e.conceptCode).filter(Boolean)),
    );
    const concepts = await this.conceptModel
      .find({
        tenantId,
        code: { $in: conceptCodes },
      })
      .lean<LeanPayrollConcept[]>();
    const conceptMap = new Map(concepts.map((c) => [c.code, c]));

    const missingAccounts: string[] = [];
    entries.forEach((entry) => {
      const concept = conceptMap.get(entry.conceptCode);
      if (!concept) {
        missingAccounts.push(entry.conceptCode || "concepto_sin_codigo");
        return;
      }

      // Si falta mapeo, calcula cuentas por defecto según tipo/código
      if (!concept.debitAccountId || !concept.creditAccountId) {
        const fallback = this.getDefaultAccountsForConcept(concept);
        if (fallback.debit && !concept.debitAccountId) {
          (concept as any).debitAccountId = fallback.debit;
        }
        if (fallback.credit && !concept.creditAccountId) {
          (concept as any).creditAccountId = fallback.credit;
        }
      }

      if (!concept.debitAccountId && !concept.creditAccountId) {
        missingAccounts.push(concept.code);
      }
    });

    if (missingAccounts.length) {
      throw new BadRequestException(
        `Faltan cuentas contables para conceptos: ${missingAccounts
          .slice(0, 5)
          .join(", ")}${missingAccounts.length > 5 ? "..." : ""}`,
      );
    }
  }

  private getDefaultAccountsForConcept(concept: LeanPayrollConcept): {
    debit?: string;
    credit?: string;
  } {
    const code = concept.code?.toUpperCase?.() || "";
    const type = concept.conceptType;
    // Catálogo base proporcionado
    const accounts = {
      salarios: "5201",
      prestacionesGasto: "5205",
      seguridadSocialGasto: "5206",
      bonos: "5207",
      sueldosPorPagar: "2103",
      prestacionesPorPagar: "2104",
      ssAportesPorPagar: "2105",
      faovParoPorPagar: "2106",
      impuestosPorPagar: "2102",
    };

    // Heurísticas por código
    const isBono = code.includes("BONO") || code.includes("AGUINALDO");
    const isPrestaciones =
      code.includes("PREST") ||
      code.includes("UTILIDAD") ||
      code.includes("LIQ");
    const isSS =
      code.includes("IVSS") ||
      code.includes("SSO") ||
      code.includes("PARO") ||
      code.includes("FAOV");

    if (type === "earning") {
      const debit = isBono
        ? accounts.bonos
        : isPrestaciones
          ? accounts.prestacionesGasto
          : accounts.salarios;
      const credit = accounts.sueldosPorPagar;
      return { debit, credit };
    }

    if (type === "deduction") {
      const credit = isSS
        ? accounts.impuestosPorPagar
        : accounts.sueldosPorPagar;
      return { debit: accounts.sueldosPorPagar, credit };
    }

    // employer
    if (type === "employer") {
      const debit = isSS
        ? accounts.seguridadSocialGasto
        : accounts.seguridadSocialGasto;
      const credit = isSS
        ? accounts.ssAportesPorPagar
        : accounts.faovParoPorPagar;
      return { debit, credit };
    }

    return {};
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
      const key = `${calculation.structureId}:${calculation.structureVersion ?? "latest"
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

  private async getPayrollLiabilityAccountId(tenantId: Types.ObjectId) {
    const account = await this.chartModel
      .findOne({
        tenantId,
        $or: [{ "metadata.payrollCategory": "net_pay" }, { code: "2103" }],
      })
      .select(["_id"])
      .lean();
    if (!account?._id) {
      throw new BadRequestException(
        "No se encontró la cuenta de sueldos por pagar (2103) para generar el payable de nómina.",
      );
    }
    return account._id.toString();
  }

  private async approveRunInternal(
    run: PayrollRunDocument,
    tenantId: string,
    userId?: string,
  ) {
    if (!["calculated", "draft"].includes(run.status as PayrollRunStatus)) {
      throw new BadRequestException(
        `Solo se pueden aprobar nóminas en estado calculated/draft (actual: ${run.status})`,
      );
    }
    const tenantObjectId = this.toObjectId(tenantId);
    this.validateRunBalance(run);
    await this.ensureConceptAccounts(run.entries || [], tenantObjectId);
    const accountId = await this.getPayrollLiabilityAccountId(tenantObjectId);
    const payablesMode =
      (run.metadata as any)?.payablesMode === "per_employee"
        ? "per_employee"
        : "aggregated";

    const payeeName =
      run.label || `Nómina ${format(new Date(run.periodEnd), "MMMM yyyy")}`;
    const dueDate =
      (run.metadata as any)?.calendarSnapshot?.payDate || run.periodEnd;

    const payableMetadata: Array<Record<string, any>> = [];

    if (payablesMode === "per_employee") {
      const lines = run.lines || [];
      for (const line of lines) {
        const net = line?.netPay ?? 0;
        if (!net || net <= 0) {
          continue;
        }
        const linePayeeName =
          line.employeeName ||
          payeeName ||
          `Empleado ${line.employeeId?.toString?.() || ""}`;
        const payableDto: CreatePayableDto = {
          type: "payroll",
          payeeType: line.employeeId ? "employee" : "custom",
          payeeId: line.employeeId?.toString?.(),
          payeeName: linePayeeName,
          issueDate: new Date(),
          dueDate: dueDate ? new Date(dueDate as any) : undefined,
          description: `Payroll run ${run._id.toString()} - ${linePayeeName}`,
          lines: [
            {
              description: "Neto de nómina",
              amount: net,
              accountId,
            } as any,
          ],
        };

        const payable = await this.payablesService.create(
          payableDto,
          tenantId,
          userId || "SYSTEM",
        );
        payableMetadata.push({
          payableId: (payable as any)?._id?.toString?.(),
          payableNumber: (payable as any)?.payableNumber,
          employeeId: line.employeeId?.toString?.(),
          employeeName: linePayeeName,
          netPay: net,
        });
      }

      if (!payableMetadata.length) {
        throw new BadRequestException(
          "No se pudo generar payables por empleado (neto <= 0 o sin líneas).",
        );
      }
    } else {
      const payableDto: CreatePayableDto = {
        type: "payroll",
        payeeType: "custom",
        payeeName,
        issueDate: new Date(),
        dueDate: dueDate ? new Date(dueDate as any) : undefined,
        description: `Payroll run ${run._id.toString()}`,
        lines: [
          {
            description: "Neto de nómina",
            amount: run.netPay || 0,
            accountId,
          } as any,
        ],
      };

      const payable = await this.payablesService.create(
        payableDto,
        tenantId,
        userId || "SYSTEM",
      );
      payableMetadata.push({
        payableId: (payable as any)?._id?.toString?.(),
        payableNumber: (payable as any)?.payableNumber,
        netPay: run.netPay || 0,
      });
    }

    const before = { status: run.status };
    run.status = "approved";
    run.metadata = {
      ...(run.metadata || {}),
      payables: payableMetadata,
      payableId: payableMetadata[0]?.payableId,
      payableNumber: payableMetadata[0]?.payableNumber,
      approvedBy: userId,
      approvedAt: new Date(),
    };
    await run.save();

    await this.recordAudit({
      tenantId,
      userId,
      entity: "payrollRun",
      entityId: run._id,
      action: "approve",
      before,
      after: {
        status: run.status,
        payableId: payableMetadata[0]?.payableId,
      },
    });
  }

  async createSpecialRun(
    tenantId: string,
    dto: CreateSpecialPayrollRunDto,
    userId?: string,
  ) {
    const tenantObjectId = this.toObjectId(tenantId);
    const employees =
      dto.employees?.map((emp) => ({
        ...emp,
        employeeId: this.toObjectId(emp.employeeId),
        contractId: emp.contractId
          ? this.toObjectId(emp.contractId)
          : undefined,
      })) || [];
    const grossPay =
      employees.reduce((sum, emp) => sum + (emp.amount || 0), 0) ||
      dto.totalAmount ||
      0;
    const run = await this.specialRunModel.create({
      tenantId: tenantObjectId,
      type: dto.type as SpecialPayrollRunType,
      label: dto.label,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      employees,
      structureId: dto.structureId
        ? this.toObjectId(dto.structureId)
        : undefined,
      structureVersion: dto.structureVersion,
      totalEmployees: employees.length,
      grossPay,
      netPay: grossPay,
      metadata: {
        ...(dto.metadata || {}),
        totalAmount: dto.totalAmount,
        createdBy: userId,
        createdAt: new Date(),
      },
    });

    await this.recordAudit({
      tenantId,
      userId,
      entity: "specialPayrollRun",
      entityId: run._id,
      action: "create",
      after: run.toObject(),
    });

    return run.toObject();
  }

  private mapSpecialRunAccounts(type: SpecialPayrollRunType) {
    // Fallback contable: bonos/aguinaldos -> 5207/2103, liquidación -> 5205/2104, bono vacacional -> 5201/2103
    if (type === "severance") {
      return { debit: "5205", credit: "2104" };
    }
    if (type === "vacation_bonus") {
      return { debit: "5201", credit: "2103" };
    }
    // bonus / thirteenth
    return { debit: "5207", credit: "2103" };
  }

  private async createPayableForSpecialRun(
    run: SpecialPayrollRunDocument,
    tenantId: string,
    userId?: string,
  ) {
    const accounts = this.mapSpecialRunAccounts(run.type);
    const payablePayload: CreatePayableDto = {
      type: "payroll",
      payeeType: "custom",
      payeeName: `Nómina especial ${run.label || run.type}`,
      issueDate: new Date().toISOString() as any,
      description:
        run.metadata?.description || `Special payroll run ${run.type}`,
      lines: [
        {
          amount: run.netPay || 0,
          accountId: accounts.credit,
          description: `Pagar ${run.type}`,
        },
      ],
      dueDate: (run.periodEnd || new Date()) as any,
    };
    const payable = await this.payablesService.create(
      payablePayload,
      tenantId,
      userId || "SYSTEM",
    );
    return payable;
  }

  async paySpecialRun(
    tenantId: string,
    runId: string,
    dto: PayPayrollRunDto,
    userId?: string,
  ) {
    const run = await this.specialRunModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) {
      throw new NotFoundException("Ejecución especial no encontrada");
    }
    if (run.status !== "approved" && run.status !== "posted") {
      throw new BadRequestException("Solo puedes pagar ejecuciones aprobadas");
    }
    const payableResponse = run.metadata?.payableId
      ? {
        payableId: run.metadata.payableId,
        number: run.metadata.payableNumber,
      }
      : await this.createPayableForSpecialRun(run, tenantId, userId);
    const paymentDto: CreatePaymentDto = {
      paymentType: "payable",
      payableId:
        (payableResponse as any)._id?.toString?.() ||
        (payableResponse as any).payableId?.toString?.() ||
        (payableResponse as any)._id ||
        (payableResponse as any).payableId,
      date: (dto.paymentDate
        ? new Date(dto.paymentDate)
        : new Date()
      ).toISOString(),
      amount:
        (run.netPay || 0) +
        (dto.applyIgtf && dto.igtfRate ? (run.netPay || 0) * dto.igtfRate : 0),
      method: dto.method || "transfer",
      currency: dto.currency || run.metadata?.currency || "USD",
      reference: dto.reference || `special-run-${run._id}`,
      bankAccountId: dto.bankAccountId,
      exchangeRate: dto.exchangeRate as any,
      amountVes:
        (dto.currency || run.metadata?.currency || "USD") === "VES"
          ? (run.netPay || 0) +
          (dto.applyIgtf && dto.igtfRate
            ? (run.netPay || 0) * dto.igtfRate
            : 0)
          : undefined,
    };
    const payment = await this.paymentsService.create(paymentDto, {
      tenantId,
      id: userId || "SYSTEM",
    });
    const before = { status: run.status };
    run.status = "paid";
    const payableIdResolved =
      (payableResponse as any)._id?.toString?.() ||
      (payableResponse as any).payableId?.toString?.();
    const payableNumberResolved =
      (payableResponse as any).payableNumber || (payableResponse as any).number;
    run.metadata = {
      ...(run.metadata || {}),
      payableId: payableIdResolved,
      payableNumber: payableNumberResolved,
      paymentId: payment._id,
      paidBy: userId,
      paidAt: new Date(),
    };
    await run.save();
    await this.recordAudit({
      tenantId,
      userId,
      entity: "specialPayrollRun",
      entityId: run._id,
      action: "pay",
      before,
      after: { status: "paid", paymentId: payment._id },
    });
    return { run: run.toObject(), payment };
  }

  async previewSpecialRunAccounting(tenantId: string, runId: string) {
    const run = await this.specialRunModel
      .findOne({
        _id: this.toObjectId(runId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!run) {
      throw new NotFoundException("Ejecución especial no encontrada");
    }
    const accounts = this.mapSpecialRunAccounts(
      run.type as SpecialPayrollRunType,
    );
    const amount = run.netPay || run.grossPay || 0;
    const entries = [
      {
        conceptName: run.label || `Especial ${run.type}`,
        conceptType: run.type,
        debitAccount: accounts.debit,
        creditAccount: accounts.credit,
        debit: amount,
        credit: amount,
      },
    ];
    return {
      entries,
      totals: { debit: amount, credit: amount },
    };
  }

  async listSpecialRuns(
    tenantId: string,
    filters: SpecialPayrollRunFiltersDto,
  ) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.search) {
      query.label = { $regex: filters.search, $options: "i" };
    }
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const [data, total] = await Promise.all([
      this.specialRunModel
        .find(query)
        .sort({ periodStart: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.specialRunModel.countDocuments(query),
    ]);
    return {
      data,
      pagination: {
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        total,
      },
    };
  }

  async getSpecialRun(tenantId: string, runId: string) {
    const run = await this.specialRunModel
      .findOne({
        _id: this.toObjectId(runId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!run) {
      throw new NotFoundException("Ejecución especial no encontrada");
    }
    return run;
  }

  async updateSpecialRunStatus(
    tenantId: string,
    runId: string,
    nextStatus: PayrollRunStatus,
    userId?: string,
  ) {
    const run = await this.specialRunModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) {
      throw new NotFoundException("Ejecución especial no encontrada");
    }
    const allowed: Record<PayrollRunStatus, PayrollRunStatus[]> = {
      draft: ["calculating", "calculated", "approved"],
      calculating: ["calculated"],
      calculated: ["approved"],
      approved: ["paid"],
      posted: ["paid"],
      paid: [],
    };
    const current = run.status as PayrollRunStatus;
    if (!(allowed[current] || []).includes(nextStatus)) {
      throw new BadRequestException(
        `No se puede pasar de ${current} a ${nextStatus}`,
      );
    }
    const before = { status: current };

    if (nextStatus === "approved") {
      let payableResponse: any = null;
      if (run.metadata?.payableId) {
        payableResponse = {
          payableId: run.metadata.payableId,
          payableNumber: (run.metadata as any).payableNumber,
        };
      } else {
        payableResponse = await this.createPayableForSpecialRun(
          run,
          tenantId,
          userId,
        );
      }
      run.metadata = {
        ...(run.metadata || {}),
        payableId:
          payableResponse?._id?.toString?.() ||
          payableResponse?.payableId?.toString?.(),
        payableNumber:
          payableResponse?.payableNumber || payableResponse?.number,
        approvedBy: userId,
        approvedAt: new Date(),
      };
      run.status = "approved";
    } else {
      run.status = nextStatus;
      run.metadata = {
        ...(run.metadata || {}),
        statusChangedBy: userId,
        statusChangedAt: new Date(),
      };
    }

    await run.save();
    await this.recordAudit({
      tenantId,
      userId,
      entity: "specialPayrollRun",
      entityId: run._id,
      action: "statusChange",
      before,
      after: { status: nextStatus, payableId: run.metadata?.payableId },
    });
    return run.toObject();
  }

  async listAudit(
    tenantId: string,
    filters: {
      entity?: string;
      entityId?: string;
      from?: string;
      to?: string;
      limit?: number;
    },
  ) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (filters.entity) {
      query.entity = filters.entity;
    }
    if (filters.entityId) {
      query.entityId = this.toObjectId(filters.entityId);
    }
    if (filters.from || filters.to) {
      query.createdAt = query.createdAt || {};
      if (filters.from) {
        query.createdAt.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.createdAt.$lte = new Date(filters.to);
      }
    }
    const limit = Math.min(filters.limit || 100, 200);
    return this.auditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
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
