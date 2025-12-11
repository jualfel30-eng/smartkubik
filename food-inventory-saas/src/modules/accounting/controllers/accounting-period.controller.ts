import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TenantGuard } from '../../../guards/tenant.guard';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { Permissions } from '../../../decorators/permissions.decorator';
import { AccountingPeriodService } from '../services/accounting-period.service';
import {
  CreateAccountingPeriodDto,
  ClosePeriodDto,
} from '../../../dto/accounting.dto';

@Controller('accounting/periods')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AccountingPeriodController {
  constructor(private readonly periodService: AccountingPeriodService) {}

  /**
   * Create a new accounting period
   */
  @Post()
  @Permissions('accounting_create')
  async create(@Body() dto: CreateAccountingPeriodDto, @Req() req: any) {
    return this.periodService.create(dto, req.user.tenantId, req.user.userId);
  }

  /**
   * Get all periods with optional filters
   */
  @Get()
  @Permissions('accounting_read')
  async findAll(
    @Query('status') status?: 'open' | 'closed' | 'locked',
    @Query('fiscalYear') fiscalYear?: string,
    @Req() req?: any,
  ) {
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (fiscalYear) {
      filters.fiscalYear = parseInt(fiscalYear, 10);
    }

    return this.periodService.findAll(req.user.tenantId, filters);
  }

  /**
   * Get current open period
   */
  @Get('current')
  @Permissions('accounting_read')
  async getCurrent(@Req() req: any) {
    return this.periodService.getCurrentPeriod(req.user.tenantId);
  }

  /**
   * Get available fiscal years
   */
  @Get('fiscal-years')
  @Permissions('accounting_read')
  async getFiscalYears(@Req() req: any) {
    return this.periodService.getFiscalYears(req.user.tenantId);
  }

  /**
   * Get a specific period by ID
   */
  @Get(':id')
  @Permissions('accounting_read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.periodService.findOne(id, req.user.tenantId);
  }

  /**
   * Update a period (only if open)
   */
  @Put(':id')
  @Permissions('accounting_update')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAccountingPeriodDto>,
    @Req() req: any,
  ) {
    return this.periodService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  /**
   * Close a period
   */
  @Post('close')
  @Permissions('accounting_create')
  async close(@Body() dto: ClosePeriodDto, @Req() req: any) {
    return this.periodService.close(dto, req.user.tenantId, req.user.userId);
  }

  /**
   * Reopen a closed period
   */
  @Put(':id/reopen')
  @Permissions('accounting_update')
  async reopen(@Param('id') id: string, @Req() req: any) {
    return this.periodService.reopen(id, req.user.tenantId);
  }

  /**
   * Lock a closed period
   */
  @Put(':id/lock')
  @Permissions('accounting_update')
  async lock(@Param('id') id: string, @Req() req: any) {
    return this.periodService.lock(id, req.user.tenantId);
  }

  /**
   * Unlock a locked period
   */
  @Put(':id/unlock')
  @Permissions('accounting_update')
  async unlock(@Param('id') id: string, @Req() req: any) {
    return this.periodService.unlock(id, req.user.tenantId);
  }

  /**
   * Delete a period (only if open and no transactions)
   */
  @Delete(':id')
  @Permissions('accounting_delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.periodService.delete(id, req.user.tenantId);
    return { message: 'Período eliminado exitosamente' };
  }

  /**
   * Get period for a specific date
   */
  @Get('date/:date')
  @Permissions('accounting_read')
  async getPeriodForDate(@Param('date') date: string, @Req() req: any) {
    return this.periodService.getPeriodForDate(
      new Date(date),
      req.user.tenantId,
    );
  }
}
