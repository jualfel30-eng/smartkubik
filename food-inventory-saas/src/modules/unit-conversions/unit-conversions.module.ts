import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UnitConversionsController } from "./unit-conversions.controller";
import { UnitConversionsService } from "./unit-conversions.service";
import { AuthModule } from "../../auth/auth.module";
import { RolesModule } from "../roles/roles.module";
import {
  UnitConversion,
  UnitConversionSchema,
} from "../../schemas/unit-conversion.schema";

@Module({
  imports: [
    AuthModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: UnitConversion.name, schema: UnitConversionSchema },
    ]),
  ],
  controllers: [UnitConversionsController],
  providers: [UnitConversionsService],
  exports: [UnitConversionsService],
})
export class UnitConversionsModule {}
