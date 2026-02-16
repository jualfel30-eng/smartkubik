import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// Controllers
import { CommissionController } from "./controllers/commission.controller";
import { GoalController } from "./controllers/goal.controller";
import { BonusController } from "./controllers/bonus.controller";

// Services
import { CommissionService } from "./services/commission.service";
import { GoalService } from "./services/goal.service";
import { BonusService } from "./services/bonus.service";

// Listeners
import { CommissionsListener } from "./listeners/commissions.listener";

// Schemas
import {
  CommissionPlan,
  CommissionPlanSchema,
} from "../../schemas/commission-plan.schema";
import {
  EmployeeCommissionConfig,
  EmployeeCommissionConfigSchema,
} from "../../schemas/employee-commission-config.schema";
import {
  CommissionRecord,
  CommissionRecordSchema,
} from "../../schemas/commission-record.schema";
import { SalesGoal, SalesGoalSchema } from "../../schemas/sales-goal.schema";
import {
  GoalProgress,
  GoalProgressSchema,
} from "../../schemas/goal-progress.schema";
import { BonusRecord, BonusRecordSchema } from "../../schemas/bonus-record.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { Role, RoleSchema } from "../../schemas/role.schema";

// Modules
import { PermissionsModule } from "../permissions/permissions.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      // Commission schemas
      { name: CommissionPlan.name, schema: CommissionPlanSchema },
      { name: EmployeeCommissionConfig.name, schema: EmployeeCommissionConfigSchema },
      { name: CommissionRecord.name, schema: CommissionRecordSchema },
      // Goal schemas
      { name: SalesGoal.name, schema: SalesGoalSchema },
      { name: GoalProgress.name, schema: GoalProgressSchema },
      // Bonus schema
      { name: BonusRecord.name, schema: BonusRecordSchema },
      // Related schemas
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: "Role", schema: RoleSchema },
    ]),
    PermissionsModule,
  ],
  controllers: [CommissionController, GoalController, BonusController],
  providers: [CommissionService, GoalService, BonusService, CommissionsListener],
  exports: [CommissionService, GoalService, BonusService],
})
export class CommissionsModule {}
