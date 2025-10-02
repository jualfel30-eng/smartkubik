import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RecurringPayablesService } from './recurring-payables.service';
import { CreateRecurringPayableDto } from '../../dto/recurring-payable.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('recurring-payables')
export class RecurringPayablesController {
  constructor(private readonly recurringPayablesService: RecurringPayablesService) {}

  @Get()
  findAll(@Request() req) {
    return this.recurringPayablesService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Request() req, @Body() createDto: CreateRecurringPayableDto) {
    return this.recurringPayablesService.create(createDto, req.user.tenantId, req.user.id);
  }

  @Post(':id/generate')
  generatePayable(@Request() req, @Param('id') id: string) {
    return this.recurringPayablesService.generatePayable(id, req.user.tenantId, req.user.id);
  }
}
