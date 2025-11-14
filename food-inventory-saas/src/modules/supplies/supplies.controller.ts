import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { SuppliesService } from "./supplies.service";
import {
  CreateSupplyConfigDto,
  UpdateSupplyConfigDto,
  LogSupplyConsumptionDto,
} from "./dto";

@ApiTags("Supplies")
@ApiBearerAuth()
@Controller("supplies")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Post("configs")
  @Permissions("products_write")
  @ApiOperation({ summary: "Create a supply configuration for a product" })
  @ApiResponse({
    status: 201,
    description: "Supply configuration created successfully",
  })
  async createSupplyConfig(
    @Request() req,
    @Body() body: CreateSupplyConfigDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.suppliesService.createSupplyConfig(
      tenantId,
      body.productId,
      body,
      userId,
    );
  }

  @Patch("configs/:configId")
  @Permissions("products_write")
  @ApiOperation({ summary: "Update a supply configuration" })
  @ApiResponse({
    status: 200,
    description: "Supply configuration updated successfully",
  })
  async updateSupplyConfig(
    @Request() req,
    @Param("configId") configId: string,
    @Body() body: UpdateSupplyConfigDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.suppliesService.updateSupplyConfig(
      tenantId,
      configId,
      body as any,
      userId,
    );
  }

  @Get("configs")
  @Permissions("products_read")
  @ApiOperation({ summary: "List all supply configurations" })
  @ApiResponse({
    status: 200,
    description: "List of supply configurations",
  })
  async listSupplyConfigs(@Request() req, @Query() query: any) {
    const tenantId = req.user.tenantId;
    return this.suppliesService.listSupplyConfigs(tenantId, query);
  }

  @Get("configs/product/:productId")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get supply configuration by product ID" })
  @ApiResponse({
    status: 200,
    description: "Supply configuration found",
  })
  async getSupplyConfigByProduct(
    @Request() req,
    @Param("productId") productId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.suppliesService.getSupplyConfigByProduct(tenantId, productId);
  }

  @Post("consumption")
  @Permissions("inventory_write")
  @ApiOperation({ summary: "Log supply consumption" })
  @ApiResponse({
    status: 201,
    description: "Supply consumption logged successfully",
  })
  async logConsumption(@Request() req, @Body() body: LogSupplyConsumptionDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.suppliesService.logConsumption(tenantId, body, userId);
  }

  @Get("consumption/:supplyId")
  @Permissions("inventory_read")
  @ApiOperation({ summary: "Get consumption logs for a supply" })
  @ApiResponse({
    status: 200,
    description: "List of consumption logs",
  })
  async getSupplyConsumptionLogs(
    @Request() req,
    @Param("supplyId") supplyId: string,
    @Query() query: any,
  ) {
    const tenantId = req.user.tenantId;
    const filters = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      department: query.department,
      consumedBy: query.consumedBy,
    };
    return this.suppliesService.getSupplyConsumptionLogs(
      tenantId,
      supplyId,
      filters,
    );
  }

  @Get("reports/by-department")
  @Permissions("reports_read")
  @ApiOperation({ summary: "Get consumption report by department" })
  @ApiResponse({
    status: 200,
    description: "Consumption report by department",
  })
  async getConsumptionReportByDepartment(
    @Request() req,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.suppliesService.getConsumptionReportByDepartment(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get("reports/by-supply")
  @Permissions("reports_read")
  @ApiOperation({ summary: "Get consumption report by supply" })
  @ApiResponse({
    status: 200,
    description: "Consumption report by supply",
  })
  async getConsumptionReportBySupply(
    @Request() req,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.suppliesService.getConsumptionReportBySupply(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
