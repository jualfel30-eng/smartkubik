import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { Payable, PayableSchema } from '../../schemas/payable.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Event, EventSchema } from '../../schemas/event.schema';
import { AccountingModule } from '../accounting/accounting.module'; // Import AccountingModule
import { EventsService } from '../events/events.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payable.name, schema: PayableSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    AccountingModule, // Add AccountingModule here
  ],
  controllers: [PayablesController],
  providers: [PayablesService, EventsService],
  exports: [PayablesService], // Export PayablesService to be used in other modules
})
export class PayablesModule {}
