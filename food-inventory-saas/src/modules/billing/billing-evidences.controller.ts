import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { BillingEvidencesService } from "./billing-evidences.service";
import { Param } from "@nestjs/common";

@ApiTags("billing-evidences")
@Controller("billing/evidences")
@UseGuards(PermissionsGuard)
export class BillingEvidencesController {
  constructor(private readonly evidencesService: BillingEvidencesService) {}

  @Get()
  @Permissions("billing_read")
  @ApiOperation({ summary: "Listar evidencias de facturación" })
  async list(@Query("documentId") documentId: string, @Req() req: any) {
    return this.evidencesService.list(req.user.tenantId, documentId);
  }

  @Get(":id")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Obtener evidencias por documento" })
  async getById(@Param("id") id: string, @Req() req: any) {
    return this.evidencesService.list(req.user.tenantId, id);
  }
}
