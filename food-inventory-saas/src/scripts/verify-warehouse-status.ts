import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Warehouse } from '../schemas/warehouse.schema';
import { Inventory } from '../schemas/inventory.schema';

async function verifyWarehouses() {
    const app = await NestFactory.createApplicationContext(AppModule);
    // Tiendas Broas Tenant ID
    const tenantId = '68d55e4b764d359fed186e47';

    console.log(`\n🔍 Verifying Warehouse Data for Tenant: ${tenantId}`);

    try {
        const warehouseModel = app.get<Model<Warehouse>>(getModelToken(Warehouse.name));
        const inventoryModel = app.get<Model<Inventory>>(getModelToken(Inventory.name));

        // 1. Get all warehouses for tenant
        const warehouses = await warehouseModel.find({
            $or: [
                { tenantId: tenantId },
                { tenantId: { $regex: tenantId, $options: 'i' } } // Check for string/objectid mismatch flexibility
            ]
        }).lean();

        console.log(`\n🏭 Warehouses Found: ${warehouses.length}`);
        const warehouseIds = new Set<string>();

        warehouses.forEach(w => {
            console.log(`   - [${w._id}] ${w.name} (Code: ${w.code}) (Default: ${w.isDefault})`);
            warehouseIds.add(w._id.toString());
        });

        // 2. Aggregate inventory by warehouseId
        const inventoryStats = await inventoryModel.aggregate([
            {
                $match: {
                    $or: [
                        { tenantId: tenantId },
                        // Also check mixed types if applicable, but usually string match is fine if normalized
                    ]
                }
            },
            {
                $group: {
                    _id: '$warehouseId',
                    count: { $sum: 1 },
                    sampleProduct: { $first: '$productName' }
                }
            }
        ]);

        console.log(`\n📦 Inventory Distribution:`);
        let totalItems = 0;

        for (const stat of inventoryStats) {
            const whId = stat._id ? stat._id.toString() : 'NULL';
            const isKnown = warehouseIds.has(whId);
            const whName = warehouses.find(w => w._id.toString() === whId)?.name || 'UNKNOWN/NULL';

            console.log(`   - Warehouse [${whId}] (${whName}): ${stat.count} items`);
            if (!isKnown) {
                console.log(`     ⚠️  WARNING: This warehouse ID is NOT in the tenant's warehouse list!`);
                console.log(`     Sample Item: ${stat.sampleProduct}`);
            }
            totalItems += stat.count;
        }
        console.log(`   Total Inventory Items: ${totalItems}`);

    } catch (error) {
        console.error('Error verifying warehouses:', error);
    } finally {
        await app.close();
    }
}

verifyWarehouses();
