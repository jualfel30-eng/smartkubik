import { Controller, Post, Body, Request, UseGuards, HttpException, HttpStatus, Get, Param, Patch, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PayablesService, CreatePayableDto, UpdatePayableDto } from './payables.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { PaginationDto } from '../../dto/pagination.dto';

@ApiTags('payables')
@Controller('payables')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("payables_create")
  @ApiOperation({ summary: 'Crear una nueva cuenta por pagar (payable)' })
  @ApiResponse({ status: 201, description: 'La cuenta por pagar ha sido creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  async create(@Request() req, @Body() createPayableDto: CreatePayableDto) {
    try {
      const newPayable = await this.payablesService.create(
        createPayableDto,
        req.user.tenantId,
        req.user.id,
      );
      return {
        success: true,
        message: 'Cuenta por pagar creada exitosamente',
        data: newPayable,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al crear la cuenta por pagar',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("payables_read")
  @ApiOperation({ summary: 'Obtener todas las cuentas por pagar del tenant (paginadas)' })
  @ApiResponse({ status: 200, description: 'Cuentas por pagar obtenidas exitosamente' })
  async findAll(@Request() req, @Query() paginationDto: PaginationDto) {
    try {
      const result = await this.payablesService.findAll(req.user.tenantId, paginationDto);
      return {
        success: true,
        data: result.payables,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener las cuentas por pagar',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions("payables_read")
  @ApiOperation({ summary: 'Obtener una cuenta por pagar por su ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    try {
      const payable = await this.payablesService.findOne(id, req.user.tenantId);
      return {
        success: true,
        data: payable,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al obtener la cuenta por pagar',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions("payables_update")
  @ApiOperation({ summary: 'Actualizar una cuenta por pagar' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePayableDto: UpdatePayableDto,
  ) {
    try {
      const updatedPayable = await this.payablesService.update(
        id,
        req.user.tenantId,
        updatePayableDto,
      );
      return {
        success: true,
        message: 'Cuenta por pagar actualizada exitosamente',
        data: updatedPayable,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al actualizar la cuenta por pagar',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions("payables_delete")
  @ApiOperation({ summary: 'Anular una cuenta por pagar' })
  async remove(@Request() req, @Param('id') id: string) {
    try {
      const result = await this.payablesService.remove(id, req.user.tenantId);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al anular la cuenta por pagar',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('migrate-draft-to-open')
  @UseGuards(PermissionsGuard)
  @Permissions("payables_update")
  @ApiOperation({ summary: 'Migrar payables de draft a open (temporal migration endpoint)' })
  async migrateDraftToOpen(@Request() req) {
    try {
      const result = await this.payablesService.migrateDraftToOpen(req.user.tenantId);
      return {
        success: true,
        message: 'Payables migrados exitosamente',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al migrar payables',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}