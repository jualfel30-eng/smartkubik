import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
