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
import { BillOfMaterialsService } from "./bill-of-materials.service";
import {
  CreateBillOfMaterialsDto,
  UpdateBillOfMaterialsDto,
  BillOfMaterialsQueryDto,
} from "../../dto/bill-of-materials.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { RequireModule } from "../../decorators/require-module.decorator";
import { Permissions } from "../../decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, TenantGuard, ModuleAccessGuard, PermissionsGuard)
@Controller("bill-of-materials")
export class BillOfMaterialsController {
  constructor(private readonly bomService: BillOfMaterialsService) {}

  @Post()
  async create(@Body() dto: CreateBillOfMaterialsDto, @Request() req) {
    const data = await this.bomService.create(dto, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: BillOfMaterialsQueryDto, @Request() req) {
    const result = await this.bomService.findAll(query, req.user);
    return { success: true, ...result };
  }

  @Get("by-product/:productId")
  async findByProduct(@Param("productId") productId: string, @Request() req) {
    const data = await this.bomService.findByProduct(productId, req.user);
    return { success: true, data };
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req) {
    const data = await this.bomService.findOne(id, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBillOfMaterialsDto,
    @Request() req,
  ) {
    const data = await this.bomService.update(id, dto, req.user);
    return { success: true, data };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.bomService.delete(id, req.user);
    return { success: true, message: "BOM eliminado correctamente" };
  }

  @Get(":id/cost")
  async calculateCost(@Param("id") id: string, @Request() req) {
    const cost = await this.bomService.calculateTotalMaterialCost(id, req.user);
    return { success: true, data: { cost } };
  }

  @Post(":id/check-availability")
  async checkAvailability(
    @Param("id") id: string,
    @Body("quantity") quantity: number,
    @Request() req,
  ) {
    const result = await this.bomService.checkComponentsAvailability(
      id,
      quantity,
      req.user,
    );
    return { success: true, data: result };
  }

  /**
   * Explosión recursiva de BOM multinivel
   * GET /bill-of-materials/:id/explode?quantity=100
   */
  @Get(":id/explode")
  async explodeBOM(
    @Param("id") id: string,
    @Query("quantity") quantity: string,
    @Request() req,
  ) {
    const quantityToProduce = parseFloat(quantity) || 1;
    const result = await this.bomService.explodeBOM(
      id,
      quantityToProduce,
      req.user,
    );
    return { success: true, data: result };
  }

  /**
   * Obtener estructura jerárquica de BOM en formato árbol
   * GET /bill-of-materials/:id/structure
   */
  @Get(":id/structure")
  async getBOMStructure(@Param("id") id: string, @Request() req) {
    const structure = await this.bomService.getBOMStructure(id, req.user);
    return { success: true, data: structure };
  }

  /**
   * Vista previa de una producción ligera (disponibilidad + costo estimado).
   * GET /bill-of-materials/:id/produce-preview?quantity=40
   */
  @Get(":id/produce-preview")
  @RequireModule("recipes")
  @Permissions("inventory_read")
  async producePreview(
    @Param("id") id: string,
    @Query("quantity") quantity: string,
    @Request() req,
  ) {
    const qty = parseFloat(quantity);
    const data = await this.bomService.previewProduction(id, qty, req.user);
    return { success: true, data };
  }

  /**
   * Producir un lote a partir de la receta: descuenta materias primas y
   * suma el producto terminado al inventario. Flujo ligero para elaboración propia.
   * POST /bill-of-materials/:id/produce  body: { quantity }
   */
  @Post(":id/produce")
  @RequireModule("recipes")
  @Permissions("inventory_update")
  async produce(
    @Param("id") id: string,
    @Body("quantity") quantity: number,
    @Request() req,
  ) {
    const data = await this.bomService.produceBatch(id, quantity, req.user);
    return { success: true, data };
  }
}
