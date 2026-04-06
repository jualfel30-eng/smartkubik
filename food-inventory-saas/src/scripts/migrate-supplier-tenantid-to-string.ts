import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../schemas/customer.schema';

async function migrateSupplierTenantIds() {
  console.log('🔧 Migrando tenantId de ObjectId a String en Suppliers...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const customerModel = app.get<Model<CustomerDocument>>('CustomerModel');

  try {
    // Encontrar todos los suppliers con tenantId como ObjectId
    const suppliersWithObjectId = await customerModel.find({
      customerType: 'supplier',
      tenantId: { $type: 'objectId' }
    }).exec();

    console.log(`📊 Suppliers con tenantId ObjectId: ${suppliersWithObjectId.length}`);

    if (suppliersWithObjectId.length === 0) {
      console.log('✅ No hay suppliers que migrar');
      await app.close();
      return;
    }

    let migrated = 0;
    let errors = 0;

    for (const supplier of suppliersWithObjectId) {
      try {
        const tenantIdString = supplier.tenantId.toString();

        await customerModel.updateOne(
          { _id: supplier._id },
          { $set: { tenantId: tenantIdString } }
        );

        migrated++;
        console.log(`✓ ${supplier.name || supplier.companyName}: ${supplier.tenantId} → "${tenantIdString}"`);
      } catch (error) {
        errors++;
        console.error(`❌ Error migrando ${supplier.name}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN');
    console.log('='.repeat(60));
    console.log(`✅ Migrados: ${migrated}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📊 Total procesados: ${suppliersWithObjectId.length}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await app.close();
  }
}

migrateSupplierTenantIds()
  .then(() => {
    console.log('\n✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
