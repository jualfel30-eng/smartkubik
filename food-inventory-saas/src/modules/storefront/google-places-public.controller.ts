import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { GooglePlacesService } from './google-places.service';

@ApiTags('Google Places (Public)')
@Public()
@Controller('public/google-places')
export class GooglePlacesPublicController {
  constructor(private readonly googlePlacesService: GooglePlacesService) {}

  @Get(':placeId')
  @ApiOperation({ summary: 'Obtener datos de Google Places (caché 24h)' })
  async getPlaceData(@Param('placeId') placeId: string) {
    try {
      const data = await this.googlePlacesService.getPlaceData(placeId);
      return { success: true, data };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
