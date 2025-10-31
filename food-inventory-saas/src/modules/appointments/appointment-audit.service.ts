import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  AppointmentAudit,
  AppointmentAuditDocument,
} from "../../schemas/appointment-audit.schema";

interface RecordAuditOptions {
  tenantId: string;
  appointmentId: string | Types.ObjectId;
  action: string;
  performedBy?: string;
  source?: string;
  changes?: Record<string, any>;
}

@Injectable()
export class AppointmentAuditService {
  constructor(
    @InjectModel(AppointmentAudit.name)
    private readonly auditModel: Model<AppointmentAuditDocument>,
  ) {}

  async record(options: RecordAuditOptions): Promise<void> {
    const { tenantId, appointmentId, action, performedBy, source, changes } = options;
    await this.auditModel.create({
      tenantId,
      appointmentId,
      action,
      performedBy,
      source,
      changes: changes || {},
    });
  }

  async list(tenantId: string, appointmentId: string) {
    return this.auditModel
      .find({ tenantId, appointmentId })
      .sort({ createdAt: -1 })
      .lean();
  }
}
