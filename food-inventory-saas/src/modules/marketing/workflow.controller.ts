import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { WorkflowService } from "./workflow.service";
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  GetWorkflowsQueryDto,
  EnrollCustomerDto,
} from "../../dto/marketing-workflow.dto";

@ApiTags("Marketing Workflows")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("marketing/workflows")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Crear un workflow de automatización" })
  @ApiResponse({ status: 201, description: "Workflow creado exitosamente" })
  async createWorkflow(@Body() dto: CreateWorkflowDto, @Request() req) {
    const workflow = await this.workflowService.createWorkflow(
      dto,
      req.user.tenantId,
      req.user.userId,
    );

    return {
      success: true,
      message: "Workflow creado exitosamente",
      data: workflow,
    };
  }

  @Get()
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener todos los workflows" })
  async getWorkflows(@Query() query: GetWorkflowsQueryDto, @Request() req) {
    const workflows = await this.workflowService.getWorkflows(
      req.user.tenantId,
      query,
    );

    return {
      success: true,
      data: workflows,
    };
  }

  @Get(":id")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener un workflow por ID" })
  async getWorkflow(@Param("id") id: string, @Request() req) {
    const workflow = await this.workflowService.getWorkflow(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: workflow,
    };
  }

  @Put(":id")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Actualizar un workflow" })
  async updateWorkflow(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDto,
    @Request() req,
  ) {
    const workflow = await this.workflowService.updateWorkflow(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );

    return {
      success: true,
      message: "Workflow actualizado",
      data: workflow,
    };
  }

  @Delete(":id")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Eliminar un workflow" })
  async deleteWorkflow(@Param("id") id: string, @Request() req) {
    await this.workflowService.deleteWorkflow(id, req.user.tenantId);

    return {
      success: true,
      message: "Workflow eliminado",
    };
  }

  @Post(":id/activate")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Activar un workflow" })
  async activateWorkflow(@Param("id") id: string, @Request() req) {
    const workflow = await this.workflowService.activateWorkflow(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Workflow activado",
      data: workflow,
    };
  }

  @Post(":id/pause")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Pausar un workflow" })
  async pauseWorkflow(@Param("id") id: string, @Request() req) {
    const workflow = await this.workflowService.pauseWorkflow(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Workflow pausado",
      data: workflow,
    };
  }

  @Post("enroll")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Inscribir un cliente en un workflow" })
  @ApiResponse({
    status: 201,
    description: "Cliente inscrito exitosamente en el workflow",
  })
  async enrollCustomer(@Body() dto: EnrollCustomerDto, @Request() req) {
    const execution = await this.workflowService.enrollCustomer(
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Cliente inscrito en workflow",
      data: execution,
    };
  }
}
