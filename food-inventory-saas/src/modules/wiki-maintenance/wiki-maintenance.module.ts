import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../../auth/auth.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { WikiMaintenanceController } from './wiki-maintenance.controller';
import { WikiMaintenanceService } from './wiki-maintenance.service';
import {
  WikiSyncEvent,
  WikiSyncEventSchema,
} from './schemas/wiki-sync-event.schema';
import {
  WikiMaintenanceConfig,
  WikiMaintenanceConfigSchema,
} from './schemas/wiki-maintenance-config.schema';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => SuperAdminModule),
    MongooseModule.forFeature([
      { name: WikiSyncEvent.name, schema: WikiSyncEventSchema },
      { name: WikiMaintenanceConfig.name, schema: WikiMaintenanceConfigSchema },
    ]),
  ],
  controllers: [WikiMaintenanceController],
  providers: [WikiMaintenanceService],
  exports: [WikiMaintenanceService],
})
export class WikiMaintenanceModule {}
