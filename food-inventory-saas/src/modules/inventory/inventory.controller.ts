import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Delete,
  Patch,
  Res,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Response } from "express";
import { InventoryService } from "./inventory.service";
import { InventoryReceiptPdfService } from "./inventory-receipt-pdf.service";
import {
  CreateInventoryDto,
  InventoryMovementDto,
  ReserveInventoryDto,
  ReleaseInventoryDto,
  AdjustInventoryDto,
  InventoryQueryDto,
  InventoryMovementQueryDto,
  UpdateInventoryLotsDto,
} from "../../dto/inventory.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { BulkAdjustInventoryDto } from "./dto/bulk-adjust-inventory.dto";

@ApiTags("inventory")
@Controller("inventory")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryReceiptPdfService: InventoryReceiptPdfService,
  ) { }

  @Post()
  @Permissions("inventory_create")
  @ApiOperation({ summary: "Crear registro de inventario inicial" })
  @ApiResponse({ status: 201, description: "Inventario creado exitosamente" })
  async create(@Body() createInventoryDto: CreateInventoryDto, @Request() req) {
    try {
      const inventory = await this.inventoryService.create(
        createInventoryDto,
        req.user,
      );
      return {
        success: true,
        message: "Inventario creado exitosamente",
        data: inventory,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear el inventario",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(":id")
  @Permissions("inventory_delete")
  @ApiOperation({ summary: "Eliminar (desactivar) un inventario" })
  @ApiResponse({
    status: 200,
    description: "Inventario eliminado lógicamente",
  })
  async remove(@Param("id") id: string, @Request() req) {
    try {
      const removed = await this.inventoryService.remove(
        id,
        req.user.tenantId,
        req.user,
      );
      if (!removed) {
        throw new HttpException(
          "Inventario no encontrado",
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: "Inventario eliminado correctamente",
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al eliminar el inventario",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener lista de inventario con filtros" })
  @ApiResponse({ status: 200, description: "Inventario obtenido exitosamente" })
  async findAll(@Query() query: InventoryQueryDto, @Request() req) {
    try {
      const result = await this.inventoryService.findAll(
        query,
        req.user.tenantId,
      );
      return {
        success: true,
        message: "Inventario obtenido exitosamente",
        data: result.inventory,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener el inventario",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("stock-summary")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Resumen de stock por producto y almacén" })
  async stockSummary(
    @Query("productIds") productIds: string,
    @Request() req,
  ) {
    const ids =
      productIds && productIds.length > 0
        ? productIds.split(",").map((id) => id.trim()).filter(Boolean)
        : undefined;
    const data = await this.inventoryService.getStockByProduct(
      req.user.tenantId,
      ids,
    );
    return { success: true, data };
  }

  @Get(":id")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener inventario por ID" })
  @ApiResponse({ status: 200, description: "Inventario obtenido exitosamente" })
  async findOne(@Param("id") id: string, @Request() req) {
    try {
      const inventory = await this.inventoryService.findOne(
        id,
        req.user.tenantId,
      );
      if (!inventory) {
        throw new HttpException(
          "Inventario no encontrado",
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: "Inventario obtenido exitosamente",
        data: inventory,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al obtener el inventario",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("product/:productSku")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener inventario por SKU de producto" })
  @ApiResponse({ status: 200, description: "Inventario obtenido exitosamente" })
  async findByProductSku(
    @Param("productSku") productSku: string,
    @Request() req,
  ) {
    try {
      const inventory = await this.inventoryService.findByProductSku(
        productSku,
        req.user.tenantId,
      );
      if (!inventory) {
        throw new HttpException(
          "Inventario no encontrado",
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        success: true,
        message: "Inventario obtenido exitosamente",
        data: inventory,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al obtener el inventario",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("movements")
  @Permissions("inventory_create")
  @ApiOperation({ summary: "Registrar movimiento de inventario" })
  @ApiResponse({
    status: 201,
    description: "Movimiento registrado exitosamente",
  })
  async createMovement(
    @Body() movementDto: InventoryMovementDto,
    @Request() req,
  ) {
    try {
      const movement = await this.inventoryService.createMovement(
        movementDto,
        req.user,
      );
      return {
        success: true,
        message: "Movimiento registrado exitosamente",
        data: movement,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al registrar el movimiento",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("movements/history")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener historial de movimientos" })
  @ApiResponse({ status: 200, description: "Historial obtenido exitosamente" })
  async getMovements(
    @Query() query: InventoryMovementQueryDto,
    @Request() req,
  ) {
    try {
      const result = await this.inventoryService.getMovements(
        query,
        req.user.tenantId,
      );
      return {
        success: true,
        message: "Historial obtenido exitosamente",
        data: result.movements,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener el historial",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("reserve")
  @Permissions("inventory_update")
  @ApiOperation({ summary: "Reservar inventario para una orden" })
  @ApiResponse({
    status: 200,
    description: "Inventario reservado exitosamente",
  })
  async reserveInventory(
    @Body() reserveDto: ReserveInventoryDto,
    @Request() req,
  ) {
    try {
      const result = await this.inventoryService.reserveInventory(
        reserveDto,
        req.user,
      );
      return {
        success: true,
        message: "Inventario reservado exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al reservar el inventario",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("release")
  @Permissions("inventory_update")
  @ApiOperation({ summary: "Liberar reserva de inventario" })
  @ApiResponse({ status: 200, description: "Reserva liberada exitosamente" })
  async releaseInventory(
    @Body() releaseDto: ReleaseInventoryDto,
    @Request() req,
  ) {
    try {
      const result = await this.inventoryService.releaseInventory(
        releaseDto,
        req.user,
      );
      return {
        success: true,
        message: "Reserva liberada exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al liberar la reserva",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("adjust")
  @Permissions("inventory_update")
  @ApiOperation({ summary: "Ajustar inventario manualmente" })
  @ApiResponse({ status: 200, description: "Inventario ajustado exitosamente" })
  async adjustInventory(@Body() adjustDto: AdjustInventoryDto, @Request() req) {
    try {
      const result = await this.inventoryService.adjustInventory(
        adjustDto,
        req.user,
      );
      return {
        success: true,
        message: "Inventario ajustado exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al ajustar el inventario",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("bulk-adjust")
  @Permissions("inventory_update")
  @ApiOperation({ summary: "Ajustar inventario masivamente desde archivo" })
  @ApiResponse({ status: 200, description: "Inventario ajustado exitosamente" })
  async bulkAdjustInventory(
    @Body() bulkAdjustDto: BulkAdjustInventoryDto,
    @Request() req,
  ) {
    try {
      const result = await this.inventoryService.bulkAdjustInventory(
        bulkAdjustDto,
        req.user,
      );
      return {
        success: true,
        message: "Inventario ajustado masivamente exitosamente",
        data: result,
      };
    } catch (error) {
      console.error("BULK_ADJUST_ERROR_CAUGHT_IN_CONTROLLER:", error);
      throw new HttpException(
        error.message || "Error al ajustar el inventario masivamente",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("alerts/low-stock")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener alertas de stock bajo" })
  @ApiResponse({ status: 200, description: "Alertas obtenidas exitosamente" })
  async getLowStockAlerts(@Request() req) {
    try {
      const alerts = await this.inventoryService.getLowStockAlerts(
        req.user.tenantId,
      );
      return {
        success: true,
        message: "Alertas obtenidas exitosamente",
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener las alertas",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("alerts/near-expiration")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener alertas de productos próximos a vencer" })
  @ApiResponse({ status: 200, description: "Alertas obtenidas exitosamente" })
  async getExpirationAlerts(@Request() req, @Query("days") days: number = 7) {
    try {
      const alerts = await this.inventoryService.getExpirationAlerts(
        req.user.tenantId,
        days,
      );
      return {
        success: true,
        message: "Alertas obtenidas exitosamente",
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener las alertas",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("reports/summary")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Obtener resumen de inventario" })
  @ApiResponse({ status: 200, description: "Resumen obtenido exitosamente" })
  async getInventorySummary(@Request() req) {
    try {
      const summary = await this.inventoryService.getInventorySummary(
        req.user.tenantId,
      );
      return {
        success: true,
        message: "Resumen obtenido exitosamente",
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener el resumen",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id/lots")
  @Permissions("inventory_update")
  @ApiOperation({ summary: "Actualizar lotes de inventario" })
  @ApiResponse({ status: 200, description: "Lotes actualizados exitosamente" })
  async updateLots(
    @Param("id") id: string,
    @Body() updateLotsDto: UpdateInventoryLotsDto,
    @Request() req,
  ) {
    try {
      const result = await this.inventoryService.updateLots(
        id,
        updateLotsDto,
        req.user,
      );
      return {
        success: true,
        message: "Lotes actualizados exitosamente",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar los lotes",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("movements/:id/receipt")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Generar PDF de recibo de movimiento de inventario" })
  @ApiResponse({ status: 200, description: "PDF generado exitosamente" })
  async generateMovementReceipt(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    try {
      const pdfBuffer = await this.inventoryReceiptPdfService.generateReceipt(id);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=recibo-inventario-${id}.pdf`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al generar el PDF",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
