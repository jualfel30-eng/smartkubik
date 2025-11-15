import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PayrollEmployeesService } from "./payroll-employees.service";
import { CreateEmployeeProfileDto } from "./dto/create-employee-profile.dto";
import { UpdateEmployeeProfileDto } from "./dto/update-employee-profile.dto";
import { CreateEmployeeContractDto } from "./dto/create-employee-contract.dto";
import { UpdateEmployeeContractDto } from "./dto/update-employee-contract.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { EmployeeFiltersDto } from "./dto/employee-filters.dto";
import { PaginationDto } from "../../dto/pagination.dto";
import { BatchNotifyEmployeesDto } from "./dto/batch-notify-employees.dto";
import { BulkUpdateEmployeeStatusDto } from "./dto/bulk-update-employee-status.dto";
import { BulkAssignPayrollStructureDto } from "./dto/bulk-assign-structure.dto";

@ApiTags("payroll-employees")
@ApiBearerAuth()
@Controller("payroll/employees")
@UseGuards(JwtAuthGuard, TenantGuard)
export class PayrollEmployeesController {
  constructor(
    private readonly payrollEmployeesService: PayrollEmployeesService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear un nuevo perfil de empleado" })
  async createProfile(@Request() req, @Body() dto: CreateEmployeeProfileDto) {
    const result = await this.payrollEmployeesService.createProfile(
      dto,
      req.user.tenantId,
      req.user.id,
    );
    return { success: true, data: result };
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar empleados" })
  async findAll(@Request() req, @Query() filters: EmployeeFiltersDto) {
    const result = await this.payrollEmployeesService.findAll(
      req.user.tenantId,
      filters,
    );
    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get("summary")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Resumen de empleados" })
  async getSummary(@Request() req) {
    const summary = await this.payrollEmployeesService.getSummary(
      req.user.tenantId,
    );
    return { success: true, data: summary };
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Obtener un empleado específico" })
  async findOne(@Request() req, @Param("id") id: string) {
    const result = await this.payrollEmployeesService.findOne(
      id,
      req.user.tenantId,
    );
    return { success: true, data: result };
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Actualizar un empleado" })
  async updateProfile(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeProfileDto,
  ) {
    const result = await this.payrollEmployeesService.updateProfile(
      id,
      req.user.tenantId,
      dto,
    );
    return { success: true, data: result };
  }

  @Post(":id/contracts")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Crear un contrato para un empleado" })
  async createContract(
    @Request() req,
    @Param("id") employeeId: string,
    @Body() dto: CreateEmployeeContractDto,
  ) {
    const result = await this.payrollEmployeesService.createContract(
      employeeId,
      req.user.tenantId,
      dto,
      req.user.id,
    );
    return { success: true, data: result };
  }

  @Get(":id/contracts")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_read")
  @ApiOperation({ summary: "Listar contratos de un empleado" })
  async listContracts(
    @Request() req,
    @Param("id") employeeId: string,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.payrollEmployeesService.listContracts(
      employeeId,
      req.user.tenantId,
      pagination,
    );
    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Patch(":id/contracts/:contractId")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Actualizar un contrato de empleado" })
  async updateContract(
    @Request() req,
    @Param("id") employeeId: string,
    @Param("contractId") contractId: string,
    @Body() dto: UpdateEmployeeContractDto,
  ) {
    const result = await this.payrollEmployeesService.updateContract(
      employeeId,
      contractId,
      req.user.tenantId,
      dto,
      req.user.id,
    );
    return { success: true, data: result };
  }

  @Patch("bulk/status")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Actualizar el estado de múltiples empleados" })
  async bulkStatus(@Request() req, @Body() dto: BulkUpdateEmployeeStatusDto) {
    const result = await this.payrollEmployeesService.bulkUpdateEmployeeStatus(
      req.user.tenantId,
      dto,
    );
    return { success: true, data: result };
  }

  @Patch("bulk/structure")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Asignar estructura de nómina en lote" })
  async bulkAssignStructure(
    @Request() req,
    @Body() dto: BulkAssignPayrollStructureDto,
  ) {
    const result =
      await this.payrollEmployeesService.bulkAssignPayrollStructure(
        req.user.tenantId,
        dto,
      );
    return { success: true, data: result };
  }

  @Post("notifications/batch")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({ summary: "Enviar notificaciones en lote a empleados" })
  async batchNotify(@Request() req, @Body() dto: BatchNotifyEmployeesDto) {
    const result = await this.payrollEmployeesService.sendBatchNotifications(
      req.user.tenantId,
      dto,
    );
    return { success: true, data: result };
  }

  @Post("maintenance/reconcile")
  @UseGuards(PermissionsGuard)
  @Permissions("payroll_employees_write")
  @ApiOperation({
    summary: "Reconciliar perfiles duplicados y reasignar contratos",
  })
  async reconcile(@Request() req) {
    const result =
      await this.payrollEmployeesService.reconcileDuplicateProfiles(
        req.user.tenantId,
      );
    return { success: true, data: result };
  }
}
