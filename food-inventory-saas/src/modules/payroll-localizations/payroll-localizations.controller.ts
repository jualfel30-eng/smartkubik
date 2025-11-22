import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { PayrollLocalizationsService } from "./payroll-localizations.service";
import { CreateLocalizationDto } from "./dto/create-localization.dto";
import { AutoImportLocalizationDto } from "./dto/auto-import-localization.dto";

@ApiTags("payroll-localizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("payroll/localizations")
export class PayrollLocalizationsController {
  constructor(
    private readonly localizationsService: PayrollLocalizationsService,
  ) {}

  @Get()
  @Permissions("payroll_employees_read")
  async list(@Req() req) {
    return this.localizationsService.list(req.user.tenantId);
  }

  @Post()
  @Permissions("payroll_employees_write")
  async create(@Req() req, @Body() dto: CreateLocalizationDto) {
    return this.localizationsService.create(req.user.tenantId, dto);
  }

  @Post("auto-import")
  @Permissions("payroll_employees_write")
  async autoImport(@Req() req, @Body() dto: AutoImportLocalizationDto) {
    return this.localizationsService.autoImport(req.user.tenantId, dto);
  }

  @Post(":id/activate")
  @Permissions("payroll_employees_write")
  async activate(@Req() req, @Param("id") id: string) {
    return this.localizationsService.activate(req.user.tenantId, id);
  }

  @Post(":id/submit")
  @Permissions("payroll_employees_write")
  async submit(@Req() req, @Param("id") id: string) {
    return this.localizationsService.submitForApproval(req.user.tenantId, id);
  }

  @Post(":id/approve")
  @Permissions("payroll_employees_write")
  async approve(@Req() req, @Param("id") id: string) {
    return this.localizationsService.approve(req.user.tenantId, id);
  }
}
