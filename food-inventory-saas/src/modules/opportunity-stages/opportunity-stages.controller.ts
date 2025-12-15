import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { OpportunityStagesService } from "./opportunity-stages.service";
import {
  CreateOpportunityStageDto,
  UpdateOpportunityStageDto,
} from "../../dto/opportunity-stage.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("opportunity-stages")
@Controller("opportunity-stages")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OpportunityStagesController {
  constructor(
    private readonly opportunityStagesService: OpportunityStagesService,
  ) {}

  @Get()
  @Permissions("customers_read")
  @ApiOperation({ summary: "Listar etapas de oportunidad (tenant)" })
  async findAll(@Request() req) {
    const data = await this.opportunityStagesService.findAll(req.user.tenantId);
    return { success: true, data };
  }

  @Post()
  @Permissions("customers_update")
  @ApiOperation({ summary: "Crear etapa de oportunidad" })
  async create(
    @Body() dto: CreateOpportunityStageDto,
    @Request() req,
  ) {
    const data = await this.opportunityStagesService.create(dto, req.user);
    return { success: true, data };
  }

  @Patch(":id")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Actualizar etapa de oportunidad" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateOpportunityStageDto,
    @Request() req,
  ) {
    const data = await this.opportunityStagesService.update(
      id,
      dto,
      req.user,
    );
    return { success: true, data };
  }

  @Delete(":id")
  @Permissions("customers_update")
  @ApiOperation({ summary: "Eliminar etapa de oportunidad" })
  async remove(@Param("id") id: string, @Request() req) {
    const data = await this.opportunityStagesService.remove(
      id,
      req.user.tenantId,
    );
    return { success: true, data };
  }
}
