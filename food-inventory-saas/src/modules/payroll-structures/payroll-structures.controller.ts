import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PayrollStructuresService } from "./payroll-structures.service";
import { CreatePayrollStructureDto } from "./dto/create-payroll-structure.dto";
import { UpdatePayrollStructureDto } from "./dto/update-payroll-structure.dto";
import { CreatePayrollRuleDto } from "./dto/create-payroll-rule.dto";
import { UpdatePayrollRuleDto } from "./dto/update-payroll-rule.dto";
import { PreviewPayrollStructureDto } from "./dto/preview-payroll-structure.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { CreateStructureVersionDto } from "./dto/create-structure-version.dto";
import { StructureSuggestionQueryDto } from "./dto/structure-suggestion.dto";

@ApiTags("payroll-structures")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("payroll/structures")
export class PayrollStructuresController {
  constructor(
    private readonly payrollStructuresService: PayrollStructuresService,
  ) {}

  @Post()
  @Permissions("payroll_employees_write")
  async createStructure(@Req() req, @Body() dto: CreatePayrollStructureDto) {
    return this.payrollStructuresService.createStructure(
      req.user.tenantId,
      dto,
    );
  }

  @Get()
  @Permissions("payroll_employees_read")
  async listStructures(@Req() req) {
    return this.payrollStructuresService.listStructures(req.user.tenantId);
  }

  @Get(":id")
  @Permissions("payroll_employees_read")
  async getStructure(@Req() req, @Param("id") id: string) {
    return this.payrollStructuresService.getStructure(req.user.tenantId, id);
  }

  @Patch(":id")
  @Permissions("payroll_employees_write")
  async updateStructure(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdatePayrollStructureDto,
  ) {
    return this.payrollStructuresService.updateStructure(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete(":id")
  @Permissions("payroll_employees_write")
  async deleteStructure(@Req() req, @Param("id") id: string) {
    return this.payrollStructuresService.deleteStructure(req.user.tenantId, id);
  }

  @Post(":id/version")
  @Permissions("payroll_employees_write")
  async createVersion(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: CreateStructureVersionDto,
  ) {
    return this.payrollStructuresService.createVersion(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Patch(":id/activate")
  @Permissions("payroll_employees_write")
  async activateStructure(@Req() req, @Param("id") id: string) {
    return this.payrollStructuresService.activateStructure(
      req.user.tenantId,
      id,
    );
  }

  @Get("suggestions")
  @Permissions("payroll_employees_read")
  async suggestStructures(
    @Req() req,
    @Query() query: StructureSuggestionQueryDto,
  ) {
    return this.payrollStructuresService.suggestStructures(
      req.user.tenantId,
      query,
    );
  }

  @Get(":id/rules")
  @Permissions("payroll_employees_read")
  async listRules(@Req() req, @Param("id") id: string) {
    return this.payrollStructuresService.listRules(req.user.tenantId, id);
  }

  @Post(":id/rules")
  @Permissions("payroll_employees_write")
  async createRule(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: CreatePayrollRuleDto,
  ) {
    return this.payrollStructuresService.createRule(req.user.tenantId, id, dto);
  }

  @Patch(":id/rules/:ruleId")
  @Permissions("payroll_employees_write")
  async updateRule(
    @Req() req,
    @Param("id") id: string,
    @Param("ruleId") ruleId: string,
    @Body() dto: UpdatePayrollRuleDto,
  ) {
    return this.payrollStructuresService.updateRule(
      req.user.tenantId,
      id,
      ruleId,
      dto,
    );
  }

  @Delete(":id/rules/:ruleId")
  @Permissions("payroll_employees_write")
  async deleteRule(
    @Req() req,
    @Param("id") id: string,
    @Param("ruleId") ruleId: string,
  ) {
    return this.payrollStructuresService.deleteRule(
      req.user.tenantId,
      id,
      ruleId,
    );
  }

  @Post(":id/preview")
  @Permissions("payroll_employees_read")
  async previewStructure(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: PreviewPayrollStructureDto,
  ) {
    return this.payrollStructuresService.previewStructure(
      req.user.tenantId,
      id,
      dto,
      {
        userId: req.user.id,
        email: req.user.email,
        name: req.user.name,
      },
    );
  }
}
