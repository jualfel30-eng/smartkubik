import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Types } from "mongoose";
import { Public } from "../../decorators/public.decorator";
import { ServicesService } from "./services.service";

@ApiTags("Services Public")
@Controller("api/v1/public/services")
export class ServicesPublicController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Listar servicios activos de un tenant",
    description:
      "Endpoint público para obtener servicios disponibles para reservas (filtrados por categoría opcional).",
  })
  @ApiQuery({
    name: "tenantId",
    required: true,
    description: "ID del tenant dueño de los servicios",
    example: "64f27c6f2f1e8a0012345678",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filtrar por categoría",
    example: "Spa",
  })
  @ApiResponse({
    status: 200,
    description: "Servicios obtenidos correctamente",
  })
  async list(
    @Query("tenantId") tenantId: string,
    @Query("category") category?: string,
  ) {
    this.assertValidTenant(tenantId);
    const services = await this.servicesService.findAll(tenantId, {
      status: "active",
      category,
    });
    return {
      success: true,
      data: services,
    };
  }

  @Public()
  @Get("categories")
  @ApiOperation({
    summary: "Listar categorías de servicios",
    description:
      "Obtiene la lista de categorías disponibles para el tenant en el módulo de servicios.",
  })
  @ApiQuery({
    name: "tenantId",
    required: true,
    description: "ID del tenant",
    example: "64f27c6f2f1e8a0012345678",
  })
  async categories(@Query("tenantId") tenantId: string) {
    this.assertValidTenant(tenantId);
    const categories = await this.servicesService.getCategories(tenantId);
    return {
      success: true,
      data: categories,
    };
  }

  @Public()
  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de un servicio",
    description:
      "Devuelve información ampliada de un servicio específico habilitado para reservas públicas.",
  })
  @ApiParam({
    name: "id",
    description: "ID del servicio",
    example: "64f27c6f2f1e8a0098765432",
  })
  @ApiQuery({
    name: "tenantId",
    required: true,
    description: "ID del tenant al que pertenece el servicio",
    example: "64f27c6f2f1e8a0012345678",
  })
  async detail(@Param("id") id: string, @Query("tenantId") tenantId: string) {
    this.assertValidTenant(tenantId);
    const service = await this.servicesService.findOne(tenantId, id);
    return {
      success: true,
      data: service,
    };
  }

  private assertValidTenant(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException("El parámetro tenantId es requerido");
    }

    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("El tenantId proporcionado no es válido");
    }
  }
}
