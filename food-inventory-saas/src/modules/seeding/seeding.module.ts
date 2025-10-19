import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SeedingService } from "./seeding.service";
import {
  ChartOfAccounts,
  ChartOfAccountsSchema,
} from "../../schemas/chart-of-accounts.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccounts.name, schema: ChartOfAccountsSchema },
    ]),
  ],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}
