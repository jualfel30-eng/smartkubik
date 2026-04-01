const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || "mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

async function migrateIvaRate() {
  try {
    await mongoose.connect(uri);
    console.log("✓ Conectado a MongoDB\n");

    const db = mongoose.connection.db;
    const products = db.collection('products');

    console.log('='.repeat(70));
    console.log('MIGRACIÓN: Agregar campo ivaRate a productos existentes');
    console.log('='.repeat(70));
    console.log('\nEsta migración convierte:');
    console.log('  ivaApplicable: true  → ivaRate: 16');
    console.log('  ivaApplicable: false → ivaRate: 0');
    console.log('  ivaApplicable: null/undefined → ivaRate: 0 (default)\n');

    // Contar productos que necesitan migración
    const totalProducts = await products.countDocuments({});
    const productsWithIvaRate = await products.countDocuments({ ivaRate: { $exists: true } });
    const productsNeedingMigration = totalProducts - productsWithIvaRate;

    console.log(`📊 Total de productos: ${totalProducts}`);
    console.log(`✅ Productos con ivaRate: ${productsWithIvaRate}`);
    console.log(`⏳ Productos que necesitan migración: ${productsNeedingMigration}\n`);

    if (productsNeedingMigration === 0) {
      console.log('✅ No hay productos que necesiten migración.');
      await mongoose.disconnect();
      return;
    }

    // DRY RUN FIRST
    console.log('='.repeat(70));
    console.log('DRY RUN - Vista previa de cambios (sin guardar)');
    console.log('='.repeat(70) + '\n');

    const productsToMigrate = await products.find({ ivaRate: { $exists: false } }).limit(10).toArray();

    productsToMigrate.forEach((p, index) => {
      const currentIvaApplicable = p.ivaApplicable;
      const newIvaRate = currentIvaApplicable === true ? 16 : 0;

      console.log(`${index + 1}. ${p.name || 'Sin nombre'} (${p._id})`);
      console.log(`   ivaApplicable: ${currentIvaApplicable} → ivaRate: ${newIvaRate}`);
      console.log('');
    });

    if (productsNeedingMigration > 10) {
      console.log(`... y ${productsNeedingMigration - 10} productos más\n`);
    }

    // Confirmar antes de proceder
    console.log('='.repeat(70));
    console.log('¿PROCEDER CON LA MIGRACIÓN REAL?');
    console.log('='.repeat(70));
    console.log('\nEste script actualizará TODOS los productos sin ivaRate.');
    console.log('Se mantendrá el campo ivaApplicable para compatibilidad.');
    console.log('\nPara ejecutar la migración real, cambia DRY_RUN a false\n');

    const DRY_RUN = true; // Cambiar a false para ejecutar migración real

    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No se realizaron cambios');
      console.log('Para ejecutar la migración, edita el script y cambia DRY_RUN = false\n');
    } else {
      console.log('🚀 Ejecutando migración real...\n');

      // Migrar productos con ivaApplicable = true → ivaRate = 16
      const result1 = await products.updateMany(
        {
          ivaApplicable: true,
          ivaRate: { $exists: false }
        },
        {
          $set: { ivaRate: 16 }
        }
      );

      // Migrar productos con ivaApplicable = false → ivaRate = 0
      const result2 = await products.updateMany(
        {
          ivaApplicable: false,
          ivaRate: { $exists: false }
        },
        {
          $set: { ivaRate: 0 }
        }
      );

      // Migrar productos con ivaApplicable null/undefined → ivaRate = 0 (default)
      const result3 = await products.updateMany(
        {
          $or: [
            { ivaApplicable: { $exists: false } },
            { ivaApplicable: null }
          ],
          ivaRate: { $exists: false }
        },
        {
          $set: { ivaRate: 0 }
        }
      );

      const totalUpdated = result1.modifiedCount + result2.modifiedCount + result3.modifiedCount;

      console.log('='.repeat(70));
      console.log('RESULTADOS DE LA MIGRACIÓN');
      console.log('='.repeat(70));
      console.log(`✅ Productos con IVA 16% (ivaApplicable: true): ${result1.modifiedCount}`);
      console.log(`✅ Productos exentos (ivaApplicable: false): ${result2.modifiedCount}`);
      console.log(`✅ Productos sin ivaApplicable (default a 0%): ${result3.modifiedCount}`);
      console.log(`\n📊 Total migrados: ${totalUpdated} productos\n`);

      // Verificar migración
      const verification = await products.countDocuments({ ivaRate: { $exists: true } });
      console.log(`✅ Verificación: ${verification} productos ahora tienen ivaRate\n`);
    }

    await mongoose.disconnect();
    console.log('✓ Desconectado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateIvaRate();
