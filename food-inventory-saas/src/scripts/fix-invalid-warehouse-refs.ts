import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { Warehouse } from '../schemas/warehouse.schema';

/**
 * Migration Script: Fix Inventory with Invalid Warehouse References
 * 
 * This script finds inventory records where warehouseId points to a non-existent
 * or inactive warehouse and reassigns them to the default warehouse.
 * 
 * Usage: npm run migrate:fix-invalid-warehouse-refs
 */
async function fixInvalidWarehouseRefs() {
    console.log('🚀 Starting invalid warehouse reference fix...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryModel = app.get<Model<Inventory>>(getModelToken(Inventory.name));
    const warehouseModel = app.get<Model<Warehouse>>(getModelToken(Warehouse.name));

    try {
        // Get all active warehouses
        const activeWarehouses = await warehouseModel.find({
            isActive: true,
            isDeleted: { $ne: true },
        }).lean();

        console.log(`📦 Found ${activeWarehouses.length} active warehouses\n`);

        // Create a set of valid warehouse IDs
        const validWarehouseIds = new Set(activeWarehouses.map(w => w._id.toString()));

        // Get all inventory records
        const allInventory = await inventoryModel.find({}).lean();
        console.log(`📦 Found ${allInventory.length} total inventory records\n`);

        // Find inventory with invalid warehouseId
        const invalidInventory = allInventory.filter(inv => {
            if (!inv.warehouseId) return true; // No warehouse assigned
            const whId = inv.warehouseId.toString();
            return !validWarehouseIds.has(whId); // Warehouse doesn't exist or is inactive
        });

        console.log(`⚠️  Found ${invalidInventory.length} inventory records with invalid warehouse references\n`);

        if (invalidInventory.length === 0) {
            console.log('✅ All inventory has valid warehouse references!');
            await app.close();
            return;
        }

        // Group by tenant
        const byTenant = new Map<string, any[]>();
        invalidInventory.forEach((inv) => {
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
            console.log(`   Invalid inventory: ${inventories.length}`);

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

            // Show which invalid warehouse IDs are being replaced
            const invalidWarehouseIds = new Map<string, number>();
            inventories.forEach(inv => {
                const whId = inv.warehouseId?.toString() || 'null';
                invalidWarehouseIds.set(whId, (invalidWarehouseIds.get(whId) || 0) + 1);
            });

            console.log(`   🔄 Replacing invalid warehouse IDs:`);
            invalidWarehouseIds.forEach((count, whId) => {
                console.log(`      ${whId}: ${count} records`);
            });

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
        console.log(`   📦 Total: ${invalidInventory.length}`);
        console.log('='.repeat(60) + '\n');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

fixInvalidWarehouseRefs()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
