import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TenantEventLog,
  TenantEventLogDocument,
} from "../../schemas/tenant-event-log.schema";

export interface TenantEvent {
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  source?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class TenantEventService {
  private readonly logger = new Logger(TenantEventService.name);

  constructor(
    @InjectModel(TenantEventLog.name)
    private readonly eventLogModel: Model<TenantEventLogDocument>,
  ) {}

  /**
   * Emit an event to the tenant event log.
   * Fire-and-forget: does NOT block the caller.
   */
  emit(event: TenantEvent): void {
    this.eventLogModel
      .create({
        tenantId: new Types.ObjectId(event.tenantId),
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        data: event.data,
        source: event.source || "system",
        metadata: event.metadata || {},
      })
      .catch((err) => {
        this.logger.error(
          `Failed to log event ${event.eventType} for tenant ${event.tenantId}: ${err.message}`,
        );
      });
  }

  /**
   * Query events for a tenant (for analytics/intelligence).
   */
  async getEvents(
    tenantId: string,
    options: {
      eventType?: string;
      entityType?: string;
      from?: Date;
      to?: Date;
      limit?: number;
    } = {},
  ): Promise<TenantEventLogDocument[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (options.eventType) filter.eventType = options.eventType;
    if (options.entityType) filter.entityType = options.entityType;
    if (options.from || options.to) {
      filter.createdAt = {};
      if (options.from) filter.createdAt.$gte = options.from;
      if (options.to) filter.createdAt.$lte = options.to;
    }

    return this.eventLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100)
      .lean();
  }

  /**
   * Count events by type for a tenant (for metrics).
   */
  async countByType(
    tenantId: string,
    from?: Date,
  ): Promise<Record<string, number>> {
    const match: any = {
      tenantId: new Types.ObjectId(tenantId),
    };
    if (from) {
      match.createdAt = { $gte: from };
    }

    const results = await this.eventLogModel.aggregate([
      { $match: match },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r._id] = r.count;
    }
    return counts;
  }

  /**
   * Get total event count for a tenant (for "intelligence trap" visibility).
   */
  async getTotalEventCount(tenantId: string): Promise<number> {
    return this.eventLogModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
    });
  }
}
