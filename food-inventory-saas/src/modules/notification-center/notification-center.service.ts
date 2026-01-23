import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Notification,
  NotificationDocument,
  NotificationCategory,
} from "../../schemas/notification.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { NotificationCenterGateway } from "./notification-center.gateway";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

export interface UserContext {
  id: string;
  tenantId: string;
  email?: string;
}


export interface UnreadCountResult {
  total: number;
  byCategory: Record<string, number>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class NotificationCenterService {
  private readonly logger = new Logger(NotificationCenterService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly gateway: NotificationCenterGateway,
  ) { }

  /**
   * Create a new notification and dispatch it
   */
  async create(
    dto: CreateNotificationDto,
    tenantId: string,
    options?: { broadcast?: boolean },
  ): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      tenantId: new Types.ObjectId(tenantId),
      userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
      category: dto.category,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      priority: dto.priority || "medium",
      entityType: dto.entityType,
      entityId: dto.entityId,
      navigateTo: dto.navigateTo,
      metadata: dto.metadata,
      isRead: false,
      dispatchedChannels: ["in-app"],
    });

    const saved = await notification.save();
    this.logger.log(
      `Created notification: ${saved._id} - ${dto.type} for tenant ${tenantId}`,
    );

    // Dispatch via Socket.IO
    const isBroadcast = options?.broadcast || !dto.userId;
    if (isBroadcast) {
      this.gateway.emitToTenant(tenantId, saved);
    } else if (dto.userId) {
      this.gateway.emitToUser(dto.userId, saved);
    }

    return saved;
  }

  /**
   * Find notifications with filters and pagination
   */
  async findAll(
    query: NotificationQueryDto,
    user: UserContext,
  ): Promise<PaginatedResult<NotificationDocument>> {
    const { category, type, isRead, search, page = 1, limit = 50, sortBy = "createdAt", sortOrder = "desc" } = query;

    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(user.tenantId),
      isDeleted: { $ne: true },
      $or: [
        { userId: new Types.ObjectId(user.id) },
        { userId: { $exists: false } },
        { userId: null },
      ],
    };

    if (category) {
      filter.category = category;
    }

    if (type) {
      filter.type = type;
    }

    if (typeof isRead === "boolean") {
      filter.isRead = isRead;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread notification count grouped by category
   */
  async findUnread(user: UserContext): Promise<UnreadCountResult> {
    const pipeline = [
      {
        $match: {
          tenantId: new Types.ObjectId(user.tenantId),
          isRead: false,
          isDeleted: { $ne: true },
          $or: [
            { userId: new Types.ObjectId(user.id) },
            { userId: { $exists: false } },
            { userId: null },
          ],
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.notificationModel.aggregate(pipeline);

    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const result of results) {
      byCategory[result._id] = result.count;
      total += result.count;
    }

    return { total, byCategory };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(
    notificationId: string,
    user: UserContext,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        tenantId: new Types.ObjectId(user.tenantId),
        $or: [
          { userId: new Types.ObjectId(user.id) },
          { userId: { $exists: false } },
          { userId: null },
        ],
      },
      {
        isRead: true,
        readAt: new Date(),
        readBy: new Types.ObjectId(user.id),
      },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    // Emit updated unread count
    const unreadCounts = await this.findUnread(user);
    this.gateway.emitUnreadCount(
      user.id,
      unreadCounts.total,
      unreadCounts.byCategory,
    );

    return notification;
  }

  /**
   * Mark all notifications as read (optionally filtered by category)
   */
  async markAllAsRead(
    user: UserContext,
    category?: NotificationCategory,
  ): Promise<number> {
    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(user.tenantId),
      isRead: false,
      isDeleted: { $ne: true },
      $or: [
        { userId: new Types.ObjectId(user.id) },
        { userId: { $exists: false } },
        { userId: null },
      ],
    };

    if (category) {
      filter.category = category;
    }

    const result = await this.notificationModel.updateMany(filter, {
      isRead: true,
      readAt: new Date(),
      readBy: new Types.ObjectId(user.id),
    });

    // Emit updated unread count
    const unreadCounts = await this.findUnread(user);
    this.gateway.emitUnreadCount(
      user.id,
      unreadCounts.total,
      unreadCounts.byCategory,
    );

    return result.modifiedCount;
  }

  /**
   * Soft delete a notification
   */
  async delete(notificationId: string, user: UserContext): Promise<void> {
    const result = await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        tenantId: new Types.ObjectId(user.tenantId),
        $or: [
          { userId: new Types.ObjectId(user.id) },
          { userId: { $exists: false } },
          { userId: null },
        ],
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
    );

    if (result.modifiedCount === 0) {
      throw new NotFoundException("Notification not found");
    }

    // Emit updated unread count
    const unreadCounts = await this.findUnread(user);
    this.gateway.emitUnreadCount(
      user.id,
      unreadCounts.total,
      unreadCounts.byCategory,
    );
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(
    userId: string,
    tenantId: string,
  ): Promise<UserDocument["notificationPreferences"]> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return (
      user.notificationPreferences || {
        enabled: true,
        categories: {
          sales: { inApp: true, email: true, whatsapp: false },
          inventory: { inApp: true, email: true, whatsapp: false },
          hr: { inApp: true, email: false, whatsapp: false },
          finance: { inApp: true, email: true, whatsapp: false },
          marketing: { inApp: true, email: false, whatsapp: false },
          system: { inApp: true, email: false, whatsapp: false },
        },
        soundEnabled: true,
      }
    );
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    tenantId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserDocument["notificationPreferences"]> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const currentPrefs = user.notificationPreferences || {
      enabled: true,
      categories: {
        sales: { inApp: true, email: true, whatsapp: false },
        inventory: { inApp: true, email: true, whatsapp: false },
        hr: { inApp: true, email: false, whatsapp: false },
        finance: { inApp: true, email: true, whatsapp: false },
        marketing: { inApp: true, email: false, whatsapp: false },
        system: { inApp: true, email: false, whatsapp: false },
      },
      soundEnabled: true,
    };

    const updatedPrefs = {
      enabled: dto.enabled ?? currentPrefs.enabled,
      categories: dto.categories
        ? { ...currentPrefs.categories, ...dto.categories }
        : currentPrefs.categories,
      soundEnabled: dto.soundEnabled ?? currentPrefs.soundEnabled,
    };

    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId), tenantId: new Types.ObjectId(tenantId) },
      { notificationPreferences: updatedPrefs },
    );

    return updatedPrefs;
  }

  /**
   * Check if user should receive notification on a specific channel
   */
  async shouldNotify(
    userId: string,
    tenantId: string,
    category: NotificationCategory,
    channel: "inApp" | "email" | "whatsapp",
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId, tenantId);

    if (!prefs.enabled) {
      return false;
    }

    const categoryPrefs = prefs.categories?.[category];
    if (!categoryPrefs) {
      return channel === "inApp"; // Default to in-app if no prefs
    }

    return categoryPrefs[channel] ?? false;
  }
}
