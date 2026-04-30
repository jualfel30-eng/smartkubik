import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AssistantGateway } from "./assistant.gateway";
import { AssistantService } from "./assistant.service";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { OpenaiModule } from "../openai/openai.module";
import { AssistantController } from "./assistant.controller";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { Product, ProductSchema } from "../../schemas/product.schema";
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import {
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { Service, ServiceSchema } from "../../schemas/service.schema";
import { Resource, ResourceSchema } from "../../schemas/resource.schema";
import { Supplier, SupplierSchema } from "../../schemas/supplier.schema";
import { Customer, CustomerSchema } from "../../schemas/customer.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from "../../schemas/purchase-order.schema";
import {
  TransferOrder,
  TransferOrderSchema,
} from "../../schemas/transfer-order.schema";
import { Warehouse, WarehouseSchema } from "../../schemas/warehouse.schema";
import {
  BillOfMaterials,
  BillOfMaterialsSchema,
} from "../../schemas/bill-of-materials.schema";
import { AssistantToolsService } from "./assistant-tools.service";
import { AppointmentsModule } from "../appointments/appointments.module";
import { ExchangeRateModule } from "../exchange-rate/exchange-rate.module";
import { OrdersModule } from "../orders/orders.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { InventoryModule } from "../inventory/inventory.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { SuperAdminModule } from "../super-admin/super-admin.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { ProductsModule } from "../products/products.module";
import { PurchasesModule } from "../purchases/purchases.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";

// Tool services
import { SupplierToolsService } from "./tools/supplier-tools.service";
import { ProductToolsService } from "./tools/product-tools.service";
import { InventoryToolsService } from "./tools/inventory-tools.service";
import { PurchaseToolsService } from "./tools/purchase-tools.service";
import { RecipeToolsService } from "./tools/recipe-tools.service";
import { ReadToolsService } from "./tools/read-tools.service";
import { HelpDocsService } from "./help-docs.service";

@Module({
  imports: [
    KnowledgeBaseModule,
    OpenaiModule,
    AppointmentsModule,
    ExchangeRateModule,
    forwardRef(() => OrdersModule),
    DashboardModule,
    forwardRef(() => SuperAdminModule),
    InventoryModule,
    AnalyticsModule,
    forwardRef(() => SuppliersModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => PurchasesModule),
    IntelligenceModule,
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: TransferOrder.name, schema: TransferOrderSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: BillOfMaterials.name, schema: BillOfMaterialsSchema },
    ]),
  ],
  providers: [
    AssistantGateway,
    AssistantService,
    AssistantToolsService,
    // CRUD Tool Services
    SupplierToolsService,
    ProductToolsService,
    InventoryToolsService,
    PurchaseToolsService,
    RecipeToolsService,
    ReadToolsService,
    HelpDocsService,
  ],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
