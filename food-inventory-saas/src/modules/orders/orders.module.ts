import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrdersController } from "./orders.controller";
import { OrdersPublicController } from "./orders-public.controller";
import { OrdersService } from "./orders.service";
import { DiscountService } from "./services/discount.service";
import { WhatsAppOrderNotificationsService } from "./whatsapp-order-notifications.service";
import { AuthModule } from "../../auth/auth.module";
import { InventoryModule } from "../inventory/inventory.module";
import { CustomersModule } from "../customers/customers.module";
import { Order, OrderSchema } from "../../schemas/order.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import {
  BankAccount,
  BankAccountSchema,
} from "../../schemas/bank-account.schema";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { Modifier, ModifierSchema } from "../../schemas/modifier.schema";
import {
  TenantPaymentConfig,
  TenantPaymentConfigSchema,
} from "../../schemas/tenant-payment-config.schema";
import {
  StorefrontConfig,
  StorefrontConfigSchema,
} from "../../schemas/storefront-config.schema";
import { Table, TableSchema } from "../../schemas/table.schema";
import { AccountingModule } from "../accounting/accounting.module";
import { RolesModule } from "../roles/roles.module";
import { PaymentsModule } from "../payments/payments.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { ShiftsModule } from "../shifts/shifts.module";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import { TransactionHistoryModule } from "../transaction-history/transaction-history.module";
import { CouponsModule } from "../coupons/coupons.module";
import { PromotionsModule } from "../promotions/promotions.module";
import { WhapiModule } from "../whapi/whapi.module";
import { MarketingModule } from "../marketing/marketing.module";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    InventoryModule,
    forwardRef(() => CustomersModule),
    AccountingModule,
    RolesModule,
    PaymentsModule,
    DeliveryModule,
    ShiftsModule,
    ExchangeRateModule,
    TransactionHistoryModule,
    CouponsModule,
    PromotionsModule,
    WhapiModule,
    forwardRef(() => MarketingModule),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: BankAccount.name, schema: BankAccountSchema },
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
      { name: Modifier.name, schema: ModifierSchema },
      { name: TenantPaymentConfig.name, schema: TenantPaymentConfigSchema },
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
      { name: Table.name, schema: TableSchema },
    ]),
  ],
  controllers: [OrdersController, OrdersPublicController],
  providers: [
    OrdersService,
    DiscountService,
    WhatsAppOrderNotificationsService,
  ],
  exports: [
    OrdersService,
    DiscountService,
    WhatsAppOrderNotificationsService,
  ],
})
export class OrdersModule { }
