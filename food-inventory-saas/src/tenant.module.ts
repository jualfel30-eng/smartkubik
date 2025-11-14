import { Module } from "@nestjs/common";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { SharedModule } from "./common/shared.module";
import { MailModule } from "./modules/mail/mail.module";
import { PayrollEmployeesModule } from "./modules/payroll-employees/payroll-employees.module";

@Module({
  imports: [SharedModule, MailModule, PayrollEmployeesModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [],
})
export class TenantModule {}
