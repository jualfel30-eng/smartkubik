import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto } from '../../dto/subscription-plan.dto';
import { SuperAdminGuard } from '../../guards/super-admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('Super Admin - Subscription Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly plansService: SubscriptionPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  create(@Body() createPlanDto: CreateSubscriptionPlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  update(@Param('id') id: string, @Body() updatePlanDto: UpdateSubscriptionPlanDto) {
    return this.plansService.update(id, updatePlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive (soft-delete) a subscription plan' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
