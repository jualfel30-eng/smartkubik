import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorefrontConfig } from '../../../schemas/storefront-config.schema';

class UpdateRestaurantConfigDto {
  @IsOptional()
  @IsObject()
  restaurantConfig?: Record<string, any>;
}

/**
 * Gestión de la configuración del storefront de restaurante.
 * Lee y actualiza el campo `restaurantConfig` dentro de StorefrontConfig.
 */
@ApiTags('Restaurant - Config (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant-storefront/config')
export class RestaurantConfigController {
  constructor(
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<any>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración del storefront de restaurante' })
  async getConfig(@Request() req) {
    const tenantId = new Types.ObjectId(req.user.tenantId);
    const config = await this.storefrontConfigModel
      .findOne({ tenantId })
      .lean()
      .exec();
    return config ?? {};
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar configuración del storefront de restaurante' })
  async updateConfig(@Body() dto: UpdateRestaurantConfigDto, @Request() req) {
    const tenantId = new Types.ObjectId(req.user.tenantId);

    const updated = await this.storefrontConfigModel.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          templateType: 'restaurant',
          ...(dto.restaurantConfig && { restaurantConfig: dto.restaurantConfig }),
        },
      },
      { new: true, upsert: true },
    ).lean().exec();

    return updated;
  }
}
