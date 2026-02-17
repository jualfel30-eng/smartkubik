import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingAuditLog } from "../../schemas/billing-audit-log.schema";

@ApiTags("billing-audit")
@Controller("billing/audit")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingAuditController {
  constructor(
    @InjectModel(BillingAuditLog.name)
    private auditModel: Model<BillingAuditLog>,
  ) {}

  @Get(":documentId")
  @Permissions("billing_read")
  @ApiOperation({ summary: "Auditoría de un documento de facturación" })
  async list(@Param("documentId") documentId: string, @Req() req: any) {
    return this.auditModel
      .find({ documentId, tenantId: req.user.tenantId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }
}
