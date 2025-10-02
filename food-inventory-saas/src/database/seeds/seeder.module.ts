import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { PermissionsSeed } from './permissions.seed';
import { RolesSeed } from './roles.seed';

@Module({
  providers: [SeederService, PermissionsSeed, RolesSeed],
  exports: [SeederService],
})
export class SeederModule {}