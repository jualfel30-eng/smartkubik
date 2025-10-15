
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { GlobalSetting, GlobalSettingSchema } from '../../schemas/global-settings.schema';
import { AppointmentsModule } from '../appointments/appointments.module';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';
import { BillSplitsModule } from '../bill-splits/bill-splits.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CustomersModule } from '../customers/customers.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { EventsModule } from '../events/events.module';
import { InventoryModule } from '../inventory/inventory.module';
import { KitchenDisplayModule } from '../kitchen-display/kitchen-display.module';
import { ModifierGroupsModule } from '../modifier-groups/modifier-groups.module';
import { OrdersModule } from '../orders/orders.module';
import { PayablesModule } from '../payables/payables.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ProductsModule } from '../products/products.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { RecurringPayablesModule } from '../recurring-payables/recurring-payables.module';
import { RolesModule } from '../roles/roles.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { TablesModule } from '../tables/tables.module';
import { TodosModule } from '../todos/todos.module';
import { UsersModule } from '../users/users.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalSetting.name, schema: GlobalSettingSchema },
    ]),
    AuthModule,
    KnowledgeBaseModule, // <--- AÑADIDO
    AppointmentsModule,
    BankAccountsModule,
    BillSplitsModule,
    AccountingModule,
    CustomersModule,
    DeliveryModule,
    EventsModule,
    InventoryModule,
    KitchenDisplayModule,
    ModifierGroupsModule,
    OrdersModule,
    PayablesModule,
    AnalyticsModule,
    ProductsModule,
    PurchasesModule,
    RecurringPayablesModule,
    RolesModule,
    ShiftsModule,
    StorefrontModule,
    SuppliersModule,
    TablesModule,
    TodosModule,
    UsersModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
