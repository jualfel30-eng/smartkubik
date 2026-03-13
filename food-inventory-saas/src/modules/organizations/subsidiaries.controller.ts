import {
  Controller,
  Get,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { OrganizationsService } from "./organizations.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";

@Controller("organizations/subsidiaries")
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubsidiariesController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  /**
   * GET /organizations/subsidiaries
   * List all subsidiary tenants for the current tenant (must be a parent)
   */
  @Get()
  async getSubsidiaries(@Request() req) {
    const tenantId = req.user.tenantId;

    // Check if current tenant is a parent or a subsidiary
    const currentTenant = await this.tenantModel
      .findById(tenantId)
      .lean()
      .exec();

    if (!currentTenant) {
      return { data: [], isParent: false, parentTenant: null };
    }

    // If current tenant is a subsidiary, return info about the parent and siblings
    if (currentTenant.parentTenantId) {
      const parentTenant = await this.tenantModel
        .findById(currentTenant.parentTenantId)
        .select("name contactInfo")
        .lean()
        .exec();

      const siblings = await this.organizationsService.findSubsidiaries(
        currentTenant.parentTenantId.toString(),
      );

      return {
        data: siblings,
        isParent: false,
        isSubsidiary: true,
        parentTenant: parentTenant
          ? { _id: parentTenant._id, name: parentTenant.name }
          : null,
      };
    }

    // Current tenant is a parent — list its children
    const subsidiaries =
      await this.organizationsService.findSubsidiaries(tenantId);

    return {
      data: subsidiaries,
      isParent: subsidiaries.length > 0,
      isSubsidiary: false,
      parentTenant: null,
    };
  }

  /**
   * GET /organizations/subsidiaries/dashboard
   * Consolidated dashboard across all subsidiaries (parent tenant only)
   */
  @Get("dashboard")
  async getConsolidatedDashboard(@Request() req) {
    const tenantId = req.user.tenantId;

    // Get all tenant IDs in this family
    const familyIds =
      await this.organizationsService.getFamilyTenantIds(tenantId);

    if (familyIds.length <= 1) {
      return {
        data: null,
        message: "No subsidiaries found for consolidated dashboard",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get per-subsidiary breakdown
    const perSubsidiary: Array<{
      tenantId: Types.ObjectId;
      name: string;
      isSubsidiary: boolean;
      ordersToday: number;
      salesToday: number;
      productsInStock: number;
    }> = [];

    for (const tid of familyIds) {
      const tenant = await this.tenantModel
        .findById(tid)
        .select("name isSubsidiary")
        .lean()
        .exec();

      if (!tenant) continue;

      const tenantIdStr = tid.toString();

      const [ordersToday, salesTodayResult, productsInStock] =
        await Promise.all([
          this.orderModel.countDocuments({
            tenantId: tenantIdStr,
            createdAt: { $gte: today, $lt: tomorrow },
          }),
          this.orderModel.aggregate([
            {
              $match: {
                tenantId: tenantIdStr,
                paymentStatus: { $in: ["paid", "overpaid", "partial"] },
                createdAt: { $gte: today, $lt: tomorrow },
              },
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ]),
          this.inventoryModel
            .distinct("productId", {
              tenantId: tid,
              totalQuantity: { $gt: 0 },
              isActive: true,
            })
            .then((ids) => ids.length),
        ]);

      perSubsidiary.push({
        tenantId: tid,
        name: tenant.name,
        isSubsidiary: tenant.isSubsidiary || false,
        ordersToday,
        salesToday:
          salesTodayResult.length > 0 ? salesTodayResult[0].total : 0,
        productsInStock,
      });
    }

    // Calculate totals
    const totals = { ordersToday: 0, salesToday: 0, productsInStock: 0 };
    for (const s of perSubsidiary) {
      totals.ordersToday += s.ordersToday;
      totals.salesToday += s.salesToday;
      totals.productsInStock += s.productsInStock;
    }

    return {
      data: {
        totals,
        subsidiaries: perSubsidiary,
        familySize: familyIds.length,
      },
    };
  }
}
