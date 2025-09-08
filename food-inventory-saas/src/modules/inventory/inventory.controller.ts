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
import { InventoryService } from './inventory.service';
import {
  CreateInventoryDto,
  InventoryMovementDto,
  ReserveInventoryDto,
  ReleaseInventoryDto,
  AdjustInventoryDto,
  InventoryQueryDto,
  InventoryMovementQueryDto,
} from '../../dto/inventory.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../decorators/permissions.decorator';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RequirePermissions('inventory', ['create'])
  @ApiOperation({ summary: 'Crear registro de inventario inicial' })
  @ApiResponse({ status: 201, description: 'Inventario creado exitosamente' })
  async create(@Body() createInventoryDto: CreateInventoryDto, @Request() req) {
    try {
      const inventory = await this.inventoryService.create(createInventoryDto, req.user);
      return {
        success: true,
        message: 'Inventario creado exitosamente',
        data: inventory,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al crear el inventario',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener lista de inventario con filtros' })
  @ApiResponse({ status: 200, description: 'Inventario obtenido exitosamente' })
  async findAll(@Query() query: InventoryQueryDto, @Request() req) {
    try {
      const result = await this.inventoryService.findAll(query, req.user.tenantId);
      return {
        success: true,
        message: 'Inventario obtenido exitosamente',
        data: result.inventory,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener el inventario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener inventario por ID' })
  @ApiResponse({ status: 200, description: 'Inventario obtenido exitosamente' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const inventory = await this.inventoryService.findOne(id, req.user.tenantId);
      if (!inventory) {
        throw new HttpException('Inventario no encontrado', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Inventario obtenido exitosamente',
        data: inventory,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener el inventario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('product/:productSku')
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener inventario por SKU de producto' })
  @ApiResponse({ status: 200, description: 'Inventario obtenido exitosamente' })
  async findByProductSku(@Param('productSku') productSku: string, @Request() req) {
    try {
      const inventory = await this.inventoryService.findByProductSku(
        productSku,
        req.user.tenantId,
      );
      if (!inventory) {
        throw new HttpException('Inventario no encontrado', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: 'Inventario obtenido exitosamente',
        data: inventory,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al obtener el inventario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('movements')
  @RequirePermissions('inventory', ['create'])
  @ApiOperation({ summary: 'Registrar movimiento de inventario' })
  @ApiResponse({ status: 201, description: 'Movimiento registrado exitosamente' })
  async createMovement(@Body() movementDto: InventoryMovementDto, @Request() req) {
    try {
      const movement = await this.inventoryService.createMovement(movementDto, req.user);
      return {
        success: true,
        message: 'Movimiento registrado exitosamente',
        data: movement,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al registrar el movimiento',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('movements/history')
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener historial de movimientos' })
  @ApiResponse({ status: 200, description: 'Historial obtenido exitosamente' })
  async getMovements(@Query() query: InventoryMovementQueryDto, @Request() req) {
    try {
      const result = await this.inventoryService.getMovements(query, req.user.tenantId);
      return {
        success: true,
        message: 'Historial obtenido exitosamente',
        data: result.movements,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener el historial',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reserve')
  @RequirePermissions('inventory', ['update'])
  @ApiOperation({ summary: 'Reservar inventario para una orden' })
  @ApiResponse({ status: 200, description: 'Inventario reservado exitosamente' })
  async reserveInventory(@Body() reserveDto: ReserveInventoryDto, @Request() req) {
    try {
      const result = await this.inventoryService.reserveInventory(reserveDto, req.user);
      return {
        success: true,
        message: 'Inventario reservado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al reservar el inventario',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('release')
  @RequirePermissions('inventory', ['update'])
  @ApiOperation({ summary: 'Liberar reserva de inventario' })
  @ApiResponse({ status: 200, description: 'Reserva liberada exitosamente' })
  async releaseInventory(@Body() releaseDto: ReleaseInventoryDto, @Request() req) {
    try {
      const result = await this.inventoryService.releaseInventory(releaseDto, req.user);
      return {
        success: true,
        message: 'Reserva liberada exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al liberar la reserva',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('adjust')
  @RequirePermissions('inventory', ['update'])
  @ApiOperation({ summary: 'Ajustar inventario manualmente' })
  @ApiResponse({ status: 200, description: 'Inventario ajustado exitosamente' })
  async adjustInventory(@Body() adjustDto: AdjustInventoryDto, @Request() req) {
    try {
      const result = await this.inventoryService.adjustInventory(adjustDto, req.user);
      return {
        success: true,
        message: 'Inventario ajustado exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al ajustar el inventario',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('alerts/low-stock')
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener alertas de stock bajo' })
  @ApiResponse({ status: 200, description: 'Alertas obtenidas exitosamente' })
  async getLowStockAlerts(@Request() req) {
    try {
      const alerts = await this.inventoryService.getLowStockAlerts(req.user.tenantId);
      return {
        success: true,
        message: 'Alertas obtenidas exitosamente',
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener las alertas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('alerts/expiration')
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener alertas de productos próximos a vencer' })
  @ApiResponse({ status: 200, description: 'Alertas obtenidas exitosamente' })
  async getExpirationAlerts(@Request() req, @Query('days') days: number = 7) {
    try {
      const alerts = await this.inventoryService.getExpirationAlerts(
        req.user.tenantId,
        days,
      );
      return {
        success: true,
        message: 'Alertas obtenidas exitosamente',
        data: alerts,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener las alertas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reports/summary')
  @RequirePermissions('inventory', ['read'])
  @ApiOperation({ summary: 'Obtener resumen de inventario' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido exitosamente' })
  async getInventorySummary(@Request() req) {
    try {
      const summary = await this.inventoryService.getInventorySummary(req.user.tenantId);
      return {
        success: true,
        message: 'Resumen obtenido exitosamente',
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener el resumen',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

