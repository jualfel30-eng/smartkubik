import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { Product, ProductSchema } from "@/schemas/product.schema";
import { Inventory, InventorySchema, InventoryMovement, InventoryMovementSchema } from "@/schemas/inventory.schema";
import { Customer, CustomerSchema } from "@/schemas/customer.schema";
import { Supplier, SupplierSchema } from "@/schemas/supplier.schema";
import { Tenant, TenantSchema } from "@/schemas/tenant.schema";
import { ImportJob, ImportJobSchema } from "./schemas/import-job.schema";
import { DataImportController } from "./data-import.controller";
import { DataImportService } from "./data-import.service";
import { DataImportGateway } from "./data-import.gateway";
import { HandlerRegistry } from "./handlers/handler.registry";
import { ProductImportHandler } from "./handlers/product-import.handler";
import { CustomerImportHandler } from "./handlers/customer-import.handler";
import { SupplierImportHandler } from "./handlers/supplier-import.handler";
import { InventoryImportHandler } from "./handlers/inventory-import.handler";
import { CategoryImportHandler } from "./handlers/category-import.handler";
import { PresetRegistry } from "./presets/preset.registry";
import { DataImportQueueService } from "./queues/data-import-queue.service";
import { DataImportProcessor } from "./queues/data-import.processor";
import { DATA_IMPORT_QUEUE } from "./queues/data-import.constants";

const queueImports =
  process.env.DISABLE_BULLMQ === "true"
    ? []
    : [BullModule.registerQueue({ name: DATA_IMPORT_QUEUE })];

const queueProviders =
  process.env.DISABLE_BULLMQ === "true"
    ? [
        {
          provide: getQueueToken(DATA_IMPORT_QUEUE),
          useValue: null,
        },
        DataImportQueueService,
      ]
    : [DataImportQueueService, DataImportProcessor];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    ...queueImports,
  ],
  controllers: [DataImportController],
  providers: [
    DataImportService,
    DataImportGateway,
    HandlerRegistry,
    PresetRegistry,
    // Entity handlers
    ProductImportHandler,
    CustomerImportHandler,
    SupplierImportHandler,
    InventoryImportHandler,
    CategoryImportHandler,
    // Queue
    ...queueProviders,
  ],
  exports: [DataImportService],
})
export class DataImportModule {}
