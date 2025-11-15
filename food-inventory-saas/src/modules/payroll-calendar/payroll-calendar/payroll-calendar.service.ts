import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PayrollCalendar,
  PayrollCalendarDocument,
  PayrollCalendarFrequency,
} from "../../../schemas/payroll-calendar.schema";
import type { PayrollCalendarStatus } from "../../../schemas/payroll-calendar.schema";
import {
  PayrollRun,
  PayrollRunDocument,
  PayrollRunStatus,
} from "../../../schemas/payroll-run.schema";
import {
  CreatePayrollCalendarDto,
  UpdatePayrollCalendarDto,
} from "../dto/create-payroll-calendar.dto";
import { GeneratePayrollCalendarDto } from "../dto/generate-payroll-calendar.dto";
import { addDays, addWeeks, endOfMonth, startOfDay, subDays } from "date-fns";
import { Shift, ShiftDocument } from "../../../schemas/shift.schema";
import {
  EmployeeContract,
  EmployeeContractDocument,
} from "../../../schemas/employee-contract.schema";
import {
  EmployeeAbsenceRequest,
  EmployeeAbsenceRequestDocument,
} from "../../../schemas/employee-absence-request.schema";

@Injectable()
export class PayrollCalendarService {
  private readonly allowedTransitions: Record<
    PayrollCalendarStatus,
    PayrollCalendarStatus[]
  > = {
    draft: ["open", "closed"],
    open: ["closed"],
    closed: ["open", "posted"],
    posted: [],
  };

  private readonly blockingRunStatuses: PayrollRunStatus[] = [
    "draft",
    "calculating",
    "calculated",
  ];

  constructor(
    @InjectModel(PayrollCalendar.name)
    private readonly calendarModel: Model<PayrollCalendarDocument>,
    @InjectModel(PayrollRun.name)
    private readonly runModel: Model<PayrollRunDocument>,
    @InjectModel(Shift.name)
    private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(EmployeeContract.name)
    private readonly contractModel: Model<EmployeeContractDocument>,
    @InjectModel(EmployeeAbsenceRequest.name)
    private readonly absenceModel: Model<EmployeeAbsenceRequestDocument>,
  ) {}

