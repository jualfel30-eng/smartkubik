import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../../dto/product.dto';
import { CreateProductWithPurchaseDto } from '../../dto/composite.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('/with-initial-purchase')
  async createWithInitialPurchase(@Body() createDto: CreateProductWithPurchaseDto, @Request() req) {
    const product = await this.productsService.createWithInitialPurchase(createDto, req.user);
    return { success: true, data: product };
  }

  @Post()
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    const product = await this.productsService.create(createProductDto, req.user);
    return { success: true, data: product };
  }

  @Get()
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
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const product = await this.productsService.findOne(id, req.user.tenantId);
    return { success: true, data: product };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @Request() req) {
    const product = await this.productsService.update(id, updateProductDto, req.user);
    return { success: true, data: product };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const result = await this.productsService.remove(id, req.user.tenantId);
    return { success: true, data: result };
  }

  @Get('categories/list')
  async getCategories(@Request() req) {
    const categories = await this.productsService.getCategories(req.user.tenantId);
    return { success: true, data: categories };
  }

  @Get('subcategories/list')
  async getSubcategories(@Request() req) {
    const subcategories = await this.productsService.getSubcategories(req.user.tenantId);
    return { success: true, data: subcategories };
  }
}