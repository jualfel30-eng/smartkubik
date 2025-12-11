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
import { RecurringEntryService } from '../services/recurring-entry.service';
import {
  CreateRecurringEntryDto,
  UpdateRecurringEntryDto,
  ExecuteRecurringEntriesDto,
} from '../../../dto/accounting.dto';

@Controller('accounting/recurring-entries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RecurringEntryController {
  constructor(private readonly recurringEntryService: RecurringEntryService) {}

  /**
   * Create a new recurring entry template
   */
  @Post()
  @Permissions('accounting_create')
  async create(@Body() dto: CreateRecurringEntryDto, @Req() req: any) {
    return this.recurringEntryService.create(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  /**
   * Get all recurring entries with optional filters
   */
  @Get()
  @Permissions('accounting_read')
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('frequency') frequency?: string,
    @Req() req?: any,
  ) {
    const filters: any = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (frequency) {
      filters.frequency = frequency;
    }

    return this.recurringEntryService.findAll(req.user.tenantId, filters);
  }

  /**
   * Get upcoming executions
   */
  @Get('upcoming')
  @Permissions('accounting_read')
  async getUpcoming(
    @Query('daysAhead') daysAhead?: string,
    @Req() req?: any,
  ) {
    const days = daysAhead ? parseInt(daysAhead, 10) : 30;
    return this.recurringEntryService.getUpcomingExecutions(
      req.user.tenantId,
      days,
    );
  }

  /**
   * Get a specific recurring entry by ID
   */
  @Get(':id')
  @Permissions('accounting_read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.recurringEntryService.findOne(id, req.user.tenantId);
  }

  /**
   * Update a recurring entry
   */
  @Put(':id')
  @Permissions('accounting_update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringEntryDto,
    @Req() req: any,
  ) {
    return this.recurringEntryService.update(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  /**
   * Toggle active status
   */
  @Put(':id/toggle-active')
  @Permissions('accounting_update')
  async toggleActive(@Param('id') id: string, @Req() req: any) {
    return this.recurringEntryService.toggleActive(id, req.user.tenantId);
  }

  /**
   * Execute a specific recurring entry manually
   */
  @Post(':id/execute')
  @Permissions('accounting_create')
  async executeOne(
    @Param('id') id: string,
    @Body('executionDate') executionDate: string,
    @Req() req: any,
  ) {
    const date = executionDate ? new Date(executionDate) : new Date();
    return this.recurringEntryService.executeOne(
      id,
      date,
      req.user.tenantId,
    );
  }

  /**
   * Execute all pending recurring entries
   */
  @Post('execute-pending')
  @Permissions('accounting_create')
  async executeAllPending(
    @Body() dto: ExecuteRecurringEntriesDto,
    @Req() req: any,
  ) {
    return this.recurringEntryService.executeAllPending(dto, req.user.tenantId);
  }

  /**
   * Delete a recurring entry
   */
  @Delete(':id')
  @Permissions('accounting_delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.recurringEntryService.delete(id, req.user.tenantId);
    return { message: 'Asiento recurrente eliminado exitosamente' };
  }
}
