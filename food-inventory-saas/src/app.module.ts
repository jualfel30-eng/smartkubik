import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { EventsModule } from "./modules/events/events.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { PurchasesModule } from "./modules/purchases/purchases.module";
import { AccountingModule } from "./modules/accounting/accounting.module";
import { TenantModule } from "./tenant.module";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";
import { PayablesModule } from './modules/payables/payables.module';
import { RecurringPayablesModule } from './modules/recurring-payables/recurring-payables.module';
import { ReportsModule } from "./modules/reports/reports.module";
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { SharedModule } from './common/shared.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MailModule } from './modules/mail/mail.module';
import { SuperAdminModule } from './super-admin/super-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>("MONGODB_URI");
        console.log("--- Connecting to MongoDB at:", uri, "---");
        return { uri };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    OnboardingModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
    PricingModule,
    PaymentsModule,
    DashboardModule,
    EventsModule,
    SuppliersModule,
    PurchasesModule,
    AccountingModule,
    TenantModule,
    PayablesModule,
    RecurringPayablesModule,
    ReportsModule,
    RolesModule,
    PermissionsModule,
    SharedModule,
    ShiftsModule,
    AnalyticsModule,
    MailModule,
    SuperAdminModule,
  ],
  controllers: [AppController, TenantController],
  providers: [AppService, TenantService],
})
export class AppModule {}
