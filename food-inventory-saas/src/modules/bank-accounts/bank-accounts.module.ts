import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccount, BankAccountSchema } from '../../schemas/bank-account.schema';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    AuthModule,
    PermissionsModule,
  ],
  controllers: [BankAccountsController],
  providers: [BankAccountsService],
  exports: [BankAccountsService],
})
export class BankAccountsModule {}
