import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TipsController } from "./tips.controller";
import { TipsService } from "./tips.service";
import {
  TipsDistributionRule,
  TipsDistributionRuleSchema,
} from "../../schemas/tips-distribution-rule.schema";
import {
  TipsReport,
  TipsReportSchema,
} from "../../schemas/tips-report.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { Shift, ShiftSchema } from "../../schemas/shift.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TipsDistributionRule.name, schema: TipsDistributionRuleSchema },
      { name: TipsReport.name, schema: TipsReportSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
