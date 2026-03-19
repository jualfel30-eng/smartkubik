import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { TransferOrdersService } from "./transfer-orders.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import {
  CreateTransferOrderDto,
  CreateTransferRequestDto,
  UpdateTransferOrderDto,
  ApproveTransferOrderDto,
  ApproveRequestDto,
  RejectRequestDto,
  PrepareTransferOrderDto,
  ShipTransferOrderDto,
  ReceiveTransferOrderDto,
  ReportDiscrepancyDto,
  CancelTransferOrderDto,
  TransferOrderFilterDto,
} from "../../dto/transfer-order.dto";

@Controller("transfer-orders")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TransferOrdersController {
  constructor(
    private readonly transferOrdersService: TransferOrdersService,
  ) {}

  @Get()
  @Permissions("transfer_orders_read")
  async findAll(@Request() req, @Query() filters: TransferOrderFilterDto) {
    return this.transferOrdersService.findAll(req.user.tenantId, filters);
  }

  @Get(":id")
  @Permissions("transfer_orders_read")
  async findById(@Param("id") id: string, @Request() req) {
    return this.transferOrdersService.findById(id, req.user.tenantId);
  }

  @Post()
  @Permissions("transfer_orders_write")
  async create(@Body() dto: CreateTransferOrderDto, @Request() req) {
    return this.transferOrdersService.create(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Patch(":id")
  @Permissions("transfer_orders_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTransferOrderDto,
    @Request() req,
  ) {
    return this.transferOrdersService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/request")
  @Permissions("transfer_orders_write")
  async request(@Param("id") id: string, @Request() req) {
    return this.transferOrdersService.request(
      id,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/approve")
  @Permissions("transfer_orders_approve")
  async approve(
    @Param("id") id: string,
    @Body() dto: ApproveTransferOrderDto,
    @Request() req,
  ) {
    return this.transferOrdersService.approve(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  // ─── PULL Flow Endpoints ────────────────────────────────

  @Post("requests")
  @Permissions("transfer_orders_write")
  async createRequest(@Body() dto: CreateTransferRequestDto, @Request() req) {
    return this.transferOrdersService.createRequest(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/submit")
  @Permissions("transfer_orders_write")
  async submitRequest(@Param("id") id: string, @Request() req) {
    return this.transferOrdersService.submitRequest(
      id,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/approve-request")
  @Permissions("transfer_orders_approve")
  async approveRequest(
    @Param("id") id: string,
    @Body() dto: ApproveRequestDto,
    @Request() req,
  ) {
    return this.transferOrdersService.approveRequest(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/reject-request")
  @Permissions("transfer_orders_approve")
  async rejectRequest(
    @Param("id") id: string,
    @Body() dto: RejectRequestDto,
    @Request() req,
  ) {
    return this.transferOrdersService.rejectRequest(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/prepare")
  @Permissions("transfer_orders_write")
  async markAsInPreparation(
    @Param("id") id: string,
    @Body() dto: PrepareTransferOrderDto,
    @Request() req,
  ) {
    return this.transferOrdersService.markAsInPreparation(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/ship")
  @Permissions("transfer_orders_write")
  async ship(
    @Param("id") id: string,
    @Body() dto: ShipTransferOrderDto,
    @Request() req,
  ) {
    return this.transferOrdersService.ship(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/receive")
  @Permissions("transfer_orders_write")
  async receive(
    @Param("id") id: string,
    @Body() dto: ReceiveTransferOrderDto,
    @Request() req,
  ) {
    return this.transferOrdersService.receive(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/report-discrepancy")
  @Permissions("transfer_orders_write")
  async reportDiscrepancy(
    @Param("id") id: string,
    @Body() dto: ReportDiscrepancyDto,
    @Request() req,
  ) {
    return this.transferOrdersService.reportDiscrepancy(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Post(":id/cancel")
  @Permissions("transfer_orders_write")
  async cancel(
    @Param("id") id: string,
    @Body() dto: CancelTransferOrderDto,
    @Request() req,
  ) {
    return this.transferOrdersService.cancel(
      id,
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(":id")
  @Permissions("transfer_orders_write")
  async delete(@Param("id") id: string, @Request() req) {
    await this.transferOrdersService.softDelete(id, req.user.tenantId);
    return { message: "Orden de transferencia eliminada exitosamente." };
  }
}
