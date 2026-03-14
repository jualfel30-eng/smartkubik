import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { OrganizationsService } from "./organizations.service";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
} from "../../dto/organization.dto";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  @Post()
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req,
  ) {
    return this.organizationsService.create(
      createOrganizationDto,
      req.user.userId,
    );
  }

  @Get()
  async findAll(@Request() req) {
    return this.organizationsService.findAllByUser(req.user.userId);
  }

  /**
   * GET /organizations/subsidiaries
   * List all subsidiary tenants for the current tenant (must be a parent)
   * IMPORTANT: Must be before @Get(":id") to avoid route conflict
   */
  @Get("subsidiaries")
  @UseGuards(TenantGuard)
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
          ? { _id: parentTenant._id.toString(), name: parentTenant.name }
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
   * IMPORTANT: Must be before @Get(":id") to avoid route conflict
   */
  @Get("subsidiaries/dashboard")
  @UseGuards(TenantGuard)
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
      tenantId: string;
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
        tenantId: tid.toString(),
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

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    return this.organizationsService.findOne(id, req.user.userId);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Request() req,
  ) {
    return this.organizationsService.update(
      id,
      updateOrganizationDto,
      req.user.userId,
    );
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Request() req) {
    await this.organizationsService.remove(id, req.user.userId);
    return { message: "Organization deleted successfully" };
  }

  @Post(":id/members")
  async addMember(
    @Param("id") id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req,
  ) {
    return this.organizationsService.addMember(
      id,
      addMemberDto,
      req.user.userId,
    );
  }

  @Delete(":id/members/:userId")
  async removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Request() req,
  ) {
    return this.organizationsService.removeMember(id, userId, req.user.userId);
  }
}
