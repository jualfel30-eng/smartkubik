import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TenantPaymentConfigService } from "./tenant-payment-config.service";
import { Public } from "../../decorators/public.decorator";

@ApiTags("Tenant Payment Config Public")
@Controller("public/tenant-payment-config")
export class TenantPaymentConfigPublicController {
  constructor(
    private readonly tenantPaymentConfigService: TenantPaymentConfigService,
  ) {}

  @Public()
  @Get(":tenantId/payment-methods")
  @ApiOperation({
    summary: "Get active payment methods for storefront (public)",
    description:
      "Returns active payment methods configured by the tenant for display in the storefront",
  })
  @ApiResponse({
    status: 200,
    description: "Active payment methods retrieved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              methodId: { type: "string", example: "zelle_usd" },
              name: { type: "string", example: "Zelle (USD)" },
              currency: { type: "string", example: "USD" },
              instructions: {
                type: "string",
                example: "Enviar a email@example.com",
              },
            },
          },
        },
      },
    },
  })
  async getActivePaymentMethods(@Param("tenantId") tenantId: string) {
    const methods =
      await this.tenantPaymentConfigService.getActivePaymentMethods(tenantId);

    // Filter out sensitive account details for public display
    const publicMethods = methods.map((method) => ({
      methodId: method.methodId,
      name: method.name,
      currency: method.currency,
      instructions: method.instructions,
      igtfApplicable: method.igtfApplicable,
    }));

    return {
      success: true,
      data: publicMethods,
    };
  }
}
