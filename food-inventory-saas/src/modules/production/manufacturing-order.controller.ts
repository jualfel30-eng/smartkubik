import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ManufacturingOrderService } from "./manufacturing-order.service";
import {
  CreateManufacturingOrderDto,
  UpdateManufacturingOrderDto,
  ManufacturingOrderQueryDto,
  ConfirmManufacturingOrderDto,
} from "../../dto/manufacturing-order.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("manufacturing-orders")
export class ManufacturingOrderController {
  constructor(private readonly moService: ManufacturingOrderService) {}

  @Post()
  async create(@Body() dto: CreateManufacturingOrderDto, @Request() req) {
    const data = await this.moService.create(dto, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: ManufacturingOrderQueryDto, @Request() req) {
    const result = await this.moService.findAll(query, req.user);
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.moService.findOne(id, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateManufacturingOrderDto,
    @Request() req,
  ) {
    const data = await this.moService.update(id, dto, req.user);
    return { success: true, data };
  }

  @Post(":id/confirm")
  async confirm(
    @Param("id") id: string,
    @Body() dto: ConfirmManufacturingOrderDto,
    @Request() req,
  ) {
    const data = await this.moService.confirm(id, dto, req.user);
    return { success: true, data };
  }

  @Post(":id/start")
  async start(@Param("id") id: string, @Request() req) {
    const data = await this.moService.start(id, req.user);
    return { success: true, data };
  }

  @Post(":id/complete")
  async complete(@Param("id") id: string, @Request() req) {
    const data = await this.moService.complete(id, req.user);
    return { success: true, data };
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Request() req) {
    const data = await this.moService.cancel(id, req.user);
    return { success: true, data };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.moService.delete(id, req.user);
    return {
      success: true,
      message: "Orden de manufactura eliminada correctamente",
    };
  }
}
