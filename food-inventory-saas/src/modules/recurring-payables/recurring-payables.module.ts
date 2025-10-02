import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringPayablesController } from './recurring-payables.controller';
import { RecurringPayablesService } from './recurring-payables.service';
import { RecurringPayable, RecurringPayableSchema } from '../../schemas/recurring-payable.schema';
import { Payable, PayableSchema } from '../../schemas/payable.schema';
import { PayablesModule } from '../payables/payables.module';
import { CustomersModule } from '../customers/customers.module';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecurringPayable.name, schema: RecurringPayableSchema },
      { name: Payable.name, schema: PayableSchema }, // Needed to create new payables
      { name: Tenant.name, schema: TenantSchema }, // Needed for TenantGuard
    ]),
    PayablesModule, // Import PayablesModule if service is used
    CustomersModule,
  ],
  controllers: [RecurringPayablesController],
  providers: [RecurringPayablesService],
})
export class RecurringPayablesModule {}