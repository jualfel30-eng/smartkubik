import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SeederService } from "./seeder.service";
import { PermissionsSeed } from "./permissions.seed";
import { RolesSeed } from "./roles.seed";
import { UnitTypesSeed } from "./unit-types.seed";
import { UnitType, UnitTypeSchema } from "../../schemas/unit-type.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitType.name, schema: UnitTypeSchema },
    ]),
  ],
  providers: [SeederService, PermissionsSeed, RolesSeed, UnitTypesSeed],
  exports: [SeederService],
})
export class SeederModule {}
