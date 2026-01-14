import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

/**
 * Script para verificar si un tenant tiene series de facturación
 * Uso: npx tsx scripts/test-new-tenant-sequences.ts "Nombre del Tenant"
 */
async function run() {
  const tenantName = process.argv[2];

  if (!tenantName) {
    console.error('❌ Error: Debes proporcionar el nombre del tenant');
    console.log('Uso: npx tsx scripts/test-new-tenant-sequences.ts "Nombre del Tenant"');
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
      console.log('\n📋 Últimos 10 tenants creados:');
      const recentTenants: any[] = await tenantsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      recentTenants.forEach((t, index) => {
        const date = new Date(t.createdAt).toLocaleString();
        console.log(`  ${index + 1}. ${t.name} (creado: ${date})`);
      });
      process.exit(1);
    }

    const tenantId = tenant._id.toString();
    console.log(`✅ Tenant encontrado: ${tenant.name}`);
    console.log(`   ID: ${tenantId}`);
    console.log(`   Creado: ${new Date(tenant.createdAt).toLocaleString()}\n`);

    // Buscar series de facturación
    const sequences: any[] = await sequencesCollection
      .find({ tenantId })
      .sort({ type: 1 })
      .toArray();

    if (sequences.length === 0) {
      console.log('❌ Este tenant NO tiene series de facturación');
      console.log('   Esto es un problema! Las series deberían haberse creado automáticamente.\n');
      console.log('🔧 Para solucionar, ejecuta:');
      console.log(`   npx tsx scripts/seed-sequences-for-tenant.ts "${tenant.name}"`);
    } else {
      console.log(`✅ Este tenant tiene ${sequences.length} series de facturación:\n`);
      sequences.forEach((s, index) => {
        console.log(`  ${index + 1}. ${s.name}`);
        console.log(`     - Tipo: ${s.type}`);
        console.log(`     - Prefijo: ${s.prefix}`);
        console.log(`     - Número actual: ${s.currentNumber}`);
        console.log(`     - Status: ${s.status}`);
        console.log(`     - Por defecto: ${s.isDefault ? 'Sí' : 'No'}`);
        console.log('');
      });
      console.log('✅ Todo está correcto! Este tenant puede emitir facturas.\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
