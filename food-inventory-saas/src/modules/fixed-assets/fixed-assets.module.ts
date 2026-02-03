import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FixedAssetsController } from "./fixed-assets.controller";
import { FixedAssetsService } from "./fixed-assets.service";
import {
  FixedAsset,
  FixedAssetSchema,
} from "../../schemas/fixed-asset.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FixedAsset.name, schema: FixedAssetSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [FixedAssetsController],
  providers: [FixedAssetsService],
  exports: [FixedAssetsService],
})
export class FixedAssetsModule {}
