import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { Payable, PayableSchema } from '../../schemas/payable.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AccountingModule } from '../accounting/accounting.module'; // Import AccountingModule
import { EventsModule } from '../events/events.module'; // Import EventsModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payable.name, schema: PayableSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AccountingModule, // Add AccountingModule here
    EventsModule, // Add EventsModule here
  ],
  controllers: [PayablesController],
  providers: [PayablesService],
  exports: [PayablesService], // Export PayablesService to be used in other modules
})
export class PayablesModule {}
