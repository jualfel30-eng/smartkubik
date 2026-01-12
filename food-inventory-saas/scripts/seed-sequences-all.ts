import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

/**
 * Script para inyectar series de facturación a TODOS los tenants
 * Usa el MISMO patrón que seed_sequences.ts original
 * Uso: npx tsx scripts/seed-sequences-all.ts
 */
async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('test');
    const tenantsCollection = db.collection('tenants');
    const sequencesCollection = db.collection('documentsequences');

    console.log('🚀 Inyectando series de facturación a TODOS los tenants...\n');

    // Obtener todos los tenants
    const allTenants: any[] = await tenantsCollection.find({}).sort({ name: 1 }).toArray();
    console.log(`📊 Total de tenants encontrados: ${allTenants.length}\n`);

    if (allTenants.length === 0) {
      console.log('⚠️  No hay tenants en el sistema.');
      return;
    }

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let tenantsWithSequences = 0;
    let tenantsWithoutSequences = 0;

    for (const tenant of allTenants) {
      const tenantId = tenant._id.toString();

      console.log(`${'='.repeat(60)}`);
      console.log(`📦 Procesando: ${tenant.name}`);
      console.log(`   ID: ${tenantId}`);

      // Verificar si ya tiene series
      const existingCount = await sequencesCollection.countDocuments({ tenantId });
      console.log(`   Series actuales: ${existingCount}`);

      if (existingCount > 0) {
        tenantsWithSequences++;
      } else {
        tenantsWithoutSequences++;
      }

      // Definir las series por defecto (IGUAL que en seed_sequences.ts original)
      const defaults = [
        { name: 'Factura Principal', type: 'invoice', prefix: 'F', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
        { name: 'Nota de Crédito', type: 'credit_note', prefix: 'NC', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
        { name: 'Nota de Débito', type: 'debit_note', prefix: 'ND', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
        { name: 'Nota de Entrega', type: 'delivery_note', prefix: 'NE', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
      ];

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const seq of defaults) {
        // Verificar si ya existe (IGUAL que en seed_sequences.ts)
        const exists: any = await sequencesCollection.findOne({ tenantId, type: seq.type });

        if (!exists) {
          await sequencesCollection.insertOne(seq);
          console.log(`   ✅ Created sequence: ${seq.name}`);
          created++;
        } else {
          // Update existing to have new fields if missing (IGUAL que en seed_sequences.ts)
          const updates: any = {};
          if (!exists.type) updates.type = seq.type;
          if (!exists.scope) updates.scope = seq.scope;
          if (exists.isDefault === undefined) updates.isDefault = seq.isDefault;

          if (Object.keys(updates).length > 0) {
            await sequencesCollection.updateOne({ _id: exists._id }, { $set: updates });
            console.log(`   🔄 Updated sequence: ${seq.name}`);
            updated++;
          } else {
            console.log(`   ⚠️  Sequence exists: ${seq.name}`);
            skipped++;
          }
        }
      }

      console.log(`   📊 Resumen: ${created} creadas, ${updated} actualizadas, ${skipped} sin cambios\n`);

      totalProcessed++;
      totalCreated += created;
      totalUpdated += updated;
      totalSkipped += skipped;
    }

    // Resumen final
    console.log(`${'='.repeat(60)}`);
    console.log('\n✨ PROCESO COMPLETADO\n');
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   - Tenants procesados: ${totalProcessed}/${allTenants.length}`);
    console.log(`   - Tenants que YA tenían series: ${tenantsWithSequences}`);
    console.log(`   - Tenants SIN series (nuevos): ${tenantsWithoutSequences}`);
    console.log(`   - Series creadas: ${totalCreated}`);
    console.log(`   - Series actualizadas: ${totalUpdated}`);
    console.log(`   - Series sin cambios: ${totalSkipped}`);
    console.log('\n✅ Todos los tenants ahora tienen series de facturación!\n');
    console.log('✨ Done.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
