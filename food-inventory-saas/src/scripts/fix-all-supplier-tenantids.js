/**
 * Script para corregir TODOS los registros Supplier con tenantId ObjectId
 * Los convierte a String para que coincidan con el schema
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://juanfelsantamaria:iCIQYNJRV8n78Vrm@cluster0.jwk24.mongodb.net/test?retryWrites=true&w=majority';

async function fixAll() {
  try {
    console.log('\n🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado exitosamente\n');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({}, { strict: false }), 'suppliers');

    console.log('🔍 Buscando todos los Suppliers con tenantId ObjectId...\n');

    // Buscar TODOS los suppliers
    const allSuppliers = await Supplier.find({}).lean();
    console.log(`📦 Total de Suppliers en la base de datos: ${allSuppliers.length}\n`);

    // Filtrar los que tienen tenantId como ObjectId (no string)
    const suppliersToFix = allSuppliers.filter(s => typeof s.tenantId === 'object');

    console.log(`⚠️  Suppliers con tenantId ObjectId: ${suppliersToFix.length}\n`);

    if (suppliersToFix.length === 0) {
      console.log('✅ No hay Suppliers que corregir. Todos tienen tenantId como string.\n');
      return;
    }

    console.log('🔧 Corrigiendo Suppliers...\n');

    let fixed = 0;
    let errors = 0;

    for (const supplier of suppliersToFix) {
      try {
        const tenantIdString = supplier.tenantId.toString();

        await Supplier.updateOne(
          { _id: supplier._id },
          { $set: { tenantId: tenantIdString } }
        );

        console.log(`  ✅ ${supplier.name} (${supplier.supplierNumber}): ${supplier.tenantId} → "${tenantIdString}"`);
        fixed++;
      } catch (error) {
        console.error(`  ❌ Error en ${supplier.name}: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE CORRECCIÓN GLOBAL');
    console.log('='.repeat(70));
    console.log(`✅ Total de Suppliers:         ${allSuppliers.length}`);
    console.log(`🔧 Suppliers corregidos:       ${fixed}`);
    console.log(`❌ Errores:                    ${errors}`);
    console.log('='.repeat(70) + '\n');

    if (errors === 0) {
      console.log('🎉 Corrección global completada exitosamente!\n');
      console.log('💡 Todos los tenantId ahora son strings.');
      console.log('   Las condiciones de pago deberían cargar correctamente para TODOS los tenants.\n');
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

fixAll();
