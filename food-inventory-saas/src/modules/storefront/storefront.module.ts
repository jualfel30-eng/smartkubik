import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StorefrontController } from "./storefront.controller";
import { StorefrontPublicController } from "./storefront-public.controller";
import { StorefrontService } from "./storefront.service";
import { GooglePlacesService } from "./google-places.service";
import { GooglePlacesPublicController } from "./google-places-public.controller";
import { AuthModule } from "../../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import {
  StorefrontConfig,
  StorefrontConfigSchema,
} from "../../schemas/storefront-config.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  GooglePlacesCache,
  GooglePlacesCacheSchema,
} from "../../schemas/google-places-cache.schema";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    RolesModule,
    MongooseModule.forFeature([
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: GooglePlacesCache.name, schema: GooglePlacesCacheSchema },
    ]),
  ],
  controllers: [
    StorefrontController,
    StorefrontPublicController,
    GooglePlacesPublicController,
  ],
  providers: [StorefrontService, GooglePlacesService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
