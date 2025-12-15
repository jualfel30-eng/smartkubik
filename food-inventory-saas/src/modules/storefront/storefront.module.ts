import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StorefrontController } from "./storefront.controller";
import { StorefrontPublicController } from "./storefront-public.controller";
import { StorefrontService } from "./storefront.service";
import { AuthModule } from "../../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import {
  StorefrontConfig,
  StorefrontConfigSchema,
} from "../../schemas/storefront-config.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    RolesModule,
    MongooseModule.forFeature([
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [StorefrontController, StorefrontPublicController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
