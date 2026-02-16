import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { Warehouse } from '../schemas/warehouse.schema';

/**
 * Migration Script: Sync Inventory Location Warehouse Names
 * 
 * This script updates the location.warehouse field in inventory records
 * to match the actual warehouse name based on warehouseId.
 * 
 * Usage: npm run migrate:sync-warehouse-names
 */
async function syncWarehouseNames() {
    console.log('🚀 Starting warehouse name sync...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const inventoryModel = app.get<Model<Inventory>>(getModelToken(Inventory.name));
    const warehouseModel = app.get<Model<Warehouse>>(getModelToken(Warehouse.name));

    try {
        // Get all active warehouses
        const warehouses = await warehouseModel.find({
            isActive: true,
            isDeleted: { $ne: true },
        }).lean();

        console.log(`📦 Found ${warehouses.length} active warehouses\n`);

        // Create a map of warehouseId -> warehouse name
        const warehouseMap = new Map();
        warehouses.forEach(wh => {
            warehouseMap.set(wh._id.toString(), wh.name);
        });

        // Get all inventory with warehouseId
        const allInventory = await inventoryModel.find({
            warehouseId: { $exists: true, $ne: null },
        }).lean();

        console.log(`📦 Found ${allInventory.length} inventory records with warehouse assignments\n`);

        // Find inventory where location.warehouse doesn't match the actual warehouse name
        const outdatedInventory = allInventory.filter(inv => {
            const warehouseId = inv.warehouseId?.toString();
            const actualWarehouseName = warehouseMap.get(warehouseId);
            const currentLocationName = inv.location?.warehouse;

            return actualWarehouseName && currentLocationName !== actualWarehouseName;
        });

        console.log(`⚠️  Found ${outdatedInventory.length} inventory records with outdated warehouse names\n`);

        if (outdatedInventory.length === 0) {
            console.log('✅ All inventory warehouse names are up to date!');
            await app.close();
            return;
        }

        // Group by tenant for better logging
        const byTenant = new Map<string, any[]>();
        outdatedInventory.forEach((inv) => {
            const tenantId = inv.tenantId?.toString();
            if (!tenantId) return;
            if (!byTenant.has(tenantId)) {
                byTenant.set(tenantId, []);
            }
            byTenant.get(tenantId)!.push(inv);
        });

        console.log(`🏢 Processing ${byTenant.size} tenants...\n`);

        let totalUpdated = 0;

        for (const [tenantId, inventories] of byTenant.entries()) {
            console.log(`\n📍 Tenant: ${tenantId}`);
            console.log(`   Outdated inventory: ${inventories.length}`);

            // Show what's being updated
            const updates = new Map<string, { from: string, to: string, count: number }>();
            inventories.forEach(inv => {
                const warehouseId = inv.warehouseId?.toString();
                const actualName = warehouseMap.get(warehouseId);
                const currentName = inv.location?.warehouse || 'N/A';
                const key = `${currentName} -> ${actualName}`;

                if (!updates.has(key)) {
                    updates.set(key, { from: currentName, to: actualName, count: 0 });
                }
                updates.get(key)!.count++;
            });

            console.log(`   📝 Updates to apply:`);
            updates.forEach(({ from, to, count }) => {
                console.log(`      "${from}" -> "${to}" (${count} records)`);
            });

            // Update each inventory record
            for (const inv of inventories) {
                const warehouseId = inv.warehouseId?.toString();
                const actualName = warehouseMap.get(warehouseId);

                if (actualName) {
                    await inventoryModel.updateOne(
                        { _id: inv._id },
                        { $set: { 'location.warehouse': actualName } }
                    );
                    totalUpdated++;
                }
            }

            console.log(`   ✅ Updated ${inventories.length} inventory records`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Updated: ${totalUpdated}`);
        console.log(`   📦 Total checked: ${allInventory.length}`);
        console.log('='.repeat(60) + '\n');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

syncWarehouseNames()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
