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
import { ProductionVersionService } from "./production-version.service";
import {
  CreateProductionVersionDto,
  UpdateProductionVersionDto,
  ProductionVersionQueryDto,
} from "../../dto/production-version.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("production-versions")
export class ProductionVersionController {
  constructor(private readonly pvService: ProductionVersionService) {}

  @Post()
  async create(@Body() dto: CreateProductionVersionDto, @Request() req) {
    const data = await this.pvService.create(dto, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: ProductionVersionQueryDto, @Request() req) {
    const result = await this.pvService.findAll(query, req.user);
    return { success: true, ...result };
  }

  @Get("by-product/:productId/default")
  async getDefaultVersion(
    @Param("productId") productId: string,
    @Request() req,
  ) {
    const data = await this.pvService.getDefaultVersion(productId, req.user);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.pvService.findOne(id, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProductionVersionDto,
    @Request() req,
  ) {
    const data = await this.pvService.update(id, dto, req.user);
    return { success: true, data };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.pvService.delete(id, req.user);
    return {
      success: true,
      message: "Production Version eliminada correctamente",
    };
  }
}
