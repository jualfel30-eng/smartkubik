import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { Warehouse } from '../schemas/warehouse.schema';

/**
 * Migration Script: Fix Orphaned Warehouse References
 * 
 * This script finds all inventory records with warehouseId pointing to non-existent
 * or deleted warehouses and reassigns them to the default warehouse for their tenant.
 * 
 * Usage: npm run migrate:fix-orphaned-warehouses
 */
async function fixOrphanedWarehouseReferences() {
    console.log('🚀 Starting orphaned warehouse references fix...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryModel = app.get<Model<Inventory>>(getModelToken(Inventory.name));
    const warehouseModel = app.get<Model<Warehouse>>(getModelToken(Warehouse.name));

    try {
        // Get all active warehouses
        const activeWarehouses = await warehouseModel.find({
            isActive: true,
            isDeleted: { $ne: true },
        }).lean();

        const activeWarehouseIds = new Set(activeWarehouses.map(w => w._id.toString()));
        console.log(`📦 Found ${activeWarehouses.length} active warehouses\n`);

        // Get all inventory records with warehouseId
        const allInventory = await inventoryModel.find({
            warehouseId: { $exists: true, $ne: null },
        }).lean();

        console.log(`📦 Found ${allInventory.length} inventory records with warehouse assignments\n`);

        // Find orphaned inventory (pointing to non-existent warehouses)
        const orphanedInventory = allInventory.filter(inv => {
            const warehouseId = inv.warehouseId?.toString();
            return warehouseId && !activeWarehouseIds.has(warehouseId);
        });

        console.log(`⚠️  Found ${orphanedInventory.length} orphaned inventory records\n`);

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

        let totalFixed = 0;
        let totalSkipped = 0;

        for (const [tenantId, inventories] of byTenant.entries()) {
            console.log(`\n📍 Tenant: ${tenantId}`);
            console.log(`   Orphaned inventory: ${inventories.length}`);

            // Find default warehouse for this tenant
            let defaultWarehouse = activeWarehouses.find(w =>
                w.tenantId?.toString() === tenantId && w.isDefault === true
            );

            // If no default warehouse, use the first active warehouse for this tenant
            if (!defaultWarehouse) {
                defaultWarehouse = activeWarehouses.find(w =>
                    w.tenantId?.toString() === tenantId
                );
            }

            if (!defaultWarehouse) {
                console.warn(`   ⚠️  No warehouse found for tenant ${tenantId}, skipping ${inventories.length} records`);
                totalSkipped += inventories.length;
                continue;
            }

            console.log(`   🏭 Using warehouse: ${defaultWarehouse.name} (${defaultWarehouse.code})`);

            // Show which orphaned warehouse IDs are being replaced
            const orphanedWarehouseIds = new Set(inventories.map(inv => inv.warehouseId?.toString()));
            console.log(`   🔄 Replacing warehouse IDs: ${Array.from(orphanedWarehouseIds).join(', ')}`);

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

            console.log(`   ✅ Fixed ${result.modifiedCount} inventory records`);
            totalFixed += result.modifiedCount;
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Fixed: ${totalFixed}`);
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

fixOrphanedWarehouseReferences()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
