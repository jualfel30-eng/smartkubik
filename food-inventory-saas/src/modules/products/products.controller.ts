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
import { ProductsService } from "./products.service";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from "../../dto/product.dto";
import { CreateProductWithPurchaseDto } from "../../dto/composite.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post("/with-initial-purchase")
  @Permissions("products_create")
  async createWithInitialPurchase(
    @Body() createDto: CreateProductWithPurchaseDto,
    @Request() req,
  ) {
    const product = await this.productsService.createWithInitialPurchase(
      createDto,
      req.user,
    );
    return { success: true, data: product };
  }

  @Post()
  @Permissions("products_create")
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    const product = await this.productsService.create(
      createProductDto,
      req.user,
    );
    return { success: true, data: product };
  }

  @Get()
  @Permissions("products_read")
  async findAll(@Query() query: ProductQueryDto, @Request() req) {
    const result = await this.productsService.findAll(query, req.user.tenantId);
    return {
      success: true,
      data: result.products,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(":id")
  @Permissions("products_read")
  async findOne(@Param("id") id: string, @Request() req) {
    const product = await this.productsService.findOne(id, req.user.tenantId);
    return { success: true, data: product };
  }

  @Patch(":id")
  @Permissions("products_update")
  async update(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    const product = await this.productsService.update(
      id,
      updateProductDto,
      req.user,
    );
    return { success: true, data: product };
  }

  @Delete(":id")
  @Permissions("products_delete")
  async remove(@Param("id") id: string, @Request() req) {
    const result = await this.productsService.remove(id, req.user.tenantId);
    return { success: true, data: result };
  }

  @Get("categories/list")
  @Permissions("products_read")
  async getCategories(@Request() req) {
    const categories = await this.productsService.getCategories(
      req.user.tenantId,
    );
    return { success: true, data: categories };
  }

  @Get("subcategories/list")
  @Permissions("products_read")
  async getSubcategories(@Request() req) {
    const subcategories = await this.productsService.getSubcategories(
      req.user.tenantId,
    );
    return { success: true, data: subcategories };
  }
}