  async listCalendars(tenantId: string) {
    const calendars = await this.calendarModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ payDate: 1 })
      .lean();

    const enriched = await Promise.all(
      calendars.map(async (calendar) => {
        const mutableCalendar = calendar as Record<string, any>;
        const metadata = (mutableCalendar.metadata || {}) as Record<string, any>;
        mutableCalendar.metadata = metadata;
        const complianceFlags = (metadata.complianceFlags || {}) as Record<string, any>;
        metadata.complianceFlags = complianceFlags;
        if (["draft", "open"].includes(calendar.status)) {
          const ops = await this.countOperationalIssues(calendar as any);
          metadata.complianceFlags = {
            ...complianceFlags,
            pendingShifts: ops.pendingShifts > 0,
            pendingShiftCount: ops.pendingShifts,
            expiredContracts: ops.expiredContracts > 0,
            expiredContractCount: ops.expiredContracts,
            pendingAbsences: ops.pendingAbsences > 0,
            pendingAbsenceCount: ops.pendingAbsences,
          };
        }
        return calendar;
      }),
    );

    return enriched;
  }

  async createCalendar(tenantId: string, dto: CreatePayrollCalendarDto) {
    this.ensureValidRange(dto.periodStart, dto.periodEnd);
    return this.calendarModel.create({
      ...dto,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      cutoffDate: new Date(dto.cutoffDate),
      payDate: new Date(dto.payDate),
      tenantId: new Types.ObjectId(tenantId),
      status: dto.status || "draft",
      metadata: {
        closedAt: dto.status === "closed" ? new Date() : undefined,
        postedAt: dto.status === "posted" ? new Date() : undefined,
      },
    });
  }

  async updateCalendar(
    tenantId: string,
    calendarId: string,
    dto: UpdatePayrollCalendarDto,
  ) {
    const updates: Record<string, any> = { ...dto };
    if (dto.periodStart) updates.periodStart = new Date(dto.periodStart);
    if (dto.periodEnd) updates.periodEnd = new Date(dto.periodEnd);
    if (dto.cutoffDate) updates.cutoffDate = new Date(dto.cutoffDate);
    if (dto.payDate) updates.payDate = new Date(dto.payDate);
    if (updates.periodStart || updates.periodEnd) {
      this.ensureValidRange(
        updates.periodStart ?? dto.periodStart,
        updates.periodEnd ?? dto.periodEnd,
      );
    }
    return this.calendarModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(calendarId),
          tenantId: new Types.ObjectId(tenantId),
        },
        { $set: updates },
        { new: true },
      )
      .lean();
  }

  async changeStatus(
    tenantId: string,
    calendarId: string,
    nextStatus: PayrollCalendarStatus,
  ) {
    const calendar = await this.calendarModel.findOne({
      _id: new Types.ObjectId(calendarId),
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!calendar) {
      throw new NotFoundException("Calendario no encontrado");
    }
    const allowed =
      this.allowedTransitions[calendar.status as PayrollCalendarStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `No se puede cambiar de ${calendar.status} a ${nextStatus}`,
      );
    }
    await this.ensureCalendarCanChange(calendar, nextStatus);
    calendar.status = nextStatus;
    calendar.metadata = calendar.metadata || {};
    if (nextStatus === "closed") {
      calendar.metadata.closedAt = new Date();
      calendar.metadata.complianceFlags = {
        ...(calendar.metadata.complianceFlags || {}),
        pendingRuns: false,
        pendingRunCount: 0,
        pendingShifts: false,
        pendingShiftCount: 0,
        expiredContracts: false,
        expiredContractCount: 0,
        pendingAbsences: false,
        pendingAbsenceCount: 0,
        structureCoverageOk: true,
      };
    }
    if (nextStatus === "posted") {
      calendar.metadata.postedAt = new Date();
      calendar.metadata.complianceFlags = {
        ...(calendar.metadata.complianceFlags || {}),
        pendingRuns: false,
        pendingRunCount: 0,
        pendingShifts: false,
        pendingShiftCount: 0,
        expiredContracts: false,
        expiredContractCount: 0,
        pendingAbsences: false,
        pendingAbsenceCount: 0,
        structureCoverageOk: true,
      };
    }
    await calendar.save();
    return calendar.toObject();
  }

  async reopenCalendar(tenantId: string, calendarId: string) {
    return this.changeStatus(tenantId, calendarId, "open");
  }

  async closeCalendar(tenantId: string, calendarId: string) {
    return this.changeStatus(tenantId, calendarId, "closed");
  }

  async generateFutureCalendars(
    tenantId: string,
    dto: GeneratePayrollCalendarDto,
    userId?: string,
  ) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const count = dto.count ?? 3;
    if (!dto.anchorDate) {
      const last = await this.calendarModel
        .findOne({
          tenantId: tenantObjectId,
          frequency: dto.frequency,
        })
        .sort({ periodEnd: -1 })
        .lean();
      if (!last) {
        throw new BadRequestException(
          "No existe historial para inferir el siguiente período; proporciona anchorDate.",
        );
      }
      dto.anchorDate = addDays(last.periodEnd, 1).toISOString();
    }

    let currentStart = startOfDay(new Date(dto.anchorDate));
    const created: PayrollCalendar[] = [];
    for (let i = 0; i < count; i++) {
      const period = this.computePeriodRange(
        currentStart,
        dto.frequency,
        dto.payDateOffsetDays,
      );
      await this.ensureNoOverlap(tenantObjectId, period.periodStart, period.periodEnd);
      const cutoff = subDays(
        period.payDate,
        dto.cutoffOffsetDays ?? Math.min(5, periodDurationDays(dto.frequency)),
      );
      const calendar = await this.calendarModel.create({
        tenantId: tenantObjectId,
        name:
          dto.namePrefix ??
          `Nómina ${period.periodEnd.toLocaleDateString("es-VE", {
            month: "long",
            year: "numeric",
          })}`,
        description: dto.descriptionTemplate
          ? dto.descriptionTemplate.replace(
              /\{\{period\}\}/g,
              `${period.periodStart.toISOString().slice(0, 10)} - ${period.periodEnd
                .toISOString()
                .slice(0, 10)}`,
            )
          : undefined,
        frequency: dto.frequency,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        cutoffDate: cutoff < period.periodStart ? period.periodStart : cutoff,
        payDate: period.payDate,
        structureId: dto.structureId ? new Types.ObjectId(dto.structureId) : undefined,
        status: "draft",
        metadata: {
          generatedBy: userId,
          generatedAt: new Date(),
          reminders: {
            cutoffOffsetDays: dto.cutoffOffsetDays ?? 5,
            payDateOffsetDays: dto.payDateOffsetDays ?? 0,
          },
        },
      });
      created.push(calendar.toObject());
      currentStart = addDays(period.periodEnd, 1);
    }
    return created;
  }

  private ensureValidRange(from?: Date | string, to?: Date | string) {
    if (!from || !to) return;
    const start = new Date(from);
    const end = new Date(to);
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException(
        "La fecha fin debe ser posterior o igual a la fecha inicio",
      );
    }
  }

  private async ensureCalendarCanChange(
    calendar: PayrollCalendarDocument,
    nextStatus: PayrollCalendarStatus,
  ) {
    if (!["closed", "posted"].includes(nextStatus)) {
      return;
    }
    const [pendingRuns, operational] = await Promise.all([
      this.runModel.countDocuments({
        tenantId: calendar.tenantId,
        calendarId: calendar._id,
        status: { $in: this.blockingRunStatuses },
      }),
      this.countOperationalIssues(calendar),
    ]);
    if (pendingRuns > 0) {
      throw new BadRequestException(
        `No se puede ${nextStatus === "closed" ? "cerrar" : "publicar"} el período: existen ${pendingRuns} ejecuciones de nómina pendientes o sin aprobar.`,
      );
    }
    if (operational.pendingShifts > 0) {
      throw new BadRequestException(
        `No se puede ${nextStatus === "closed" ? "cerrar" : "publicar"} el período: hay ${operational.pendingShifts} turnos sin aprobar (clock-out faltante).`,
      );
    }
    if (operational.expiredContracts > 0) {
      throw new BadRequestException(
        `No se puede ${nextStatus === "closed" ? "cerrar" : "publicar"} el período: ${operational.expiredContracts} contratos aparecen vencidos dentro del rango pero siguen activos.`,
      );
    }
    if (operational.pendingAbsences > 0) {
      throw new BadRequestException(
        `No se puede ${nextStatus === "closed" ? "cerrar" : "publicar"} el período: ${operational.pendingAbsences} ausencias están pendientes de aprobación.`,
      );
    }
    const coveragePercent =
      calendar.metadata?.structureSummary?.coveragePercent ?? 0;
    if (coveragePercent < 100) {
      throw new BadRequestException(
        `Cobertura de estructuras incompleta (${coveragePercent}%); ejecuta o corrige la nómina antes de cerrar.`,
      );
    }
  }

  private async countOperationalIssues(
    calendar: {
      tenantId: Types.ObjectId | string;
      periodStart: Date;
      periodEnd: Date;
      _id?: Types.ObjectId | string;
    },
  ): Promise<{
    pendingShifts: number;
    expiredContracts: number;
    pendingAbsences: number;
  }> {
    const periodStart = new Date(calendar.periodStart);
    const periodEnd = new Date(calendar.periodEnd);
    const [pendingShifts, expiredContracts, pendingAbsences] = await Promise.all([
      this.shiftModel.countDocuments({
        tenantId: calendar.tenantId,
        clockIn: { $lte: periodEnd, $gte: periodStart },
        $or: [{ clockOut: null }, { clockOut: { $exists: false } }],
      }),
      this.contractModel.countDocuments({
        tenantId: calendar.tenantId,
        status: { $in: ["active", "draft"] },
        endDate: {
          $exists: true,
          $ne: null,
          $lte: periodEnd,
          $gte: periodStart,
        },
      }),
      this.absenceModel.countDocuments({
        tenantId: calendar.tenantId,
        status: "pending",
        startDate: { $lte: periodEnd },
        endDate: { $gte: periodStart },
      }),
    ]);
    return { pendingShifts, expiredContracts, pendingAbsences };
  }

  private computePeriodRange(
    start: Date,
    frequency: PayrollCalendarFrequency,
    payDateOffsetDays = 0,
  ) {
    let periodStart = startOfDay(start);
    let periodEnd: Date;
    switch (frequency) {
      case "weekly":
        periodEnd = addDays(periodStart, 6);
        break;
      case "biweekly":
        periodEnd = addDays(periodStart, 13);
        break;
      case "monthly":
        periodStart = startOfDay(
          new Date(periodStart.getFullYear(), periodStart.getMonth(), 1),
        );
        periodEnd = endOfMonth(periodStart);
        break;
      default:
        periodEnd = addWeeks(periodStart, 1);
    }
    const payDate = addDays(periodEnd, payDateOffsetDays ?? 0);
    return { periodStart, periodEnd, payDate };
  }

  private async ensureNoOverlap(
    tenantId: Types.ObjectId,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const overlapping = await this.calendarModel.findOne({
      tenantId,
      $or: [
        {
          periodStart: { $lte: periodEnd },
          periodEnd: { $gte: periodStart },
        },
      ],
    });
    if (overlapping) {
      throw new BadRequestException(
        "Ya existe un período que se traslapa con el rango solicitado.",
      );
    }
  }
}

function periodDurationDays(frequency: PayrollCalendarFrequency) {
  switch (frequency) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    default:
      return 7;
  }
}
