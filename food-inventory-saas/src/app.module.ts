import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule, getModelToken } from "@nestjs/mongoose";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { WinstonModule } from "nest-winston";
import { BullModule } from "@nestjs/bullmq";
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
import { WhapiModule } from "./modules/whapi/whapi.module";
import { ServicePackagesModule } from "./modules/service-packages/service-packages.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { HospitalityIntegrationsModule } from "./modules/hospitality-integrations/hospitality-integrations.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { createWinstonLoggerOptions } from "./config/logger.config";
import {
  GlobalSetting,
  GlobalSettingDocument,
  GlobalSettingSchema,
} from "./schemas/global-settings.schema";
import { FeatureFlagsModule as FeatureFlagsGlobalModule } from "./config/feature-flags.module";
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
        limit: 10, // 10 requests por minuto
      },
      {
        name: "medium",
        ttl: 600000, // 10 minutos
        limit: 100, // 100 requests por 10 minutos
      },
      {
        name: "long",
        ttl: 3600000, // 1 hora
        limit: 500, // 500 requests por hora
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
    SubscriptionPlansModule,
    RatingsModule,
    TodosModule,
    SeederModule,
    DeliveryModule,
    ExchangeRateModule,
    BankAccountsModule,
    BankReconciliationModule,
    AppointmentsModule,
    ServicePackagesModule,
    LoyaltyModule,
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
  ],
  controllers: [AppController, TenantController],
  providers: [
    AppService,
    TenantService,
    // Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
