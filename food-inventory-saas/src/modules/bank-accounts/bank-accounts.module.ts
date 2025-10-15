import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccount, BankAccountSchema } from '../../schemas/bank-account.schema';
import { BankReconciliation, BankReconciliationSchema } from '../../schemas/bank-reconciliation.schema';
import { BankStatement, BankStatementSchema } from '../../schemas/bank-statement.schema';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { ModuleAccessGuard } from '../../guards/module-access.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: BankReconciliation.name, schema: BankReconciliationSchema },
      { name: BankStatement.name, schema: BankStatementSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [BankAccountsController],
  providers: [BankAccountsService, ModuleAccessGuard],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
