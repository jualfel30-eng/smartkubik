import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OpenaiService } from "./openai.service";
import {
  GlobalSetting,
  GlobalSettingSchema,
} from "../../schemas/global-settings.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalSetting.name, schema: GlobalSettingSchema },
    ]),
  ],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
