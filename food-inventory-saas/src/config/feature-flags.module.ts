import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FeatureFlagsService } from "./feature-flags.service";
import {
  GlobalSetting,
  GlobalSettingSchema,
} from "../schemas/global-settings.schema";

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalSetting.name, schema: GlobalSettingSchema },
    ]),
  ],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
