import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ConsumablesService } from "./consumables.service";
import {
  CreateConsumableConfigDto,
  UpdateConsumableConfigDto,
  CreateProductConsumableRelationDto,
  UpdateProductConsumableRelationDto,
} from "./dto";

@ApiTags("Consumables")
@ApiBearerAuth()
@Controller("consumables")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConsumablesController {
  constructor(private readonly consumablesService: ConsumablesService) {}

  @Post("configs")
  @Permissions("products_write")
  @ApiOperation({ summary: "Create a consumable configuration for a product" })
  @ApiResponse({
    status: 201,
    description: "Consumable configuration created successfully",
  })
  async createConsumableConfig(
    @Request() req,
    @Body() body: CreateConsumableConfigDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.consumablesService.createConsumableConfig(
      tenantId,
      body.productId,
      body,
      userId,
    );
  }

  @Patch("configs/:configId")
  @Permissions("products_write")
  @ApiOperation({ summary: "Update a consumable configuration" })
  @ApiResponse({
    status: 200,
    description: "Consumable configuration updated successfully",
  })
  async updateConsumableConfig(
    @Request() req,
    @Param("configId") configId: string,
    @Body() body: UpdateConsumableConfigDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.consumablesService.updateConsumableConfig(
      tenantId,
      configId,
      body,
      userId,
    );
  }

  @Get("configs")
  @Permissions("products_read")
  @ApiOperation({ summary: "List all consumable configurations" })
  @ApiResponse({
    status: 200,
    description: "List of consumable configurations",
  })
  async listConsumableConfigs(@Request() req, @Query() query: any) {
    const tenantId = req.user.tenantId;
    return this.consumablesService.listConsumableConfigs(tenantId, query);
  }

  @Get("configs/product/:productId")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get consumable configuration by product ID" })
  @ApiResponse({
    status: 200,
    description: "Consumable configuration found",
  })
  async getConsumableConfigByProduct(
    @Request() req,
    @Param("productId") productId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.consumablesService.getConsumableConfigByProduct(
      tenantId,
      productId,
    );
  }

  @Post("relations")
  @Permissions("products_write")
  @ApiOperation({
    summary: "Create a relation between a product and a consumable",
  })
  @ApiResponse({
    status: 201,
    description: "Product-consumable relation created successfully",
  })
  async createProductConsumableRelation(
    @Request() req,
    @Body() body: CreateProductConsumableRelationDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.consumablesService.createProductConsumableRelation(
      tenantId,
      body,
      userId,
    );
  }

  @Get("relations/product/:productId")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get all consumables for a product" })
  @ApiResponse({
    status: 200,
    description: "List of consumables for the product",
  })
  async getProductConsumables(
    @Request() req,
    @Param("productId") productId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.consumablesService.getProductConsumables(tenantId, productId);
  }

  @Get("relations/consumable/:consumableId")
  @Permissions("products_read")
  @ApiOperation({ summary: "Get all products that use a specific consumable" })
  @ApiResponse({
    status: 200,
    description: "List of products using the consumable",
  })
  async getProductsUsingConsumable(
    @Request() req,
    @Param("consumableId") consumableId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.consumablesService.getProductsUsingConsumable(
      tenantId,
      consumableId,
    );
  }

  @Patch("relations/:relationId")
  @Permissions("products_write")
  @ApiOperation({ summary: "Update a product-consumable relation" })
  @ApiResponse({
    status: 200,
    description: "Product-consumable relation updated successfully",
  })
  async updateProductConsumableRelation(
    @Request() req,
    @Param("relationId") relationId: string,
    @Body() body: UpdateProductConsumableRelationDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.consumablesService.updateProductConsumableRelation(
      tenantId,
      relationId,
      body,
      userId,
    );
  }

  @Delete("relations/:relationId")
  @Permissions("products_write")
  @ApiOperation({ summary: "Delete a product-consumable relation" })
  @ApiResponse({
    status: 200,
    description: "Product-consumable relation deleted successfully",
  })
  async deleteProductConsumableRelation(
    @Request() req,
    @Param("relationId") relationId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.consumablesService.deleteProductConsumableRelation(
      tenantId,
      relationId,
    );
  }
}
