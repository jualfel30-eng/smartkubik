const { MongoClient, ObjectId } = require('mongodb');

async function seedDefaultBusinessLocations() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('test');

    const session = client.startSession();
    session.startTransaction();

    try {
      const tenants = await db.collection('tenants').find({}).project({ _id: 1 }).toArray();
      console.log(`Found ${tenants.length} tenants.`);

      let created = 0;
      let skipped = 0;

      for (const tenant of tenants) {
        const tenantId = tenant._id instanceof ObjectId ? tenant._id : new ObjectId(tenant._id);

        // Check idempotency
        const existing = await db.collection('businesslocations').findOne(
          { tenantId, code: 'SEDE-001', isDeleted: { $ne: true } },
          { session }
        );

        if (existing) {
          console.log(`  Tenant ${tenantId.toHexString()} already has SEDE-001. Skipping.`);
          skipped++;
          continue;
        }

        // Find warehouses
        const warehouses = await db.collection('warehouses').find(
          { tenantId, isDeleted: { $ne: true } },
          { session }
        ).toArray();

        if (warehouses.length === 0) {
          console.log(`  Tenant ${tenantId.toHexString()} has no warehouses. Skipping.`);
          skipped++;
          continue;
        }

        const warehouseIds = warehouses.map(w => w._id);
        const firstWarehouse = warehouses[0];
        const address = firstWarehouse.location ? {
          street: firstWarehouse.location.address || '',
          city: firstWarehouse.location.city || '',
          state: firstWarehouse.location.state || '',
          country: firstWarehouse.location.country || '',
        } : undefined;

        // Create default business location
        const insertResult = await db.collection('businesslocations').insertOne({
          name: 'Sede Principal',
          code: 'SEDE-001',
          type: 'mixed',
          address,
          warehouseIds,
          isActive: true,
          isDeleted: false,
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { session });

        const locationId = insertResult.insertedId;

        // Link warehouses to this location
        await db.collection('warehouses').updateMany(
          { _id: { $in: warehouseIds } },
          { $set: { locationId } },
          { session }
        );

        console.log(`  Created SEDE-001 for tenant ${tenantId.toHexString()} with ${warehouseIds.length} warehouse(s)`);
        created++;
      }

      await session.commitTransaction();
      console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Total tenants: ${tenants.length}`);
    } catch (error) {
      await session.abortTransaction();
      console.error('Migration failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  } finally {
    await client.close();
  }
}

seedDefaultBusinessLocations().catch(console.error);
