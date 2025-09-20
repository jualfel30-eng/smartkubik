import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { SharedModule } from "./common/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: []
})
export class TenantModule {}
