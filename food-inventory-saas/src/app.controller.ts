import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check del API' })
  @ApiResponse({ status: 200, description: 'API funcionando correctamente' })
  getHello() {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Estado de salud del sistema' })
  @ApiResponse({ status: 200, description: 'Estado del sistema' })
  getHealth() {
    return this.appService.getHealth();
  }
}

