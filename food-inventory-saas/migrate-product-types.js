const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function migrateProductTypes() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB Cloud');

    const db = client.db('test');
    const productsCollection = db.collection('products');
    const consumableConfigsCollection = db.collection('productconsumableconfigs');
    const supplyConfigsCollection = db.collection('productsupplyconfigs');

    // 1. Get all products without productType field
    const productsWithoutType = await productsCollection.countDocuments({
      productType: { $exists: false }
    });
    console.log(`\n📊 Productos sin campo productType: ${productsWithoutType}`);

    if (productsWithoutType === 0) {
      console.log('✅ Todos los productos ya tienen campo productType');
      return;
    }

    // 2. Get all productIds that are configured as consumables
    const consumableConfigs = await consumableConfigsCollection.find({}, { projection: { productId: 1 } }).toArray();
    const consumableProductIds = consumableConfigs.map(config => config.productId.toString());
    console.log(`📦 Productos configurados como consumibles: ${consumableProductIds.length}`);

    // 3. Get all productIds that are configured as supplies
    const supplyConfigs = await supplyConfigsCollection.find({}, { projection: { productId: 1 } }).toArray();
    const supplyProductIds = supplyConfigs.map(config => config.productId.toString());
    console.log(`🔧 Productos configurados como suministros: ${supplyProductIds.length}`);

    // 4. Update products that have consumable configs
    if (consumableProductIds.length > 0) {
      const consumableResult = await productsCollection.updateMany(
        {
          _id: { $in: consumableConfigs.map(c => c.productId) },
          productType: { $exists: false }
        },
        {
          $set: { productType: 'consumable' }
        }
      );
      console.log(`✅ Actualizados ${consumableResult.modifiedCount} productos a tipo 'consumable'`);
    }

    // 5. Update products that have supply configs
    if (supplyProductIds.length > 0) {
      const supplyResult = await productsCollection.updateMany(
        {
          _id: { $in: supplyConfigs.map(c => c.productId) },
          productType: { $exists: false }
        },
        {
          $set: { productType: 'supply' }
        }
      );
      console.log(`✅ Actualizados ${supplyResult.modifiedCount} productos a tipo 'supply'`);
    }

    // 6. Update all remaining products without productType to 'simple'
    const simpleResult = await productsCollection.updateMany(
      {
        productType: { $exists: false }
      },
      {
        $set: { productType: 'simple' }
      }
    );
    console.log(`✅ Actualizados ${simpleResult.modifiedCount} productos a tipo 'simple'`);

    // 7. Verify final counts
    console.log('\n📊 Verificación final:');
    const finalByType = await productsCollection.aggregate([
      { $group: { _id: '$productType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    finalByType.forEach(type => {
      console.log(`  - ${type._id}: ${type.count} productos`);
    });

    const remainingWithoutType = await productsCollection.countDocuments({
      productType: { $exists: false }
    });

    if (remainingWithoutType > 0) {
      console.log(`\n⚠️  ADVERTENCIA: ${remainingWithoutType} productos aún sin productType`);
    } else {
      console.log('\n✨ ¡Migración completada exitosamente! Todos los productos tienen productType');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrateProductTypes();
