const mongoose = require('mongoose');
require('dotenv').config();

async function inspectTenant() {
  const tenantIdArg = process.argv[2];

  if (!tenantIdArg) {
    console.error('❌ ERROR: Debe proporcionar el ID del tenant a inspeccionar.');
    console.log('📖 Uso: node scripts/find-correct-tenant.js <tenant_id>');
    console.log('📖 Ejemplo: node scripts/find-correct-tenant.js 60d21b4667d0d8992e610c85');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Buscar el tenant por ID
    let tenant;
    try {
        tenant = await db.collection('tenants').findOne({ _id: new mongoose.Types.ObjectId(tenantIdArg) });
    } catch(e) {
        console.log(`❌ ERROR: El ID proporcionado "${tenantIdArg}" no es un ObjectId válido.`);
        process.exit(1);
    }

    if (!tenant) {
      console.log(`❌ Tenant con ID ${tenantIdArg} no encontrado`);
      return;
    }

    console.log('='.repeat(80));
    console.log('🔍 INFORME DEL TENANT');
    console.log('='.repeat(80));
    console.log(`🏢 Tenant: ${tenant.name}`);
    console.log(`🆔 ID: ${tenant._id}`);
    console.log(`📅 Creado: ${tenant.createdAt}`);
    console.log('');

    // Buscar usuarios en este tenant
    const users = await db.collection('users').find({ tenantId: tenant._id }).toArray();
    console.log(`👥 Usuarios (${users.length}):`);
    users.forEach(u => console.log(`   - ${u.email} (ID: ${u._id})`));
    console.log('');

    // Contar documentos en colecciones asociadas
    const collectionsToCount = [
        { name: 'Órdenes', collection: 'orders', emoji: '📦' },
        { name: 'Clientes', collection: 'customers', emoji: '👤' },
        { name: 'Productos', collection: 'products', emoji: '🛍️' },
        { name: 'Inventario', collection: 'inventories', emoji: '📋' },
    ];

    for (const item of collectionsToCount) {
        const count = await db.collection(item.collection).countDocuments({ tenantId: tenant._id });
        console.log(`${item.emoji} ${item.name}: ${count}`);
    }
    
    console.log('\n');


  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
}

// The script is renamed in spirit to "inspectTenant", but the file name remains the same.
spectTenant();
