import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule, getModelToken } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { WinstonModule } from "nest-winston";
import { BullModule } from "@nestjs/bullmq";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Model } from "mongoose";
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
import { PayablesModule } from "./modules/payables/payables.module";
import { RecurringPayablesModule } from "./modules/recurring-payables/recurring-payables.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { RolesModule } from "./modules/roles/roles.module";
import { PermissionsModule } from "./modules/permissions/permissions.module";
import { SharedModule } from "./common/shared.module";
import { ShiftsModule } from "./modules/shifts/shifts.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { MailModule } from "./modules/mail/mail.module";
import { SuperAdminModule } from "./modules/super-admin/super-admin.module";
import { SubscriptionPlansModule } from "./modules/subscription-plans/subscription-plans.module";
import { RatingsModule } from "./modules/ratings/ratings.module";
import { TodosModule } from "./modules/todos/todos.module";
import { SeederModule } from "./database/seeds/seeder.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { ExchangeRateModule } from "./modules/exchange-rate/exchange-rate.module";
import { BankAccountsModule } from "./modules/bank-accounts/bank-accounts.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { StorefrontModule } from "./modules/storefront/storefront.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { UsersModule } from "./modules/users/users.module";
import { TablesModule } from "./modules/tables/tables.module";
import { ModifierGroupsModule } from "./modules/modifier-groups/modifier-groups.module";
import { BillSplitsModule } from "./modules/bill-splits/bill-splits.module";
import { KitchenDisplayModule } from "./modules/kitchen-display/kitchen-display.module";
import { ChatModule } from "./chat/chat.module";
import { OpenaiModule } from "./modules/openai/openai.module";
import { VectorDbModule } from "./modules/vector-db/vector-db.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/knowledge-base.module";
import { AssistantModule } from "./modules/assistant/assistant.module";
import { BankReconciliationModule } from "./modules/bank-reconciliation/bank-reconciliation.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { PayrollEmployeesModule } from "./modules/payroll-employees/payroll-employees.module";
import { TipsModule } from "./modules/tips/tips.module";
import { ReservationsModule } from "./modules/reservations/reservations.module";
import { WhapiModule } from "./modules/whapi/whapi.module";
import { ServicePackagesModule } from "./modules/service-packages/service-packages.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { PromotionsModule } from "./modules/promotions/promotions.module";
import { HospitalityIntegrationsModule } from "./modules/hospitality-integrations/hospitality-integrations.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { HealthModule } from "./modules/health/health.module";
import { ConsumablesModule } from "./modules/consumables/consumables.module";
import { SuppliesModule } from "./modules/supplies/supplies.module";
import { UnitConversionsModule } from "./modules/unit-conversions/unit-conversions.module";
import { UnitTypesModule } from "./modules/unit-types/unit-types.module";
import { LiquidationsModule } from "./modules/liquidations/liquidations.module";
import { BillOfMaterialsModule } from "./modules/production/bill-of-materials.module";
import { WorkCenterModule } from "./modules/production/work-center.module";
import { RoutingModule } from "./modules/production/routing.module";
import { ProductionVersionModule } from "./modules/production/production-version.module";
import { ManufacturingOrderModule } from "./modules/production/manufacturing-order.module";
import { QualityControlModule } from "./modules/production/quality-control.module";
import { createWinstonLoggerOptions } from "./config/logger.config";
import {
  GlobalSetting,
  GlobalSettingDocument,
  GlobalSettingSchema,
} from "./schemas/global-settings.schema";
import { FeatureFlagsModule as FeatureFlagsGlobalModule } from "./config/feature-flags.module";
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";
import { PayrollCalendarModule } from "./modules/payroll-calendar/payroll-calendar.module";
import { MenuEngineeringModule } from "./modules/menu-engineering/menu-engineering.module";
import { WaitListModule } from "./modules/wait-list/wait-list.module";
import { WasteModule } from "./modules/waste/waste.module";
import { ServerPerformanceModule } from "./modules/server-performance/server-performance.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { MigrationsModule } from "./database/migrations/migrations.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { PayrollLocalizationsModule } from "./modules/payroll-localizations/payroll-localizations.module";
import { TransactionHistoryModule } from "./modules/transaction-history/transaction-history.module";
import { ProductAffinityModule } from "./modules/product-affinity/product-affinity.module";
import { ProductCampaignModule } from "./modules/product-campaign/product-campaign.module";
import { PayrollReportsModule } from "./modules/payroll-reports/payroll-reports.module";
import { PayrollWebhooksModule } from "./modules/payroll-webhooks/payroll-webhooks.module";
import { UserThrottlerGuard } from "./guards/user-throttler.guard";
import { AuditLogModule } from "./modules/audit-log/audit-log.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SecurityMonitoringModule } from "./modules/security-monitoring/security-monitoring.module";
import { WarehousesModule } from "./modules/warehouses/warehouses.module";
// import { BillingModule } from "./modules/billing/billing.module"; // TODO: Completar implementación - Ver ROADMAP_ACCOUNTING_ERP.md

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    WinstonModule.forRootAsync({
      useFactory: () => createWinstonLoggerOptions(),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isTestEnv =
          process.env.NODE_ENV === "test" || !!process.env.JEST_WORKER_ID;
        const primaryUri = configService.get<string>("MONGODB_URI");
        const testUri =
          configService.get<string>("MONGODB_TEST_URI") ||
          "mongodb://127.0.0.1:27017/food-inventory-test?tls=false";

        const uri = isTestEnv ? testUri : primaryUri;

        if (!uri) {
          throw new Error(
            "No MongoDB URI configured. Ensure MONGODB_URI or MONGODB_TEST_URI is set.",
          );
        }

        console.log(
          `--- Connecting to MongoDB (${isTestEnv ? "test" : "default"}) at:`,
          uri,
          "---",
        );
        return { uri };
      },
      inject: [ConfigService],
    }),
    // Rate Limiting Configuration
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 60000, // 1 minuto
        limit: process.env.NODE_ENV === "production" ? 50 : 200, // 200 requests/min en dev, 50 en prod
      },
      {
        name: "medium",
        ttl: 600000, // 10 minutos
        limit: process.env.NODE_ENV === "production" ? 300 : 1000, // 1000 requests/10min en dev, 300 en prod
      },
      {
        name: "long",
        ttl: 3600000, // 1 hora
        limit: process.env.NODE_ENV === "production" ? 1000 : 3000, // 3000 requests/hora en dev, 1000 en prod
      },
    ]),
    ...(process.env.DISABLE_BULLMQ === "true"
      ? []
      : [
          BullModule.forRootAsync({
            imports: [
              ConfigModule,
              MongooseModule.forFeature([
                { name: GlobalSetting.name, schema: GlobalSettingSchema },
              ]),
            ],
            useFactory: async (
              configService: ConfigService,
              globalSettingModel: Model<GlobalSettingDocument>,
            ) => {
              const prefix =
                configService.get<string>("BULLMQ_PREFIX") || "food_inventory";
              const defaultJobOptions = {
                removeOnComplete: 200,
                removeOnFail: 200,
                attempts: 3,
                backoff: {
                  type: "exponential",
                  delay: 3000,
                },
              };

              const buildConnectionFromUrl = (url: string) => {
                if (!url) {
                  throw new Error("Redis URL is empty");
                }

                let normalized = url.trim();
                if (!normalized.includes("://")) {
                  normalized = `redis://${normalized}`;
                }

                const parsed = new URL(normalized);
                const connection: Record<string, any> = {
                  host: parsed.hostname,
                  port: parsed.port ? Number(parsed.port) : 6379,
                };

                if (parsed.username) {
                  connection.username = decodeURIComponent(parsed.username);
                }

                if (parsed.password) {
                  connection.password = decodeURIComponent(parsed.password);
                }

                if (parsed.pathname && parsed.pathname !== "/") {
                  const dbValue = Number(parsed.pathname.replace("/", ""));
                  if (!Number.isNaN(dbValue)) {
                    connection.db = dbValue;
                  }
                }

                const tlsQuery =
                  parsed.searchParams.get("tls") ||
                  parsed.searchParams.get("ssl");

                // Check if TLS is explicitly disabled
                const tlsExplicitlyDisabled =
                  tlsQuery && tlsQuery.toLowerCase() === "false";

                const forceTls =
                  !tlsExplicitlyDisabled &&
                  (parsed.protocol === "rediss:" ||
                    (tlsQuery && tlsQuery.toLowerCase() === "true") ||
                    parsed.hostname.endsWith(".redis-cloud.com") ||
                    configService.get<string>("REDIS_TLS") === "true");

                if (forceTls) {
                  connection.tls = {
                    rejectUnauthorized: false,
                    servername: parsed.hostname,
                  };
                }

                return connection;
              };

              const envRedisUrl = configService
                .get<string>("REDIS_URL")
                ?.trim();

              let resolvedRedisUrl = envRedisUrl;

              if (!resolvedRedisUrl) {
                const redisUrlSetting = await globalSettingModel
                  .findOne({ key: "REDIS_URL" })
                  .lean()
                  .exec();
                resolvedRedisUrl = redisUrlSetting?.value?.trim();
              }

              if (resolvedRedisUrl) {
                return {
                  connection: buildConnectionFromUrl(resolvedRedisUrl),
                  prefix,
                  defaultJobOptions,
                };
              }

              const connection: Record<string, any> = {
                host: configService.get<string>("REDIS_HOST") || "127.0.0.1",
                port: Number(configService.get<string>("REDIS_PORT") || 6379),
              };

              const username = configService.get<string>("REDIS_USERNAME");
              if (username) {
                connection.username = username;
              }

              const password = configService.get<string>("REDIS_PASSWORD");
              if (password) {
                connection.password = password;
              }

              const db = configService.get<string>("REDIS_DB");
              if (db) {
                const dbValue = Number(db);
                connection.db = Number.isNaN(dbValue) ? 0 : dbValue;
              }

              if (configService.get<string>("REDIS_TLS") === "true") {
                connection.tls = {};
              }

              return {
                connection,
                prefix,
                defaultJobOptions,
              };
            },
            inject: [ConfigService, getModelToken(GlobalSetting.name)],
          }),
        ]),
    FeatureFlagsGlobalModule,
    FeatureFlagsModule,
    HealthModule,
    AuthModule,
    OnboardingModule,
    ProductsModule,
    InventoryModule,
    ConsumablesModule,
    SuppliesModule,
    UnitConversionsModule,
    UnitTypesModule,
    BillOfMaterialsModule,
    WorkCenterModule,
    RoutingModule,
    ProductionVersionModule,
    ManufacturingOrderModule,
    QualityControlModule,
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
    SubscriptionPlansModule,
    RatingsModule,
    TodosModule,
    SeederModule,
    DeliveryModule,
    ExchangeRateModule,
    BankAccountsModule,
    BankReconciliationModule,
    LiquidationsModule,
    PayrollModule,
    PayrollEmployeesModule,
    TipsModule,
    ReservationsModule,
    AppointmentsModule,
    ServicePackagesModule,
    LoyaltyModule,
    CouponsModule,
    PromotionsModule,
    HospitalityIntegrationsModule,
    StorefrontModule,
    OrganizationsModule,
    UsersModule,
    TablesModule,
    ModifierGroupsModule,
    BillSplitsModule,
    KitchenDisplayModule,
    ChatModule,
    OpenaiModule,
    VectorDbModule,
    KnowledgeBaseModule,
    AssistantModule,
    WhapiModule,
    LocationsModule,
    PayrollCalendarModule,
    MenuEngineeringModule,
    WaitListModule,
    WasteModule,
    ServerPerformanceModule,
    ReviewsModule,
    MarketingModule,
    UploadsModule,
    PayrollLocalizationsModule,
    PayrollWebhooksModule,
    PayrollReportsModule,
    MigrationsModule,
    TransactionHistoryModule,
    ProductAffinityModule,
    ProductCampaignModule,
    AuditLogModule,
    NotificationsModule,
    SecurityMonitoringModule,
    WarehousesModule,
    // BillingModule, // TODO: Completar implementación - Ver ROADMAP_ACCOUNTING_ERP.md
  ],
  controllers: [AppController, TenantController],
  providers: [
    AppService,
    TenantService,
    // Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
