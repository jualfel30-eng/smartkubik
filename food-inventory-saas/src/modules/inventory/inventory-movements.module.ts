import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';
import { Inventory, InventorySchema, InventoryMovement, InventoryMovementSchema } from '../../schemas/inventory.schema';
import { Warehouse, WarehouseSchema } from '../../schemas/warehouse.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';

import { InventoryAlertRule, InventoryAlertRuleSchema } from '../../schemas/inventory-alert-rule.schema';
import { EventsModule } from '../events/events.module';
import { InventoryAlertsService } from './inventory-alerts.service';
import { InventoryMovementsReportPdfService } from './inventory-movements-report-pdf.service';
import { InventoryMovementsReportCsvService } from './inventory-movements-report-csv.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: InventoryMovement.name, schema: InventoryMovementSchema },
            { name: Inventory.name, schema: InventorySchema },
            { name: Warehouse.name, schema: WarehouseSchema },
            { name: Product.name, schema: ProductSchema },
            { name: InventoryAlertRule.name, schema: InventoryAlertRuleSchema },
            { name: Tenant.name, schema: TenantSchema },
        ]),
        EventsModule,
    ],
    controllers: [InventoryMovementsController],
    providers: [
        InventoryMovementsService,
        InventoryAlertsService,
        InventoryMovementsReportPdfService,
        InventoryMovementsReportCsvService,
    ],
    exports: [InventoryMovementsService],
})
export class InventoryMovementsModule { }

