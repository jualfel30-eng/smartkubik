import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  PayrollLocalization,
  PayrollLocalizationSchema,
} from "../../schemas/payroll-localization.schema";
import { PayrollLocalizationsService } from "./payroll-localizations.service";
import { PayrollLocalizationsController } from "./payroll-localizations.controller";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: PayrollLocalization.name, schema: PayrollLocalizationSchema },
    ]),
  ],
  providers: [PayrollLocalizationsService],
  controllers: [PayrollLocalizationsController],
  exports: [PayrollLocalizationsService],
})
export class PayrollLocalizationsModule {}
