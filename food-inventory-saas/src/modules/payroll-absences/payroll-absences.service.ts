import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  EmployeeAbsenceRequest,
  EmployeeAbsenceRequestDocument,
} from "../../schemas/employee-absence-request.schema";
import {
  EmployeeLeaveBalance,
  EmployeeLeaveBalanceDocument,
} from "../../schemas/employee-leave-balance.schema";
import {
  CreateAbsenceRequestDto,
  UpdateAbsenceStatusDto,
} from "./dto/create-absence-request.dto";

@Injectable()
export class PayrollAbsencesService {
  constructor(
    @InjectModel(EmployeeAbsenceRequest.name)
    private readonly absenceModel: Model<EmployeeAbsenceRequestDocument>,
    @InjectModel(EmployeeLeaveBalance.name)
    private readonly balanceModel: Model<EmployeeLeaveBalanceDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId) {
    if (id instanceof Types.ObjectId) return id;
    return new Types.ObjectId(id);
  }

  async listRequests(tenantId: string, filters: Record<string, any> = {}) {
    const query: Record<string, any> = {
      tenantId: this.toObjectId(tenantId),
    };
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.employeeId) {
      query.employeeId = this.toObjectId(filters.employeeId);
    }
    if (filters.from || filters.to) {
      query.startDate = query.startDate || {};
      query.endDate = query.endDate || {};
      if (filters.from) {
        query.endDate.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.startDate.$lte = new Date(filters.to);
      }
    }
    return this.absenceModel.find(query).sort({ startDate: -1 }).lean();
  }

  async createRequest(tenantId: string, dto: CreateAbsenceRequestDto) {
    this.validateRange(dto.startDate, dto.endDate);
    const totalDays =
      dto.totalDays ?? this.calculateDays(dto.startDate, dto.endDate);
    const request = await this.absenceModel.create({
      tenantId: this.toObjectId(tenantId),
      employeeId: this.toObjectId(dto.employeeId),
      employeeName: dto.employeeName,
      leaveType: dto.leaveType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      totalDays,
      reason: dto.reason,
      status: "pending",
    });
    await this.ensureBalanceExists(tenantId, dto.employeeId);
    await this.applyBalanceIncrement(tenantId, dto.employeeId, {
      pendingApprovalDays: totalDays,
    });
    return request;
  }

  async updateStatus(
    tenantId: string,
    requestId: string,
    dto: UpdateAbsenceStatusDto,
    userId?: string,
  ) {
    const request = await this.absenceModel.findOne({
      _id: this.toObjectId(requestId),
      tenantId: this.toObjectId(tenantId),
    });
    if (!request) {
      throw new NotFoundException("Solicitud de ausencia no encontrada");
    }
    const previousStatus = request.status;
    if (previousStatus === dto.status) {
      return request;
    }
    request.status = dto.status;
    request.approvedBy = userId ? this.toObjectId(userId) : undefined;
    if (dto.status === "approved") {
      request.approvedAt = new Date();
      request.rejectionReason = undefined;
      if (previousStatus === "pending") {
        await this.applyBalanceIncrement(
          tenantId,
          request.employeeId.toString(),
          {
            pendingApprovalDays: -request.totalDays,
            takenDays: request.totalDays,
          },
        );
      }
    } else if (dto.status === "rejected") {
      request.rejectionReason = dto.rejectionReason;
      if (previousStatus === "pending") {
        await this.applyBalanceIncrement(
          tenantId,
          request.employeeId.toString(),
          { pendingApprovalDays: -request.totalDays },
        );
      }
    } else if (dto.status === "pending" && previousStatus === "rejected") {
      await this.applyBalanceIncrement(
        tenantId,
        request.employeeId.toString(),
        { pendingApprovalDays: request.totalDays },
      );
    }
    await request.save();
    return request.toObject();
  }

  private async ensureBalanceExists(tenantId: string, employeeId: string) {
    const result = await this.balanceModel.findOne({
      tenantId: this.toObjectId(tenantId),
      employeeId: this.toObjectId(employeeId),
    });
    if (!result) {
      await this.balanceModel.create({
        tenantId: this.toObjectId(tenantId),
        employeeId: this.toObjectId(employeeId),
        accruedDays: 0,
        carriedDays: 0,
        takenDays: 0,
        pendingApprovalDays: 0,
      });
    }
  }

  private async applyBalanceIncrement(
    tenantId: string,
    employeeId: string,
    deltas: { pendingApprovalDays?: number; takenDays?: number },
  ) {
    const update: Record<string, any> = { $inc: {} };
    if (typeof deltas.pendingApprovalDays === "number") {
      update.$inc["pendingApprovalDays"] = deltas.pendingApprovalDays;
    }
    if (typeof deltas.takenDays === "number") {
      update.$inc["takenDays"] = deltas.takenDays;
    }
    const res = await this.balanceModel.updateOne(
      {
        tenantId: this.toObjectId(tenantId),
        employeeId: this.toObjectId(employeeId),
      },
      update,
    );
    if (res.matchedCount === 0) {
      throw new BadRequestException("Balance de ausencias no encontrado");
    }
  }

  private validateRange(start: string | Date, end: string | Date) {
    const s = new Date(start);
    const e = new Date(end);
    if (s.getTime() > e.getTime()) {
      throw new BadRequestException(
        "La fecha fin debe ser posterior a la fecha inicio",
      );
    }
  }

  private calculateDays(start: string | Date, end: string | Date) {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }
}
