
import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Public } from '../../decorators/public.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Public()
  findAll() {
    const permissions = this.permissionsService.findAll();
    return { success: true, data: permissions };
  }
}
