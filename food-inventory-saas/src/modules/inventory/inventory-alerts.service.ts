import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  InventoryAlertRule,
  InventoryAlertRuleDocument,
} from "../../schemas/inventory-alert-rule.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { CreateInventoryAlertRuleDto, UpdateInventoryAlertRuleDto } from "./dto/inventory-alert-rule.dto";
import { EventsService } from "../events/events.service";

@Injectable()
export class InventoryAlertsService {
  constructor(
    @InjectModel(InventoryAlertRule.name)
    private readonly alertRuleModel: Model<InventoryAlertRuleDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    private readonly eventsService: EventsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private toObjectId(id: string) {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
  }

  async createRule(dto: CreateInventoryAlertRuleDto, user: any) {
    const tenantId = this.toObjectId(user.tenantId);

    const existing = await this.alertRuleModel.findOne({
      tenantId,
      productId: this.toObjectId(dto.productId),
      warehouseId: dto.warehouseId ? this.toObjectId(dto.warehouseId) : { $exists: false },
      isDeleted: false,
    });
    if (existing) {
      throw new BadRequestException("Ya existe una regla para este producto/almacén.");
    }

    const rule = new this.alertRuleModel({
      ...dto,
      productId: this.toObjectId(dto.productId),
      warehouseId: dto.warehouseId ? this.toObjectId(dto.warehouseId) : undefined,
      tenantId,
      createdBy: this.toObjectId(user.id),
    });
    return rule.save();
  }

  async updateRule(id: string, dto: UpdateInventoryAlertRuleDto, user: any) {
    const rule = await this.alertRuleModel.findOne({
      _id: id,
      tenantId: this.toObjectId(user.tenantId),
      isDeleted: false,
    });
    if (!rule) {
      throw new NotFoundException("Regla de alerta no encontrada.");
    }

    if (dto.productId) rule.productId = this.toObjectId(dto.productId) as any;
    if (dto.warehouseId !== undefined) {
      rule.warehouseId = dto.warehouseId ? (this.toObjectId(dto.warehouseId) as any) : undefined;
    }
    if (dto.minQuantity !== undefined) rule.minQuantity = dto.minQuantity;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.channels) rule.channels = dto.channels;
    rule.updatedBy = this.toObjectId(user.id) as any;

    return rule.save();
  }

  async deleteRule(id: string, user: any) {
    const rule = await this.alertRuleModel.findOne({
      _id: id,
      tenantId: this.toObjectId(user.tenantId),
      isDeleted: false,
    });
    if (!rule) {
      throw new NotFoundException("Regla de alerta no encontrada.");
    }
    rule.isDeleted = true;
    rule.isActive = false;
    rule.lastTriggeredAt = undefined;
    rule.updatedBy = this.toObjectId(user.id) as any;
    return rule.save();
  }

  async listRules(
    filters: { productId?: string; warehouseId?: string; isActive?: boolean; page?: number; limit?: number },
    user: any,
  ) {
    const query: any = {
      tenantId: this.toObjectId(user.tenantId),
      isDeleted: false,
    };
    if (filters.productId) query.productId = this.toObjectId(filters.productId);
    if (filters.warehouseId) {
      query.$or = [
        { warehouseId: this.toObjectId(filters.warehouseId) },
        { warehouseId: null },
        { warehouseId: { $exists: false } },
      ];
    }
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const limit = Math.min(filters.limit || 50, 200);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.alertRuleModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.alertRuleModel.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, pagination: { page, limit, total, totalPages } };
  }

  /**
   * Evalúa las reglas de alerta para un inventario y dispara notificaciones si cruza el umbral.
   * Evita spam re-evaluando solo si han pasado 6h desde el último disparo.
   */
  async evaluateForInventory(
    inventory: InventoryDocument,
    user: { id: string; tenantId: string },
  ): Promise<number> {
    const tenantId = this.toObjectId(user.tenantId);
    const now = new Date();

    const rules = await this.alertRuleModel.find({
      tenantId,
      productId: inventory.productId,
      isActive: true,
      isDeleted: false,
      $or: [
        { warehouseId: inventory.warehouseId },
        { warehouseId: null },
        { warehouseId: { $exists: false } },
      ],
    });

    let triggered = 0;
    for (const rule of rules) {
      const recentlyTriggered =
        rule.lastTriggeredAt &&
        now.getTime() - rule.lastTriggeredAt.getTime() < 6 * 60 * 60 * 1000;

      if (inventory.availableQuantity <= rule.minQuantity && !recentlyTriggered) {
        await this.eventsService.createFromInventoryAlert(
          {
            productName: inventory.productName,
            alertType: "low_stock",
            currentStock: inventory.availableQuantity,
            minimumStock: rule.minQuantity,
          },
          user,
        );

        // Emit event for notification center
        this.eventEmitter.emit("inventory.alert.triggered", {
          productName: inventory.productName,
          productId: inventory.productId?.toString() || inventory._id.toString(),
          alertType: "low_stock",
          currentStock: inventory.availableQuantity,
          minimumStock: rule.minQuantity,
          tenantId: user.tenantId,
        });

        rule.lastTriggeredAt = now;
        await rule.save();
        triggered += 1;
      }
    }

    if (triggered > 0) {
      await this.inventoryModel.updateOne(
        { _id: inventory._id },
        {
          $set: {
            "alerts.lowStock": true,
            "alerts.lastAlertSent": now,
          },
        },
      );
    }

    return triggered;
  }
}
