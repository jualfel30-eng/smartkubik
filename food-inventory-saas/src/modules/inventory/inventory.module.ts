import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { AuthModule } from "../../auth/auth.module";
import { EventsModule } from "../events/events.module";
import { ProductsModule } from "../products/products.module"; // Import ProductsModule
import { Inventory, InventorySchema } from "../../schemas/inventory.schema";
import {
  InventoryMovement,
  InventoryMovementSchema,
} from "../../schemas/inventory.schema";
import { Product, ProductSchema } from "../../schemas/product.schema"; // Import Product schema
import { Warehouse, WarehouseSchema } from "../../schemas/warehouse.schema";
import { Tenant, TenantSchema } from "../../schemas/tenant.schema";
import { RolesModule } from "../roles/roles.module";
import { InventoryMovementsService } from "./inventory-movements.service";
import { InventoryMovementsController } from "./inventory-movements.controller";
import { InventoryAlertsService } from "./inventory-alerts.service";
import { InventoryAlertsController } from "./inventory-alerts.controller";
import { InventoryReceiptPdfService } from "./inventory-receipt-pdf.service";
import {
  InventoryAlertRule,
  InventoryAlertRuleSchema,
} from "../../schemas/inventory-alert-rule.schema";
import { InventoryMovementsReportPdfService } from "./inventory-movements-report-pdf.service";
import { InventoryMovementsReportCsvService } from "./inventory-movements-report-csv.service";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    RolesModule,
    forwardRef(() => EventsModule),
    forwardRef(() => ProductsModule), // Use forwardRef if there is a circular dependency
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: Product.name, schema: ProductSchema }, // Add ProductModel to feature module
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: InventoryAlertRule.name, schema: InventoryAlertRuleSchema },
    ]),
  ],
  controllers: [InventoryController, InventoryMovementsController, InventoryAlertsController],
  providers: [
    InventoryService,
    InventoryMovementsService,
    InventoryAlertsService,
    InventoryReceiptPdfService,
    InventoryMovementsReportPdfService,
    InventoryMovementsReportCsvService,
  ],
  exports: [InventoryService, InventoryMovementsService, InventoryAlertsService, InventoryReceiptPdfService],
})
export class InventoryModule { }
