import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';
import { Payable, PayableSchema } from '../../schemas/payable.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Payable.name, schema: PayableSchema },
      { name: Tenant.name, schema: TenantSchema }, // For TenantGuard
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}