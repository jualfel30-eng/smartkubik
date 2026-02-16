import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InvestmentsController } from "./investments.controller";
import { InvestmentsService } from "./investments.service";
import {
  Investment,
  InvestmentSchema,
} from "../../schemas/investment.schema";
import { AuthModule } from "../../auth/auth.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investment.name, schema: InvestmentSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
