import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BillSplitsService } from './bill-splits.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import {
  CreateBillSplitDto,
  SplitEquallyDto,
  SplitByItemsDto,
  PaySplitPartDto,
  UpdateSplitPartTipDto,
} from '../../dto/bill-split.dto';

@Controller('bill-splits')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BillSplitsController {
  constructor(private readonly billSplitsService: BillSplitsService) {}

  @Post('split-equally')
  @Permissions('restaurant_write')
  async splitEqually(@Body() dto: SplitEquallyDto, @Request() req) {
    return this.billSplitsService.splitEqually(
      dto,
      req.user.userId,
      req.user.tenantId,
    );
  }

  @Post('split-by-items')
  @Permissions('restaurant_write')
  async splitByItems(@Body() dto: SplitByItemsDto, @Request() req) {
    return this.billSplitsService.splitByItems(
      dto,
      req.user.userId,
      req.user.tenantId,
    );
  }

  @Post('custom')
  @Permissions('restaurant_write')
  async createCustomSplit(@Body() dto: CreateBillSplitDto, @Request() req) {
    return this.billSplitsService.createCustomSplit(
      dto,
      req.user.userId,
      req.user.tenantId,
    );
  }

  @Post('pay-part')
  @Permissions('restaurant_write')
  async paySplitPart(@Body() dto: PaySplitPartDto, @Request() req) {
    return this.billSplitsService.paySplitPart(
      dto,
      req.user.userId,
      req.user.tenantId,
    );
  }

  @Patch('update-tip')
  @Permissions('restaurant_write')
  async updatePartTip(@Body() dto: UpdateSplitPartTipDto, @Request() req) {
    return this.billSplitsService.updatePartTip(dto, req.user.tenantId);
  }

  @Get()
  @Permissions('restaurant_read')
  async findAll(@Request() req) {
    return this.billSplitsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Permissions('restaurant_read')
  async findById(@Param('id') id: string, @Request() req) {
    return this.billSplitsService.findById(id, req.user.tenantId);
  }

  @Get('order/:orderId')
  @Permissions('restaurant_read')
  async findByOrderId(@Param('orderId') orderId: string, @Request() req) {
    return this.billSplitsService.findByOrderId(orderId, req.user.tenantId);
  }

  @Delete(':id')
  @Permissions('restaurant_write')
  async cancelSplit(@Param('id') id: string, @Request() req) {
    await this.billSplitsService.cancelSplit(id, req.user.tenantId);
    return { message: 'Bill split cancelled successfully' };
  }
}
