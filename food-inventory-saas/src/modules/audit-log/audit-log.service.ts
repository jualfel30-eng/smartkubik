import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, FilterQuery } from "mongoose";
import { AuditLog, AuditLogDocument } from "../../schemas/audit-log.schema";

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async createLog(
    action: string,
    performedBy: string, // User ID as string
    details: any,
    ipAddress: string,
    tenantId?: string | null, // Accepting string or null
    targetId?: string | null, // Accepting string or null
  ): Promise<AuditLog> {
    const log = new this.auditLogModel({
      action,
      performedBy,
      details,
      ipAddress,
      tenantId,
      targetId,
    });
    return log.save();
  }

  async findLogs(filter: FilterQuery<AuditLogDocument>): Promise<AuditLog[]> {
    return this.auditLogModel
      .find(filter)
      .populate("performedBy", "email name") // Populate user's email and name
      .sort({ createdAt: -1 })
      .exec();
  }
}
