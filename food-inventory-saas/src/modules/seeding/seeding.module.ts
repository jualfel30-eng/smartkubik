import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SeedingService } from "./seeding.service";
import { SeedingController } from "./seeding.controller";
import { SeederModule } from "../../database/seeds/seeder.module";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
    ]),
    SeederModule,
  ],
  controllers: [SeedingController],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}
