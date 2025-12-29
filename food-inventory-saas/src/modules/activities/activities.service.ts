import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Activity, ActivityDocument } from "../../schemas/activity.schema";
import {
  CreateActivityDto,
  UpdateActivityDto,
  QueryActivitiesDto,
} from "../../dto/activity.dto";

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
  ) {}

  async create(
    createActivityDto: CreateActivityDto,
    user: any,
  ): Promise<ActivityDocument> {
    const activity = new this.activityModel({
      ...createActivityDto,
      tenantId: user.tenantId,
      createdBy: user.id,
      ownerId: createActivityDto.ownerId || user.id,
    });

    await activity.save();
    this.logger.log(
      `Activity created: ${activity._id} (type: ${activity.type}, tenant: ${user.tenantId})`,
    );

    return activity;
  }

  async findAll(
    query: QueryActivitiesDto,
    user: any,
  ): Promise<ActivityDocument[]> {
    const filter: any = { tenantId: user.tenantId };

    if (query.opportunityId) {
      filter.opportunityId = new Types.ObjectId(query.opportunityId);
    }

    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }

    if (query.ownerId) {
      filter.ownerId = new Types.ObjectId(query.ownerId);
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.threadId) {
      filter.threadId = query.threadId;
    }

    if (query.completed !== undefined) {
      filter.completed = query.completed;
    }

    const limit = parseInt(query.limit || "50", 10);
    const offset = parseInt(query.offset || "0", 10);

    return this.activityModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("customerId", "name email phone")
      .populate("opportunityId", "name stage")
      .populate("ownerId", "name email")
      .exec();
  }

  async findOne(id: string, user: any): Promise<ActivityDocument> {
    const activity = await this.activityModel
      .findOne({
        _id: id,
        tenantId: user.tenantId,
      })
      .populate("customerId", "name email phone")
      .populate("opportunityId", "name stage")
      .populate("ownerId", "name email")
      .exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return activity;
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
    user: any,
  ): Promise<ActivityDocument> {
    const activity = await this.activityModel
      .findOneAndUpdate(
        {
          _id: id,
          tenantId: user.tenantId,
        },
        { $set: updateActivityDto },
        { new: true },
      )
      .exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    this.logger.log(
      `Activity updated: ${activity._id} (tenant: ${user.tenantId})`,
    );

    return activity;
  }

  async remove(id: string, user: any): Promise<void> {
    const result = await this.activityModel
      .deleteOne({
        _id: id,
        tenantId: user.tenantId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    this.logger.log(`Activity deleted: ${id} (tenant: ${user.tenantId})`);
  }

  /**
   * Buscar actividad por messageId o threadId (para threading)
   */
  async findByMessage(
    messageId: string,
    user: any,
  ): Promise<ActivityDocument | null> {
    return this.activityModel
      .findOne({
        tenantId: user.tenantId,
        $or: [{ messageId }, { threadId: messageId }],
      })
      .exec();
  }

  /**
   * Crear actividad desde mensaje inbound (email/WhatsApp)
   */
  async createFromInboundMessage(params: {
    type: "email" | "whatsapp";
    direction: "inbound";
    subject: string;
    body: string;
    messageId?: string;
    threadId?: string;
    channel: string;
    customerId: string;
    opportunityId?: string;
    participants?: string[];
    metadata?: Record<string, any>;
    tenantId: string;
    userId: string;
  }): Promise<ActivityDocument> {
    const activity = new this.activityModel({
      type: params.type,
      direction: params.direction,
      subject: params.subject,
      body: params.body,
      messageId: params.messageId,
      threadId: params.threadId,
      channel: params.channel,
      customerId: params.customerId,
      opportunityId: params.opportunityId,
      participants: params.participants,
      metadata: params.metadata,
      tenantId: params.tenantId,
      createdBy: params.userId,
    });

    await activity.save();
    this.logger.log(
      `Inbound activity created: ${activity._id} (${params.type}, messageId: ${params.messageId}, tenant: ${params.tenantId})`,
    );

    return activity;
  }

  /**
   * Marcar actividad como completada
   */
  async markAsCompleted(
    id: string,
    user: any,
  ): Promise<ActivityDocument> {
    const activity = await this.activityModel
      .findOneAndUpdate(
        {
          _id: id,
          tenantId: user.tenantId,
        },
        {
          $set: {
            completed: true,
            completedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    this.logger.log(
      `Activity completed: ${activity._id} (tenant: ${user.tenantId})`,
    );

    return activity;
  }

  /**
   * Obtener actividades pendientes (tareas no completadas)
   */
  async findPendingTasks(user: any): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({
        tenantId: user.tenantId,
        type: "task",
        completed: false,
      })
      .sort({ scheduledAt: 1 })
      .populate("customerId", "name email phone")
      .populate("opportunityId", "name stage")
      .populate("ownerId", "name email")
      .exec();
  }

  /**
   * Contar actividades por oportunidad
   */
  async countByOpportunity(
    opportunityId: string,
    user: any,
  ): Promise<number> {
    return this.activityModel
      .countDocuments({
        tenantId: user.tenantId,
        opportunityId: new Types.ObjectId(opportunityId),
      })
      .exec();
  }
}
