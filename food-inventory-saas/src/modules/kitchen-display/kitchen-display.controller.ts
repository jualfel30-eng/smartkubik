import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { KitchenDisplayService } from "./kitchen-display.service";
import {
  CreateKitchenOrderDto,
  UpdateItemStatusDto,
  BumpOrderDto,
  MarkUrgentDto,
  AssignCookDto,
  FilterKitchenOrdersDto,
  CancelKitchenOrderDto,
  ReopenKitchenOrderDto,
} from "../../dto/kitchen-order.dto";

/**
 * Kitchen Display System (KDS) Controller
 * Gestión de órdenes en cocina con tracking en tiempo real
 */
@Controller("kitchen-display")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class KitchenDisplayController {
  constructor(private readonly kitchenDisplayService: KitchenDisplayService) { }

  /**
   * Crear orden de cocina desde una Order confirmada
   * POST /kitchen-display/create
   */
  @Post("create")
  @Permissions("restaurant_write", "orders_write")
  async createKitchenOrder(
    @Body() dto: CreateKitchenOrderDto,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.createFromOrder(dto, tenantId);
  }

  /**
   * Obtener todas las órdenes activas con filtros
   * GET /kitchen-display/active?status=preparing&station=grill&priority=urgent
   */
  @Get("active")
  @Permissions("restaurant_read")
  async getActiveOrders(
    @Query() filters: FilterKitchenOrdersDto,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.findActive(filters, tenantId);
  }

  /**
   * Actualizar estado de un item específico
   * PATCH /kitchen-display/item-status
   */
  @Patch("item-status")
  @Permissions("restaurant_write")
  async updateItemStatus(
    @Body() dto: UpdateItemStatusDto,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.updateItemStatus(dto, tenantId);
  }

  /**
   * Bump order (marcar como completada y lista para servir)
   * POST /kitchen-display/bump
   */
  @Post("bump")
  @Permissions("restaurant_write")
  async bumpOrder(@Body() dto: BumpOrderDto, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.bumpOrder(dto, tenantId);
  }

  /**
   * Marcar/desmarcar orden como urgente
   * PATCH /kitchen-display/urgent
   */
  @Patch("urgent")
  @Permissions("restaurant_write")
  async markUrgent(@Body() dto: MarkUrgentDto, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.markUrgent(dto, tenantId);
  }

  /**
   * Asignar orden a un cocinero específico
   * PATCH /kitchen-display/assign-cook
   */
  @Patch("assign-cook")
  @Permissions("restaurant_write")
  async assignCook(@Body() dto: AssignCookDto, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.assignCook(dto, tenantId);
  }

  /**
   * Cancelar orden de cocina
   * POST /kitchen-display/cancel
   */
  @Post("cancel")
  @Permissions("restaurant_write")
  async cancelOrder(@Body() dto: CancelKitchenOrderDto, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.cancel(dto, tenantId);
  }

  /**
   * Reabrir orden (si se bumpeó por error)
   * POST /kitchen-display/reopen
   */
  @Post("reopen")
  @Permissions("restaurant_write")
  async reopenOrder(@Body() dto: ReopenKitchenOrderDto, @Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.reopen(dto, tenantId);
  }

  /**
   * Obtener estadísticas del día
   * GET /kitchen-display/stats
   */
  @Get("stats")
  @Permissions("restaurant_read")
  async getStats(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.getStats(tenantId);
  }

  /**
   * Manually sync new items to kitchen (send only new items)
   * POST /kitchen-display/send-new-items
   */
  @Post("send-new-items")
  @Permissions("restaurant_write", "orders_write")
  async sendNewItemsToKitchen(
    @Body() body: { orderId: string },
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.syncWithOrder(body.orderId, tenantId);
  }

  /**
   * Send a SINGLE specific item to kitchen
   * POST /kitchen-display/send-single-item
   */
  @Post("send-single-item")
  @Permissions("restaurant_write", "orders_write")
  async sendSingleItemToKitchen(
    @Body() body: { orderId: string; itemId: string; productName: string; quantity: number; modifiers?: string[]; specialInstructions?: string },
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.kitchenDisplayService.addSingleItemToKitchen(body, tenantId);
  }
}
