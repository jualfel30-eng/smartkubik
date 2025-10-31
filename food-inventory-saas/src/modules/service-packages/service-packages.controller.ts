import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { ModuleAccessGuard } from "../../guards/module-access.guard";
import { RequireModule } from "../../decorators/require-module.decorator";
import { ServicePackagesService } from "./service-packages.service";
import { CreateServicePackageDto } from "./dto/create-service-package.dto";
import { UpdateServicePackageDto } from "./dto/update-service-package.dto";
import { PackageAvailabilityDto } from "./dto/package-availability.dto";
import { PackagePricingDto } from "./dto/package-pricing.dto";

@ApiTags("Service Packages")
@ApiBearerAuth()
@Controller("service-packages")
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule("servicePackages")
export class ServicePackagesController {
  constructor(private readonly servicePackagesService: ServicePackagesService) {}

  @Post()
  @ApiOperation({ summary: "Crear un paquete de servicios" })
  create(@Request() req, @Body() dto: CreateServicePackageDto) {
    return this.servicePackagesService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Listar paquetes" })
  findAll(@Request() req) {
    return this.servicePackagesService.findAll(req.user.tenantId);
  }

  @Get("active")
  @ApiOperation({ summary: "Listar paquetes activos" })
  findActive(@Request() req) {
    return this.servicePackagesService.findActive(req.user.tenantId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener paquete" })
  findOne(@Request() req, @Param("id") id: string) {
    return this.servicePackagesService.findOne(req.user.tenantId, id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Actualizar paquete" })
  update(@Request() req, @Param("id") id: string, @Body() dto: UpdateServicePackageDto) {
    return this.servicePackagesService.update(req.user.tenantId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Eliminar paquete" })
  remove(@Request() req, @Param("id") id: string) {
    return this.servicePackagesService.remove(req.user.tenantId, id);
  }

  @Post(":id/availability")
  @ApiOperation({ summary: "Validar disponibilidad de un paquete" })
  checkAvailability(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: PackageAvailabilityDto,
  ) {
    return this.servicePackagesService.getAvailability(req.user.tenantId, id, dto);
  }

  @Post(":id/price")
  @ApiOperation({ summary: "Calcular precio dinámico" })
  price(@Request() req, @Param("id") id: string, @Body() dto: PackagePricingDto) {
    return this.servicePackagesService.calculatePricing(req.user.tenantId, id, dto);
  }
}
