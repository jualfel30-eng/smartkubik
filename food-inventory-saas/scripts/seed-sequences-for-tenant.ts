import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

/**
 * Script para inyectar series de facturación a un tenant específico
 * Usa el MISMO patrón que seed_sequences.ts pero acepta nombre de tenant como parámetro
 * Uso: npx tsx scripts/seed-sequences-for-tenant.ts "Tiendas Broas"
 */
async function run() {
  const tenantName = process.argv[2];

  if (!tenantName) {
    console.error('❌ Error: Debes proporcionar el nombre del tenant');
    console.log('Uso: npx tsx scripts/seed-sequences-for-tenant.ts "Nombre del Tenant"');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');

    const db = client.db('test');
    const tenantsCollection = db.collection('tenants');
    const sequencesCollection = db.collection('documentsequences');

    console.log(`🔍 Buscando tenant: "${tenantName}"...`);

    // Buscar tenant por nombre (case-insensitive)
    const tenant: any = await tenantsCollection.findOne({
      name: { $regex: new RegExp(`^${tenantName}$`, 'i') }
    });

    if (!tenant) {
      console.error(`❌ No se encontró el tenant: "${tenantName}"`);
      console.log('\n📋 Tenants disponibles:');
      const allTenants: any[] = await tenantsCollection.find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray();
      allTenants.forEach(t => console.log(`  - ${t.name}`));
      process.exit(1);
    }

    const tenantId = tenant._id.toString();
    console.log(`✅ Tenant encontrado: ${tenant.name}`);
    console.log(`   ID: ${tenantId}\n`);

    // Definir las series por defecto (IGUAL que en seed_sequences.ts original)
    const defaults = [
      { name: 'Factura Principal', type: 'invoice', prefix: 'F', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
      { name: 'Nota de Crédito', type: 'credit_note', prefix: 'NC', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
      { name: 'Nota de Débito', type: 'debit_note', prefix: 'ND', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
      { name: 'Nota de Entrega', type: 'delivery_note', prefix: 'NE', currentNumber: 1, status: 'active', isDefault: true, scope: 'tenant', tenantId },
    ];

    console.log('📝 Inyectando series de facturación...\n');

    for (const seq of defaults) {
      // Verificar si ya existe (IGUAL que en seed_sequences.ts)
      const exists: any = await sequencesCollection.findOne({ tenantId, type: seq.type });

      if (!exists) {
        await sequencesCollection.insertOne(seq);
        console.log(`✅ Created sequence: ${seq.name}`);
      } else {
        // Update existing to have new fields if missing (IGUAL que en seed_sequences.ts)
        const updates: any = {};
        if (!exists.type) updates.type = seq.type;
        if (!exists.scope) updates.scope = seq.scope;
        if (exists.isDefault === undefined) updates.isDefault = seq.isDefault;

        if (Object.keys(updates).length > 0) {
          await sequencesCollection.updateOne({ _id: exists._id }, { $set: updates });
          console.log(`🔄 Updated sequence: ${seq.name}`);
        } else {
          console.log(`⚠️  Sequence exists: ${seq.name}`);
        }
      }
    }

    // Verificar resultado
    console.log('\n🔍 Verificando series creadas...');
    const finalSequences: any[] = await sequencesCollection.find({ tenantId }).toArray();
    console.log(`\n✅ Total de series para "${tenant.name}": ${finalSequences.length}\n`);

    finalSequences.forEach(s => {
      console.log(`  - ${s.name} (${s.type}) - ${s.prefix}${s.currentNumber} - Status: ${s.status}`);
    });

    console.log('\n✨ Done.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
