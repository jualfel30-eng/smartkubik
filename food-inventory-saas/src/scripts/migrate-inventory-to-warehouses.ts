import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { Warehouse } from '../schemas/warehouse.schema';

/**
 * Migration Script: Assign Orphaned Inventory to Default Warehouse
 * 
 * This script finds all inventory records without a warehouseId and assigns them
 * to the default warehouse for their tenant. This fixes inventory created before
 * multi-warehouse was enabled.
 * 
 * Usage: npm run migrate:inventory-warehouses
 */
async function migrateInventoryToWarehouses() {
    console.log('🚀 Starting inventory migration to warehouses...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryModel = app.get<Model<Inventory>>(getModelToken(Inventory.name));
    const warehouseModel = app.get<Model<Warehouse>>(getModelToken(Warehouse.name));

    try {
        // Find all inventory records without a warehouseId
        const orphanedInventory = await inventoryModel.find({
            $or: [
                { warehouseId: { $exists: false } },
                { warehouseId: null },
            ],
        }).lean();

        console.log(`📦 Found ${orphanedInventory.length} orphaned inventory records\n`);

        if (orphanedInventory.length === 0) {
            console.log('✅ No orphaned inventory found. Migration not needed.');
            await app.close();
            return;
        }

        // Group by tenant
        const byTenant = new Map<string, any[]>();
        orphanedInventory.forEach((inv) => {
            const tenantId = inv.tenantId?.toString();
            if (!tenantId) {
                console.warn(`⚠️  Inventory ${inv._id} has no tenantId, skipping`);
                return;
            }
            if (!byTenant.has(tenantId)) {
                byTenant.set(tenantId, []);
            }
            byTenant.get(tenantId)!.push(inv);
        });

        console.log(`🏢 Processing ${byTenant.size} tenants...\n`);

        let totalMigrated = 0;
        let totalSkipped = 0;

        for (const [tenantId, inventories] of byTenant.entries()) {
            console.log(`\n📍 Tenant: ${tenantId}`);
            console.log(`   Orphaned inventory: ${inventories.length}`);

            // Find default warehouse for this tenant
            let defaultWarehouse = await warehouseModel.findOne({
                tenantId,
                isDefault: true,
                isDeleted: { $ne: true },
            });

            // If no default warehouse, use the first active warehouse
            if (!defaultWarehouse) {
                defaultWarehouse = await warehouseModel.findOne({
                    tenantId,
                    isActive: true,
                    isDeleted: { $ne: true },
                });
            }

            if (!defaultWarehouse) {
                console.warn(`   ⚠️  No warehouse found for tenant ${tenantId}, skipping ${inventories.length} records`);
                totalSkipped += inventories.length;
                continue;
            }

            console.log(`   🏭 Using warehouse: ${defaultWarehouse.name} (${defaultWarehouse.code})`);

            // Update all inventory records for this tenant
            const result = await inventoryModel.updateMany(
                {
                    _id: { $in: inventories.map((inv) => inv._id) },
                },
                {
                    $set: {
                        warehouseId: defaultWarehouse._id,
                        'location.warehouse': defaultWarehouse.name,
                    },
                },
            );

            console.log(`   ✅ Migrated ${result.modifiedCount} inventory records`);
            totalMigrated += result.modifiedCount;
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${totalMigrated}`);
        console.log(`   ⚠️  Skipped: ${totalSkipped}`);
        console.log(`   📦 Total: ${orphanedInventory.length}`);
        console.log('='.repeat(60) + '\n');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

migrateInventoryToWarehouses()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
