import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { CreateTenantWithAdminDto } from './dto/onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo tenant y su administrador' })
  @ApiResponse({ status: 201, description: 'Tenant y administrador creados exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  async register(@Body() createTenantDto: CreateTenantWithAdminDto) {
    return this.onboardingService.createTenantAndAdmin(createTenantDto);
  }
}
