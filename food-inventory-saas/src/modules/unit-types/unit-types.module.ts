import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UnitType, UnitTypeSchema } from "../../schemas/unit-type.schema";
import { UnitTypesService } from "./unit-types.service";
import { UnitTypesController } from "./unit-types.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitType.name, schema: UnitTypeSchema },
    ]),
  ],
  controllers: [UnitTypesController],
  providers: [UnitTypesService],
  exports: [UnitTypesService],
})
export class UnitTypesModule {}
