import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { ImprentaFailureService } from "./imprenta-failure.service";
import { RetryImprentaDto } from "./dto/retry-imprenta.dto";
import { Param } from "@nestjs/common";

@ApiTags("billing-imprenta")
@Controller("billing/imprenta-failures")
@UseGuards(PermissionsGuard)
export class ImprentaFailureController {
  constructor(
    private readonly imprentaFailureService: ImprentaFailureService,
  ) {}

  @Get()
  @Permissions("billing_read")
  @ApiOperation({ summary: "Listar fallos de imprenta (DLQ)" })
  async list(@Req() req: any) {
    return this.imprentaFailureService.list(req.user.tenantId);
  }

  @Post("retry")
  @Permissions("billing_issue")
  @ApiOperation({ summary: "Reintentar fallos de imprenta" })
  async retry(@Body() dto: RetryImprentaDto, @Req() req: any) {
    return this.imprentaFailureService.retryMany(
      dto.failureIds,
      req.user.tenantId,
    );
  }

  @Permissions("billing_issue")
  @ApiOperation({ summary: "Eliminar un fallo de imprenta" })
  @Post(":id/delete")
  async delete(@Param("id") id: string, @Req() req: any) {
    return this.imprentaFailureService.delete(id, req.user.tenantId);
  }
}
