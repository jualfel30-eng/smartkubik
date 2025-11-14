import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { UnitConversionsService } from "./unit-conversions.service";
import {
  CreateUnitConversionDto,
  UpdateUnitConversionDto,
  UnitConversionQueryDto,
} from "../../dto/unit-conversion.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

/**
 * DTO para el endpoint de conversión de unidades
 */
export class ConvertUnitDto {
  value: number;
  fromUnit: string;
  toUnit: string;
  productId: string;
}

@ApiTags("Unit Conversions")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("unit-conversions")
export class UnitConversionsController {
  constructor(
    private readonly unitConversionsService: UnitConversionsService,
  ) {}

  /**
   * Crear nueva configuración de conversión de unidades
   */
  @Post()
  @Permissions("products_create")
  @ApiOperation({ summary: "Crear configuración de unidades para un producto" })
  @ApiResponse({
    status: 201,
    description: "Configuración creada exitosamente",
  })
  async create(@Body() createDto: CreateUnitConversionDto, @Request() req) {
    const config = await this.unitConversionsService.create(
      createDto,
      req.user,
    );
    return { success: true, data: config };
  }

  /**
   * Listar configuraciones con paginación y filtros
   */
  @Get()
  @Permissions("products_read")
  @ApiOperation({ summary: "Listar configuraciones de unidades" })
  @ApiResponse({
    status: 200,
    description: "Lista de configuraciones obtenida exitosamente",
  })
  async findAll(@Query() query: UnitConversionQueryDto, @Request() req) {
    const result = await this.unitConversionsService.findAll(
      query,
      req.user.tenantId,
    );
    return {
      success: true,
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * Obtener configuración por ID de producto
   */
  @Get("by-product/:productId")
  @Permissions("products_read")
  @ApiOperation({
    summary: "Obtener configuración de unidades por ID de producto",
  })
  @ApiResponse({ status: 200, description: "Configuración encontrada" })
  @ApiResponse({ status: 404, description: "Configuración no encontrada" })
  async findByProductId(@Param("productId") productId: string, @Request() req) {
    const config = await this.unitConversionsService.findByProductId(
      productId,
      req.user.tenantId,
    );
    return { success: true, data: config };
  }

  /**
   * Convertir valor entre unidades
   */
  @Post("convert")
  @Permissions("products_read")
  @ApiOperation({ summary: "Convertir un valor entre unidades" })
  @ApiResponse({ status: 200, description: "Conversión exitosa" })
  async convert(@Body() convertDto: ConvertUnitDto, @Request() req) {
    const result = await this.unitConversionsService.convert(
      convertDto.value,
      convertDto.fromUnit,
      convertDto.toUnit,
      convertDto.productId,
      req.user.tenantId,
    );
    return {
      success: true,
      data: {
        originalValue: convertDto.value,
        originalUnit: convertDto.fromUnit,
        convertedValue: result,
        convertedUnit: convertDto.toUnit,
      },
    };
  }

  /**
   * Obtener configuración por ID
   */
  @Get(":id")
  @Permissions("products_read")
  @ApiOperation({ summary: "Obtener configuración de unidades por ID" })
  @ApiResponse({ status: 200, description: "Configuración encontrada" })
  @ApiResponse({ status: 404, description: "Configuración no encontrada" })
  async findOne(@Param("id") id: string, @Request() req) {
    const config = await this.unitConversionsService.findOne(
      id,
      req.user.tenantId,
    );
    return { success: true, data: config };
  }

  /**
   * Actualizar configuración
   */
  @Patch(":id")
  @Permissions("products_update")
  @ApiOperation({ summary: "Actualizar configuración de unidades" })
  @ApiResponse({
    status: 200,
    description: "Configuración actualizada exitosamente",
  })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateUnitConversionDto,
    @Request() req,
  ) {
    const config = await this.unitConversionsService.update(
      id,
      updateDto,
      req.user,
    );
    return { success: true, data: config };
  }

  /**
   * Eliminar configuración
   */
  @Delete(":id")
  @Permissions("products_delete")
  @ApiOperation({ summary: "Eliminar configuración de unidades" })
  @ApiResponse({
    status: 200,
    description: "Configuración eliminada exitosamente",
  })
  async remove(@Param("id") id: string, @Request() req) {
    const result = await this.unitConversionsService.remove(
      id,
      req.user.tenantId,
    );
    return { success: true, data: result };
  }
}
