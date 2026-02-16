import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';
import { Inventory, InventorySchema, InventoryMovement, InventoryMovementSchema } from '../../schemas/inventory.schema';
import { Warehouse, WarehouseSchema } from '../../schemas/warehouse.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';

import { InventoryAlertRule, InventoryAlertRuleSchema } from '../../schemas/inventory-alert-rule.schema';
import { EventsModule } from '../events/events.module';
import { InventoryAlertsService } from './inventory-alerts.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: InventoryMovement.name, schema: InventoryMovementSchema },
            { name: Inventory.name, schema: InventorySchema },
            { name: Warehouse.name, schema: WarehouseSchema },
            { name: Product.name, schema: ProductSchema },
            { name: InventoryAlertRule.name, schema: InventoryAlertRuleSchema },
        ]),
        EventsModule,
    ],
    controllers: [InventoryMovementsController],
    providers: [InventoryMovementsService, InventoryAlertsService],
    exports: [InventoryMovementsService],
})
export class InventoryMovementsModule { }
