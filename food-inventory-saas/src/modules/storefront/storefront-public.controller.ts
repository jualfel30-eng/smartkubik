import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { StorefrontService } from "./storefront.service";
import { Public } from "../../decorators/public.decorator";

@ApiTags("Storefront Public")
@Controller("api/v1/public/storefront")
export class StorefrontPublicController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Public()
  @Get(":tenantId/config")
  @ApiOperation({
    summary: "Obtener configuración de storefront por tenant ID",
    description:
      "Endpoint público para obtener la configuración de storefront de un tenant específico (solo si está activo)",
  })
  @ApiParam({
    name: "tenantId",
    description: "ID del tenant",
    example: "507f1f77bcf86cd799439011",
  })
  @ApiResponse({
    status: 200,
    description: "Configuración obtenida exitosamente",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            _id: { type: "string" },
            tenantId: {
              type: "object",
              properties: {
                _id: { type: "string" },
                name: { type: "string" },
                businessType: { type: "string" },
                logo: { type: "string" },
                contactInfo: { type: "object" },
              },
            },
            domain: { type: "string" },
            isActive: { type: "boolean" },
            theme: {
              type: "object",
              properties: {
                primaryColor: { type: "string" },
                secondaryColor: { type: "string" },
                logo: { type: "string" },
                favicon: { type: "string" },
              },
            },
            templateType: { type: "string" },
            customCSS: { type: "string" },
            seo: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
              },
            },
            socialMedia: {
              type: "object",
              properties: {
                facebook: { type: "string" },
                instagram: { type: "string" },
                whatsapp: { type: "string" },
                twitter: { type: "string" },
                linkedin: { type: "string" },
              },
            },
            contactInfo: {
              type: "object",
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                address: { type: "object" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "ID de tenant inválido",
  })
  @ApiResponse({
    status: 404,
    description: "No se encontró un storefront activo para este tenant",
  })
  async getConfigByTenantId(@Param("tenantId") tenantId: string) {
    const config = await this.storefrontService.findByTenantIdPublic(
      tenantId,
    );
    return {
      success: true,
      data: config,
    };
  }

  @Public()
  @Get(":domain/config")
  @ApiOperation({
    summary: "Obtener configuración de storefront por dominio",
    description:
      "Endpoint público para obtener la configuración de storefront por dominio personalizado (solo si está activo)",
  })
  @ApiParam({
    name: "domain",
    description: "Dominio del storefront",
    example: "mitienda.smartkubik.com",
  })
  @ApiResponse({
    status: 200,
    description: "Configuración obtenida exitosamente",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            _id: { type: "string" },
            tenantId: {
              type: "object",
              properties: {
                _id: { type: "string" },
                name: { type: "string" },
                businessType: { type: "string" },
                logo: { type: "string" },
                contactInfo: { type: "object" },
              },
            },
            domain: { type: "string" },
            isActive: { type: "boolean" },
            theme: {
              type: "object",
              properties: {
                primaryColor: { type: "string" },
                secondaryColor: { type: "string" },
                logo: { type: "string" },
                favicon: { type: "string" },
              },
            },
            templateType: { type: "string" },
            customCSS: { type: "string" },
            seo: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                keywords: { type: "array", items: { type: "string" } },
              },
            },
            socialMedia: {
              type: "object",
              properties: {
                facebook: { type: "string" },
                instagram: { type: "string" },
                whatsapp: { type: "string" },
                twitter: { type: "string" },
                linkedin: { type: "string" },
              },
            },
            contactInfo: {
              type: "object",
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                address: { type: "object" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "No se encontró un storefront activo para este dominio",
  })
  async getConfigByDomain(@Param("domain") domain: string) {
    const config = await this.storefrontService.findByDomain(domain);
    return {
      success: true,
      data: config,
    };
  }
}
