import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SuperAdminController } from "./super-admin.controller";
import { SuperAdminService } from "./super-admin.service";
import {
  GlobalSetting,
  GlobalSettingSchema,
} from "../../schemas/global-settings.schema";
import { AppointmentsModule } from "../appointments/appointments.module";
import { BankAccountsModule } from "../bank-accounts/bank-accounts.module";
import { BillSplitsModule } from "../bill-splits/bill-splits.module";
import { AccountingModule } from "../accounting/accounting.module";
import { CustomersModule } from "../customers/customers.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { EventsModule } from "../events/events.module";
import { InventoryModule } from "../inventory/inventory.module";
import { KitchenDisplayModule } from "../kitchen-display/kitchen-display.module";
import { ModifierGroupsModule } from "../modifier-groups/modifier-groups.module";
import { OrdersModule } from "../orders/orders.module";
import { PayablesModule } from "../payables/payables.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { ProductsModule } from "../products/products.module";
import { PurchasesModule } from "../purchases/purchases.module";
import { RecurringPayablesModule } from "../recurring-payables/recurring-payables.module";
import { RolesModule } from "../roles/roles.module";
import { ShiftsModule } from "../shifts/shifts.module";
import { StorefrontModule } from "../storefront/storefront.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { TablesModule } from "../tables/tables.module";
import { TodosModule } from "../todos/todos.module";
import { UsersModule } from "../users/users.module";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { AssistantModule } from "../assistant/assistant.module";
import { AuthModule } from "../../auth/auth.module";
import { FeatureFlagsService } from "../../config/feature-flags.service";
import { SocialLinksModule } from "../social-links/social-links.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalSetting.name, schema: GlobalSettingSchema },
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => KnowledgeBaseModule), // <--- AÑADIDO
    forwardRef(() => AssistantModule),
    forwardRef(() => AppointmentsModule),
    BankAccountsModule,
    BillSplitsModule,
    forwardRef(() => AccountingModule),
    forwardRef(() => CustomersModule),
    DeliveryModule,
    EventsModule,
    forwardRef(() => InventoryModule),
    KitchenDisplayModule,
    ModifierGroupsModule,
    forwardRef(() => OrdersModule),
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
    forwardRef(() => UsersModule),
    SocialLinksModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, FeatureFlagsService],
  exports: [SuperAdminService],
})
export class SuperAdminModule { }
