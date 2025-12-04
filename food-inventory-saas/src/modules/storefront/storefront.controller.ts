import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from "@nestjs/swagger";
import { StorefrontService } from "./storefront.service";
import { CreateStorefrontConfigDto } from "./dto/create-storefront-config.dto";
import { UpdateStorefrontConfigDto } from "./dto/update-storefront-config.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("Storefront Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller(["admin/storefront", "storefront"])
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Post()
  @Permissions("storefront_create")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear configuración de storefront",
    description:
      "Crea una nueva configuración de storefront para el tenant autenticado",
  })
  @ApiBody({ type: CreateStorefrontConfigDto })
  @ApiResponse({
    status: 201,
    description: "Configuración de storefront creada exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos o módulo ecommerce no habilitado",
  })
  @ApiResponse({
    status: 409,
    description: "Ya existe una configuración o el dominio está en uso",
  })
  async create(@Body() createDto: CreateStorefrontConfigDto, @Request() req) {
    const config = await this.storefrontService.create(createDto, req.user);
    return {
      success: true,
      data: config,
      message: "Configuración de storefront creada exitosamente",
    };
  }

  @Get()
  @Permissions("storefront_read")
  @ApiOperation({
    summary: "Obtener configuración de storefront",
    description:
      "Obtiene la configuración de storefront del tenant autenticado",
  })
  @ApiResponse({
    status: 200,
    description: "Configuración obtenida exitosamente",
  })
  @ApiResponse({
    status: 404,
    description: "No se encontró configuración de storefront",
  })
  async findByTenant(@Request() req) {
    const config = await this.storefrontService.findByTenant(req.user.tenantId);
    return {
      success: true,
      data: config,
    };
  }

  @Put()
  @Permissions("storefront_update")
  @ApiOperation({
    summary: "Actualizar configuración completa",
    description:
      "Actualiza completamente la configuración de storefront (reemplaza todos los campos)",
  })
  @ApiBody({ type: CreateStorefrontConfigDto })
  @ApiResponse({
    status: 200,
    description: "Configuración actualizada exitosamente",
  })
  @ApiResponse({
    status: 404,
    description: "No se encontró configuración de storefront",
  })
  @ApiResponse({
    status: 409,
    description: "El dominio ya está en uso",
  })
  async update(@Body() updateDto: CreateStorefrontConfigDto, @Request() req) {
    const config = await this.storefrontService.update(updateDto, req.user);
    return {
      success: true,
      data: config,
      message: "Configuración actualizada exitosamente",
    };
  }

  @Patch()
  @Permissions("storefront_update")
  @ApiOperation({
    summary: "Actualizar configuración parcialmente",
    description:
      "Actualiza parcialmente la configuración de storefront (solo los campos proporcionados)",
  })
  @ApiBody({ type: UpdateStorefrontConfigDto })
  @ApiResponse({
    status: 200,
    description: "Configuración actualizada exitosamente",
  })
  @ApiResponse({
    status: 404,
    description: "No se encontró configuración de storefront",
  })
  @ApiResponse({
    status: 409,
    description: "El dominio ya está en uso",
  })
  async updatePartial(
    @Body() updateDto: UpdateStorefrontConfigDto,
    @Request() req,
  ) {
    const config = await this.storefrontService.updatePartial(
      updateDto,
      req.user,
    );
    return {
      success: true,
      data: config,
      message: "Configuración actualizada exitosamente",
    };
  }

  @Post("reset")
  @Permissions("storefront_update")
  @ApiOperation({
    summary: "Resetear configuración a valores por defecto",
    description:
      "Resetea la configuración de storefront a los valores por defecto del sistema",
  })
  @ApiResponse({
    status: 200,
    description: "Configuración reseteada exitosamente",
  })
  @ApiResponse({
    status: 404,
    description: "No se encontró configuración de storefront",
  })
  async reset(@Request() req) {
    const config = await this.storefrontService.reset(req.user);
    return {
      success: true,
      data: config,
      message: "Configuración reseteada a valores por defecto",
    };
  }

  @Get("check-domain")
  @Permissions("storefront_read")
  @ApiOperation({
    summary: "Verificar disponibilidad de dominio",
    description:
      "Verifica si un dominio está disponible para usar en el storefront",
  })
  @ApiQuery({ name: "domain", required: true, type: String })
  @ApiResponse({
    status: 200,
    description: "Verificación completada",
  })
  async checkDomain(@Query("domain") domain: string, @Request() req) {
    if (!domain) {
      return {
        success: false,
        isAvailable: false,
        message: "El dominio es requerido",
      };
    }

    const isAvailable = await this.storefrontService.checkDomainAvailability(
      domain,
      req.user.tenantId,
    );

    return {
      success: true,
      isAvailable,
      domain,
      message: isAvailable
        ? "Dominio disponible"
        : "Dominio no disponible, ya está en uso",
    };
  }

  @Post("upload-logo")
  @Permissions("storefront_update")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Subir logo del storefront",
    description:
      "Sube y optimiza el logo del storefront. Formato recomendado: PNG o SVG, máximo 2MB",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Logo subido y optimizado exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Archivo inválido o muy grande",
  })
  async uploadLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({
            fileType: /image\/(png|jpeg|jpg|svg\+xml|webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    const result = await this.storefrontService.uploadLogo(
      file,
      req.user.tenantId,
    );

    // Actualizar configuración con el nuevo logo
    await this.storefrontService.updatePartial(
      { theme: { logo: result.logo } } as any,
      req.user,
    );

    return {
      success: true,
      data: result,
      message: "Logo subido y optimizado exitosamente",
    };
  }

  @Post("upload-favicon")
  @Permissions("storefront_update")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Subir favicon del storefront",
    description:
      "Sube y optimiza el favicon del storefront. Formato recomendado: ICO o PNG 32x32, máximo 500KB",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Favicon subido y optimizado exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Archivo inválido o muy grande",
  })
  async uploadFavicon(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 }), // 500KB
          new FileTypeValidator({
            fileType: /image\/(x-icon|png|vnd\.microsoft\.icon)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    const result = await this.storefrontService.uploadFavicon(
      file,
      req.user.tenantId,
    );

    // Actualizar configuración con el nuevo favicon
    await this.storefrontService.updatePartial(
      { theme: { favicon: result.favicon } } as any,
      req.user,
    );

    return {
      success: true,
      data: result,
      message: "Favicon subido y optimizado exitosamente",
    };
  }
}
