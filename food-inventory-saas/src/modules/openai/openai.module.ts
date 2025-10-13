import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { SuperAdminModule } from '../super-admin/super-admin.module';

@Module({
  imports: [SuperAdminModule], // It needs access to SuperAdminService
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
