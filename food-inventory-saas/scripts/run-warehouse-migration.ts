import mongoose from 'mongoose';
import { Logger } from '@nestjs/common';

const logger = new Logger('WarehouseMigration');

async function runMigration() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';

    logger.log(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//<credentials>@')}`);
    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;

    // Check if MongoDB supports transactions (Atlas/replica set)
    const supportsTransactions = mongoUri.includes('mongodb+srv://') || mongoUri.includes('replicaSet=');

    let session: mongoose.ClientSession | undefined = undefined;
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
      logger.log('🔒 Using transactions for data safety');
    } else {
      logger.log('⚠️  MongoDB doesn\'t support transactions, running without (still safe due to idempotency)');
    }

    try {
      // Get all tenants
      const tenants = await db.collection('tenants')
        .find({})
        .project({ _id: 1, code: 1, name: 1 })
        .toArray();

      logger.log(`\n📊 Found ${tenants.length} tenants`);

      for (const tenant of tenants) {
        const tenantId = tenant._id instanceof mongoose.Types.ObjectId
          ? tenant._id
          : new mongoose.Types.ObjectId(tenant._id);

        logger.log(`\n🏢 Processing tenant: ${tenant.name} (${tenant.code})`);

        // Check if warehouse already exists
        const existing = await db.collection('warehouses').findOne(
          { tenantId, code: 'GEN', isDeleted: { $ne: true } },
          session ? { session } : {}
        );

        let warehouseId = existing?._id;

        if (!existing) {
          // Create default warehouse
          const insertResult = await db.collection('warehouses').insertOne(
            {
              name: 'General',
              code: 'GEN',
              tenantId,
              isActive: true,
              isDefault: true,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            session ? { session } : {}
          );
          warehouseId = insertResult.insertedId;
          logger.log(`  ✅ Created default warehouse 'GEN'`);
        } else {
          logger.log(`  ℹ️  Warehouse 'GEN' already exists`);
        }

        // Ensure only one default warehouse per tenant
        const unsetResult = await db.collection('warehouses').updateMany(
          { tenantId, _id: { $ne: warehouseId } },
          { $set: { isDefault: false } },
          session ? { session } : {}
        );

        if (unsetResult.modifiedCount > 0) {
          logger.log(`  📝 Unmarked ${unsetResult.modifiedCount} other warehouses as non-default`);
        }

        // Count inventories without warehouse
        const inventoriesWithoutWarehouse = await db.collection('inventories').countDocuments({
          tenantId,
          $or: [
            { warehouseId: { $exists: false } },
            { warehouseId: null },
          ],
        });

        if (inventoriesWithoutWarehouse > 0) {
          logger.log(`  📦 Found ${inventoriesWithoutWarehouse} inventories without warehouse`);

          // Assign warehouse to inventories
          const updateResult = await db.collection('inventories').updateMany(
            {
              tenantId,
              $or: [
                { warehouseId: { $exists: false } },
                { warehouseId: null },
              ],
            },
            { $set: { warehouseId } },
            session ? { session } : {}
          );

          logger.log(`  ✅ Assigned warehouse to ${updateResult.modifiedCount} inventories`);
        } else {
          logger.log(`  ℹ️  All inventories already have a warehouse assigned`);
        }
      }

      // Commit transaction if using one
      if (session) {
        await session.commitTransaction();
      }
      logger.log('\n✅ Migration completed successfully!');

      // Print summary
      const totalWarehouses = await db.collection('warehouses').countDocuments({ isDeleted: { $ne: true } });
      const totalInventories = await db.collection('inventories').countDocuments({});
      const inventoriesWithWarehouse = await db.collection('inventories').countDocuments({
        warehouseId: { $exists: true, $ne: null }
      });

      logger.log('\n📊 Summary:');
      logger.log(`   - Total warehouses: ${totalWarehouses}`);
      logger.log(`   - Total inventories: ${totalInventories}`);
      logger.log(`   - Inventories with warehouse: ${inventoriesWithWarehouse}`);

    } catch (error) {
      if (session) {
        await session.abortTransaction();
        logger.error('❌ Migration failed, rolling back...', error);
      } else {
        logger.error('❌ Migration failed (no transaction to rollback):', error);
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }

  } catch (error) {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
runMigration()
  .then(() => {
    logger.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Unhandled error:', error);
    process.exit(1);
  });
