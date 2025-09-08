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
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from '../../dto/product.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../decorators/permissions.decorator';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('products', ['create'])
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'SKU ya existe' })
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    try {
      const product = await this.productsService.create(createProductDto, req.user);
      return {
        success: true,
        message: 'Producto creado exitosamente',
        data: product,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpException(
          'El SKU ya existe en el sistema',
          HttpStatus.CONFLICT,
        );
      }
      throw new HttpException(
        error.message || 'Error al crear el producto',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @RequirePermissions('products', ['read'])
  @ApiOperation({ summary: 'Obtener lista de productos con filtros' })
  @ApiResponse({ status: 200, description: 'Lista de productos obtenida exitosamente' })
  async findAll(@Query() query: ProductQueryDto, @Request() req: any) {
    try {
      const result = await this.productsService.findAll(query, req.user.tenantId);
      return {
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener los productos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @RequirePermissions('products', ['read'])
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiResponse({ status: 200, description: 'Producto obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const product = await this.productsService.findOne(id, req.user.tenantId);
      if (!product) {
        throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Producto obtenido exitosamente',
        data: product,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener el producto',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sku/:sku')
  @RequirePermissions('products', ['read'])
  @ApiOperation({ summary: 'Obtener un producto por SKU' })
  @ApiResponse({ status: 200, description: 'Producto obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findBySku(@Param('sku') sku: string, @Request() req: any) {
    try {
      const product = await this.productsService.findBySku(sku, req.user.tenantId);
      if (!product) {
        throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Producto obtenido exitosamente',
        data: product,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener el producto',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @RequirePermissions('products', ['update'])
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiResponse({ status: 200, description: 'Producto actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: any,
  ) {
    try {
      const product = await this.productsService.update(
        id,
        updateProductDto,
        req.user,
      );
      if (!product) {
        throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al actualizar el producto',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @RequirePermissions('products', ['delete'])
  @ApiOperation({ summary: 'Eliminar un producto (soft delete)' })
  @ApiResponse({ status: 200, description: 'Producto eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const result = await this.productsService.remove(id, req.user.tenantId);
      if (!result) {
        throw new HttpException('Producto no encontrado', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Producto eliminado exitosamente',
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al eliminar el producto',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('categories/list')
  @RequirePermissions('products', ['read'])
  @ApiOperation({ summary: 'Obtener lista de categorías disponibles' })
  @ApiResponse({ status: 200, description: 'Categorías obtenidas exitosamente' })
  async getCategories(@Request() req: any) {
    try {
      const categories = await this.productsService.getCategories(req.user.tenantId);
      return {
        success: true,
        message: 'Categorías obtenidas exitosamente',
        data: categories,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener las categorías',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('brands/list')
  @RequirePermissions('products', ['read'])
  @ApiOperation({ summary: 'Obtener lista de marcas disponibles' })
  @ApiResponse({ status: 200, description: 'Marcas obtenidas exitosamente' })
  async getBrands(@Request() req: any) {
    try {
      const brands = await this.productsService.getBrands(req.user.tenantId);
      return {
        success: true,
        message: 'Marcas obtenidas exitosamente',
        data: brands,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener las marcas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/variants')
  @RequirePermissions('products', ['update'])
  @ApiOperation({ summary: 'Agregar variante a un producto' })
  @ApiResponse({ status: 201, description: 'Variante agregada exitosamente' })
  async addVariant(
    @Param('id') id: string,
    @Body() variantDto: any,
    @Request() req: any,
  ) {
    try {
      const product = await this.productsService.addVariant(
        id,
        variantDto,
        req.user,
      );
      return {
        success: true,
        message: 'Variante agregada exitosamente',
        data: product,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al agregar la variante',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/suppliers')
  @RequirePermissions('products', ['update'])
  @ApiOperation({ summary: 'Agregar proveedor a un producto' })
  @ApiResponse({ status: 201, description: 'Proveedor agregado exitosamente' })
  async addSupplier(
    @Param('id') id: string,
    @Body() supplierDto: any,
    @Request() req: any,
  ) {
    try {
      const product = await this.productsService.addSupplier(
        id,
        supplierDto,
        req.user,
      );
      return {
        success: true,
        message: 'Proveedor agregado exitosamente',
        data: product,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al agregar el proveedor',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

