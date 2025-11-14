import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from "../../schemas/employee-profile.schema";
import {
  EmployeeContract,
  EmployeeContractSchema,
} from "../../schemas/employee-contract.schema";
import {
  PayrollStructure,
  PayrollStructureSchema,
} from "../../schemas/payroll-structure.schema";
import { PayrollEmployeesService } from "./payroll-employees.service";
import { PayrollEmployeesController } from "./payroll-employees.controller";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import { PayrollStructuresListener } from "./payroll-structures.listener";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeContract.name, schema: EmployeeContractSchema },
      { name: PayrollStructure.name, schema: PayrollStructureSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [PayrollEmployeesController],
  providers: [PayrollEmployeesService, PayrollStructuresListener],
  exports: [PayrollEmployeesService],
})
export class PayrollEmployeesModule {}
