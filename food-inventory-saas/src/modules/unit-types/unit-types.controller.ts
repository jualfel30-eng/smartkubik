import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { UnitTypesService } from "./unit-types.service";
import {
  CreateUnitTypeDto,
  UpdateUnitTypeDto,
  UnitTypeQueryDto,
  ConvertUnitsDto,
  ConvertUnitsResponseDto,
} from "../../dto/unit-type.dto";

@ApiTags("Unit Types")
@Controller("unit-types")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UnitTypesController {
  constructor(private readonly unitTypesService: UnitTypesService) {}

  @Post()
  @Permissions("products_write")
  @ApiOperation({ summary: "Create a new unit type" })
  @ApiResponse({ status: 201, description: "Unit type created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 409, description: "Unit type already exists" })
  create(@Body() createDto: CreateUnitTypeDto, @Request() req: any) {
    return this.unitTypesService.create(
      createDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @Permissions("products_read")
  @ApiOperation({ summary: "Get all unit types" })
  @ApiResponse({ status: 200, description: "List of unit types" })
  findAll(@Query() query: UnitTypeQueryDto, @Request() req: any) {
    return this.unitTypesService.findAll(query, req.user.tenantId);
  }

  @Get("categories")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get all unit categories with counts" })
  @ApiResponse({ status: 200, description: "List of categories" })
  getCategories() {
    return this.unitTypesService.getCategories();
  }

  @Get(":id")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get a unit type by ID" })
  @ApiResponse({ status: 200, description: "Unit type found" })
  @ApiResponse({ status: 404, description: "Unit type not found" })
  findOne(@Param("id") id: string) {
    return this.unitTypesService.findOne(id);
  }

  @Get("by-name/:name")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get a unit type by name" })
  @ApiResponse({ status: 200, description: "Unit type found" })
  @ApiResponse({ status: 404, description: "Unit type not found" })
  findByName(@Param("name") name: string, @Request() req: any) {
    return this.unitTypesService.findByName(name, req.user.tenantId);
  }

  @Patch(":id")
  @Permissions("products_write")
  @ApiOperation({ summary: "Update a unit type" })
  @ApiResponse({ status: 200, description: "Unit type updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Unit type not found" })
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateUnitTypeDto,
    @Request() req: any,
  ) {
    return this.unitTypesService.update(id, updateDto, req.user.id);
  }

  @Delete(":id")
  @Permissions("products_write")
  @ApiOperation({ summary: "Soft delete a unit type" })
  @ApiResponse({
    status: 200,
    description: "Unit type deactivated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Cannot delete system-defined types",
  })
  @ApiResponse({ status: 404, description: "Unit type not found" })
  remove(@Param("id") id: string) {
    return this.unitTypesService.remove(id);
  }

  @Delete(":id/hard")
  @Permissions("products_write")
  @ApiOperation({ summary: "Permanently delete a unit type" })
  @ApiResponse({ status: 200, description: "Unit type deleted permanently" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete system-defined types",
  })
  @ApiResponse({ status: 404, description: "Unit type not found" })
  hardDelete(@Param("id") id: string) {
    return this.unitTypesService.hardDelete(id);
  }

  @Post("convert")
  @Permissions("products_read")
  @ApiOperation({ summary: "Convert between units of the same type" })
  @ApiResponse({
    status: 200,
    description: "Conversion result",
    type: ConvertUnitsResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid units or unit type" })
  convertUnits(@Body() dto: ConvertUnitsDto): Promise<ConvertUnitsResponseDto> {
    return this.unitTypesService.convertUnits(dto);
  }

  @Get(":id/conversion-factor")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get conversion factor between two units" })
  @ApiResponse({ status: 200, description: "Conversion factor" })
  @ApiResponse({ status: 400, description: "Invalid units" })
  getConversionFactor(
    @Param("id") unitTypeId: string,
    @Query("from") fromUnit: string,
    @Query("to") toUnit: string,
  ) {
    return this.unitTypesService.getConversionFactor(
      unitTypeId,
      fromUnit,
      toUnit,
    );
  }

  @Get(":id/validate-unit/:unit")
  @Permissions("products_read")
  @ApiOperation({ summary: "Validate if a unit exists in a unit type" })
  @ApiResponse({ status: 200, description: "Validation result" })
  validateUnit(
    @Param("id") unitTypeId: string,
    @Param("unit") unitAbbr: string,
  ) {
    return this.unitTypesService.validateUnit(unitTypeId, unitAbbr);
  }
}
