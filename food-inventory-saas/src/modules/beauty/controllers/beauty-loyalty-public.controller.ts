import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BeautyLoyaltyService } from '../services/beauty-loyalty.service';

@ApiTags('Beauty Loyalty (Public)')
// @Public()
@Controller('public/beauty-loyalty')
export class BeautyLoyaltyPublicController {
  constructor(private readonly beautyLoyaltyService: BeautyLoyaltyService) {}

  @Get(':tenantId/balance')
  @ApiOperation({
    summary: 'Consultar balance de puntos (público - por teléfono)',
  })
  async getBalance(
    @Param('tenantId') tenantId: string,
    @Query('clientPhone') clientPhone: string,
  ) {
    if (!clientPhone) {
      return { error: 'clientPhone query parameter is required' };
    }

    return this.beautyLoyaltyService.getBalance(tenantId, clientPhone);
  }
}
