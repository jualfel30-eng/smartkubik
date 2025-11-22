import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PayrollAbsencesService } from "./payroll-absences.service";
import {
  CreateAbsenceRequestDto,
  UpdateAbsenceStatusDto,
} from "./dto/create-absence-request.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("payroll-absences")
@ApiBearerAuth()
@Controller("payroll/absences")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PayrollAbsencesController {
  constructor(private readonly absencesService: PayrollAbsencesService) {}

  @Get("requests")
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar solicitudes de ausencia" })
  listRequests(@Req() req, @Query() query: Record<string, any>) {
    return this.absencesService.listRequests(req.user.tenantId, query);
  }

  @Post("requests")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear solicitud de ausencia" })
  createRequest(@Req() req, @Body() dto: CreateAbsenceRequestDto) {
    return this.absencesService.createRequest(req.user.tenantId, dto);
  }

  @Patch("requests/:id/status")
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Aprobar o rechazar una ausencia" })
  updateStatus(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdateAbsenceStatusDto,
  ) {
    return this.absencesService.updateStatus(
      req.user.tenantId,
      id,
      dto,
      req.user.id,
    );
  }
}
