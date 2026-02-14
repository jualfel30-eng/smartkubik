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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { PriceListsService } from './price-lists.service';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  AssignProductToPriceListDto,
  BulkAssignProductsToPriceListDto,
} from '../../dto/price-list.dto';

@Controller('price-lists')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  @Permissions('products:write')
  async create(@Body() dto: CreatePriceListDto, @Request() req) {
    const priceList = await this.priceListsService.create(
      dto,
      req.user.tenantId,
      req.user.id,
      req.user.name || req.user.email,
    );
    return {
      success: true,
      data: priceList,
    };
  }

  @Get()
  @Permissions('products:read')
  async findAll(@Query('activeOnly') activeOnly: string, @Request() req) {
    const priceLists = await this.priceListsService.findAll(req.user.tenantId, activeOnly === 'true');
    return {
      success: true,
      data: priceLists,
      total: priceLists.length,
    };
  }

  @Get(':id')
  @Permissions('products:read')
  async findOne(@Param('id') id: string, @Request() req) {
    const priceList = await this.priceListsService.findOne(id, req.user.tenantId);
    return {
      success: true,
      data: priceList,
    };
  }

  @Put(':id')
  @Permissions('products:write')
  async update(@Param('id') id: string, @Body() dto: UpdatePriceListDto, @Request() req) {
    const priceList = await this.priceListsService.update(id, dto, req.user.tenantId);
    return {
      success: true,
      data: priceList,
    };
  }

  @Delete(':id')
  @Permissions('products:write')
  async remove(@Param('id') id: string, @Request() req) {
    await this.priceListsService.remove(id, req.user.tenantId);
    return { message: 'Lista de precios eliminada correctamente' };
  }

  // Endpoints para asignación de productos
  @Post('assign-product')
  @Permissions('products:write')
  async assignProduct(@Body() dto: AssignProductToPriceListDto, @Request() req) {
    return this.priceListsService.assignProduct(
      dto,
      req.user.tenantId,
      req.user.id,
      req.user.name || req.user.email,
    );
  }

  @Post('bulk-assign')
  @Permissions('products:write')
  async bulkAssign(@Body() dto: BulkAssignProductsToPriceListDto, @Request() req) {
    return this.priceListsService.bulkAssignProducts(
      dto,
      req.user.tenantId,
      req.user.id,
      req.user.name || req.user.email,
    );
  }

  @Get(':id/products')
  @Permissions('products:read')
  async getProducts(@Param('id') id: string, @Request() req) {
    return this.priceListsService.getProductsInPriceList(id, req.user.tenantId);
  }

  @Get('product/:productId/variant/:variantSku')
  @Permissions('products:read')
  async getPriceListsForProduct(
    @Param('productId') productId: string,
    @Param('variantSku') variantSku: string,
    @Request() req,
  ) {
    return this.priceListsService.getPriceListsForProduct(
      productId,
      variantSku,
      req.user.tenantId,
    );
  }

  @Delete(':priceListId/product/:variantSku')
  @Permissions('products:write')
  async removeProduct(
    @Param('priceListId') priceListId: string,
    @Param('variantSku') variantSku: string,
    @Request() req,
  ) {
    await this.priceListsService.removeProductFromPriceList(
      priceListId,
      variantSku,
      req.user.tenantId,
    );
    return { message: 'Producto eliminado de la lista de precios' };
  }

  @Get('price/:variantSku/:priceListId')
  @Permissions('products:read')
  async getPrice(
    @Param('variantSku') variantSku: string,
    @Param('priceListId') priceListId: string,
    @Request() req,
  ) {
    const price = await this.priceListsService.getProductPrice(
      variantSku,
      priceListId,
      req.user.tenantId,
    );
    return { variantSku, priceListId, customPrice: price };
  }
}
