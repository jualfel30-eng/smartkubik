import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TipsController } from "./tips.controller";
import { TipsService } from "./tips.service";
import { TipsDistributionJob } from "./tips-distribution.job";
import {
  TipsDistributionRule,
  TipsDistributionRuleSchema,
} from "../../schemas/tips-distribution-rule.schema";
import { TipsReport, TipsReportSchema } from "../../schemas/tips-report.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { Shift, ShiftSchema } from "../../schemas/shift.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Role, RoleSchema } from "../../schemas/role.schema";
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
      { name: "Role", schema: RoleSchema },
    ]),
    PermissionsModule,
  ],
  controllers: [TipsController],
  providers: [TipsService, TipsDistributionJob],
  exports: [TipsService],
})
export class TipsModule { }
