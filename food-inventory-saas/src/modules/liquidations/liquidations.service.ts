import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  LiquidationRuleSet,
  LiquidationRuleSetDocument,
} from "../../schemas/liquidation-rule-set.schema";
import {
  LiquidationRun,
  LiquidationRunDocument,
} from "../../schemas/liquidation-run.schema";
import { CreateLiquidationRuleSetDto } from "./dto/create-liquidation-ruleset.dto";
import { CreateLiquidationRunDto } from "./dto/create-liquidation-run.dto";
import {
  PayablesService,
  CreatePayableDto,
} from "../payables/payables.service";
import { PaymentsService } from "../payments/payments.service";
import { CreatePaymentDto } from "../../dto/payment.dto";
import {
  EmployeeContract,
  EmployeeContractDocument,
} from "../../schemas/employee-contract.schema";
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from "../../schemas/employee-profile.schema";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require("pdfkit");

@Injectable()
export class LiquidationsService {
  constructor(
    @InjectModel(LiquidationRuleSet.name)
    private readonly ruleSetModel: Model<LiquidationRuleSetDocument>,
    @InjectModel(LiquidationRun.name)
    private readonly runModel: Model<LiquidationRunDocument>,
    @InjectModel(EmployeeContract.name)
    private readonly contractModel: Model<EmployeeContractDocument>,
    @InjectModel(EmployeeProfile.name)
    private readonly profileModel: Model<EmployeeProfileDocument>,
    private readonly payablesService: PayablesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private toObjectId(val: string | Types.ObjectId) {
    if (val instanceof Types.ObjectId) return val;
    return new Types.ObjectId(val);
  }

  async createRuleSet(tenantId: string, dto: CreateLiquidationRuleSetDto) {
    const ruleSet = await this.ruleSetModel.create({
      tenantId: this.toObjectId(tenantId),
      country: dto.country || "VE",
      version: dto.version || 1,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      config: {
        daysPerYear: dto.daysPerYear,
        minDaysPerYear: dto.minDaysPerYear,
        bonusDaysAfterYears: dto.bonusDaysAfterYears,
        utilitiesDays: dto.utilitiesDays,
        vacationDays: dto.vacationDays,
        integralSalaryFactor: dto.integralSalaryFactor,
        accounts: dto.accounts,
      },
      severanceFund: dto.severanceFund,
      socialSecurity: dto.socialSecurity,
      notes: dto.notes,
    });
    return ruleSet.toObject();
  }

  async listRuleSets(tenantId: string, country?: string) {
    const query: Record<string, any> = { tenantId: this.toObjectId(tenantId) };
    if (country) query.country = country;
    return this.ruleSetModel.find(query).sort({ version: -1 }).lean();
  }

  async listRuns(tenantId: string) {
    return this.runModel
      .find({ tenantId: this.toObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async createRun(tenantId: string, dto: CreateLiquidationRunDto) {
    const run = await this.runModel.create({
      tenantId: this.toObjectId(tenantId),
      country: dto.country || "VE",
      ruleSetId: dto.ruleSetId ? this.toObjectId(dto.ruleSetId) : undefined,
      label: dto.label,
      terminationDate: dto.terminationDate
        ? new Date(dto.terminationDate)
        : undefined,
      totalAmount: dto.totalAmount || 0,
      netPayable: dto.totalAmount || 0,
      status: "draft",
      metadata: { createdAt: new Date() },
    });
    return run.toObject();
  }

  async calculateRun(tenantId: string, runId: string) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) throw new NotFoundException("Liquidación no encontrada");
    const ruleSet = run.ruleSetId
      ? await this.ruleSetModel.findOne({
          _id: run.ruleSetId,
          tenantId: this.toObjectId(tenantId),
        })
      : await this.ruleSetModel
          .findOne({
            tenantId: this.toObjectId(tenantId),
            country: run.country,
          })
          .sort({ version: -1 });
    if (!ruleSet) {
      throw new BadRequestException(
        "No hay reglas de liquidación configuradas",
      );
    }
    const contracts = await this.contractModel
      .find({
        tenantId: this.toObjectId(tenantId),
        status: { $in: ["active", "terminated"] },
      })
      .lean();

    const entries: any[] = [];
    let totalAmount = 0;
    const termDate = run.terminationDate || new Date();
    const cfg = ruleSet.config || {};
    const integralFactor = cfg.integralSalaryFactor || 1;
    const daysPerYear = cfg.daysPerYear ?? 30;
    const minDaysPerYear = cfg.minDaysPerYear ?? 0;
    const bonusCfg = cfg.bonusDaysAfterYears || {};
    const vacationDays = cfg.vacationDays ?? 0;
    const utilitiesDays = cfg.utilitiesDays ?? 0;

    for (const contract of contracts) {
      const years = Math.max(
        0,
        (termDate.getTime() - new Date(contract.startDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      );
      const baseSalary = contract.compensationAmount || 0;
      const integralSalary = baseSalary * integralFactor;
      let severanceDays = Math.max(daysPerYear * years, minDaysPerYear);
      if (
        bonusCfg?.thresholdYears &&
        bonusCfg?.daysPerYear &&
        years >= bonusCfg.thresholdYears
      ) {
        severanceDays +=
          (years - bonusCfg.thresholdYears) * bonusCfg.daysPerYear;
      }
      const severanceAmount = (integralSalary / 30) * severanceDays;
      const vacationAmount = (integralSalary / 30) * vacationDays;
      const utilitiesAmount = (integralSalary / 30) * utilitiesDays;
      const netAmount = severanceAmount + vacationAmount + utilitiesAmount;
      totalAmount += netAmount;
      const profile = await this.profileModel
        .findById(contract.employeeId)
        .populate("customerId", "name")
        .lean();

      entries.push({
        employeeId: contract.employeeId,
        contractId: contract._id,
        employeeName: (profile?.customerId as any)?.name || "N/A",
        yearsOfService: Number(years.toFixed(2)),
        baseSalary,
        integralSalary,
        severanceDays,
        severanceAmount,
        vacationDays,
        vacationAmount,
        utilitiesDays,
        utilitiesAmount,
        deductions: 0,
        netAmount,
        breakdown: {
          integralFactor,
          daysPerYear,
          minDaysPerYear,
          vacationDays,
          utilitiesDays,
        },
      });
    }

    run.entries = entries;
    run.totalAmount = totalAmount;
    run.totalDeductions = 0;
    run.netPayable = totalAmount;
    run.status = "calculated";
    run.metadata = {
      ...(run.metadata || {}),
      calculatedAt: new Date(),
      ruleSetVersion: ruleSet.version,
    };
    await run.save();
    return run.toObject();
  }

  async approveRun(tenantId: string, runId: string, userId?: string) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) throw new NotFoundException("Liquidación no encontrada");
    if (run.status !== "calculated" && run.status !== "draft") {
      throw new BadRequestException(
        "Solo puedes aprobar liquidaciones calculadas",
      );
    }
    const ruleSet = run.ruleSetId
      ? await this.ruleSetModel.findOne({
          _id: run.ruleSetId,
          tenantId: this.toObjectId(tenantId),
        })
      : await this.ruleSetModel
          .findOne({
            tenantId: this.toObjectId(tenantId),
            country: run.country,
          })
          .sort({ version: -1 });
    const accounts =
      (run.metadata as any)?.accounts ||
      (ruleSet?.config as any)?.accounts ||
      {};
    const payablePayload: CreatePayableDto = {
      type: "payroll",
      payeeType: "custom",
      payeeName: run.label || "Liquidación",
      issueDate: new Date().toISOString() as any,
      dueDate: new Date().toISOString() as any,
      description: `Liquidación ${run.country}`,
      lines: [
        {
          amount: run.netPayable || 0,
          accountId: accounts.severanceDebit || "5205",
          description: "Liquidación prestaciones",
        },
      ],
    };
    const payable = await this.payablesService.create(
      payablePayload,
      tenantId,
      userId || "SYSTEM",
    );
    run.status = "approved";
    run.metadata = {
      ...(run.metadata || {}),
      payableId: (payable as any)._id?.toString?.(),
      payableNumber: (payable as any).payableNumber,
      approvedBy: userId,
      approvedAt: new Date(),
    };
    await run.save();
    return run.toObject();
  }

  async payRun(
    tenantId: string,
    runId: string,
    dto: {
      method: string;
      currency: string;
      bankAccountId?: string;
      reference?: string;
    },
    userId?: string,
  ) {
    const run = await this.runModel.findOne({
      _id: this.toObjectId(runId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!run) throw new NotFoundException("Liquidación no encontrada");
    if (run.status !== "approved") {
      throw new BadRequestException(
        "Solo puedes pagar liquidaciones aprobadas",
      );
    }
    const payableId = run.metadata?.payableId;
    if (!payableId) {
      throw new BadRequestException("Liquidación sin payable asociado");
    }
    const paymentDto: CreatePaymentDto = {
      paymentType: "payable",
      payableId,
      date: new Date().toISOString(),
      amount: run.netPayable || 0,
      method: dto.method || "transfer",
      currency: dto.currency || "USD",
      reference: dto.reference || `liquidation-${runId}`,
      bankAccountId: dto.bankAccountId,
    };
    const payment = await this.paymentsService.create(paymentDto, {
      tenantId,
      id: userId || "SYSTEM",
    });
    run.status = "paid";
    run.metadata = {
      ...(run.metadata || {}),
      paymentId: (payment as any)._id?.toString?.(),
      paidBy: userId,
      paidAt: new Date(),
    };
    await run.save();
    return run.toObject();
  }

  async exportRun(
    tenantId: string,
    runId: string,
    format: "csv" | "pdf" = "csv",
  ) {
    const run = await this.runModel
      .findOne({
        _id: this.toObjectId(runId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!run) {
      throw new NotFoundException("Liquidación no encontrada");
    }
    if (format === "pdf") {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {});

      doc
        .fontSize(14)
        .text(`Liquidación ${run.label || run._id}`, { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`País: ${run.country} · Estado: ${run.status}`);
      doc.text(`Total: ${run.netPayable || 0}`);
      doc.moveDown();
      doc.text("Detalle por empleado:");
      run.entries?.forEach((entry: any, idx: number) => {
        doc.moveDown(0.5);
        doc.text(
          `${idx + 1}. ${entry.employeeName || entry.employeeId} | Años: ${
            entry.yearsOfService
          } | Integral: ${entry.integralSalary} | Prestaciones: ${
            entry.severanceAmount
          } | Vacaciones: ${entry.vacationAmount} | Utilidades: ${entry.utilitiesAmount} | Neto: ${
            entry.netAmount
          }`,
        );
      });
      doc.end();
      const buffer = await new Promise<Buffer>((resolve) => {
        const finish = () => resolve(Buffer.concat(chunks));
        doc.on("end", finish);
      });
      return {
        buffer,
        contentType: "application/pdf",
        filename: `liquidation-${runId}.pdf`,
      };
    }

    // CSV
    const headers = [
      "employeeId",
      "employeeName",
      "yearsOfService",
      "baseSalary",
      "integralSalary",
      "severanceDays",
      "severanceAmount",
      "vacationDays",
      "vacationAmount",
      "utilitiesDays",
      "utilitiesAmount",
      "netAmount",
    ];
    const rows = (run.entries || []).map((e: any) =>
      [
        e.employeeId,
        e.employeeName,
        e.yearsOfService,
        e.baseSalary,
        e.integralSalary,
        e.severanceDays,
        e.severanceAmount,
        e.vacationDays,
        e.vacationAmount,
        e.utilitiesDays,
        e.utilitiesAmount,
        e.netAmount,
      ].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    return {
      buffer: Buffer.from(csv, "utf8"),
      contentType: "text/csv",
      filename: `liquidation-${runId}.csv`,
    };
  }

  async previewAccounting(tenantId: string, runId: string) {
    const run = await this.runModel
      .findOne({
        _id: this.toObjectId(runId),
        tenantId: this.toObjectId(tenantId),
      })
      .lean();
    if (!run) {
      throw new NotFoundException("Liquidación no encontrada");
    }
    const ruleSet = run.ruleSetId
      ? await this.ruleSetModel
          .findOne({
            _id: run.ruleSetId,
            tenantId: this.toObjectId(tenantId),
          })
          .lean()
      : null;
    const accounts =
      (run.metadata as any)?.accounts ||
      (ruleSet?.config as any)?.accounts ||
      {};
    const debit = run.netPayable || 0;
    const credit = run.netPayable || 0;
    const entries = [
      {
        conceptName: run.label || "Liquidación VE",
        debitAccount: accounts.severanceDebit || "5205",
        creditAccount: accounts.severanceCredit || "2104",
        debit,
        credit,
      },
    ];
    return {
      entries,
      totals: { debit, credit },
    };
  }
}
