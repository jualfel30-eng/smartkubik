const { MongoClient } = require('mongodb');

async function seedNewPermissions() {
  const uri = 'mongodb+srv://kubik:Chipi.24@cluster0.mbtyprl.mongodb.net/test?retryWrites=true&w=majority';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('test');
    const col = db.collection('permissions');

    const newPerms = [
      { name: 'locations_read', module: 'locations', description: 'Ver sedes/ubicaciones', action: 'read' },
      { name: 'locations_write', module: 'locations', description: 'Gestionar sedes/ubicaciones', action: 'write' },
      { name: 'transfer_orders_read', module: 'transfer_orders', description: 'Ver ordenes de transferencia', action: 'read' },
      { name: 'transfer_orders_write', module: 'transfer_orders', description: 'Crear y gestionar ordenes de transferencia', action: 'write' },
      { name: 'transfer_orders_approve', module: 'transfer_orders', description: 'Aprobar ordenes de transferencia', action: 'approve' },
    ];

    let inserted = 0;
    for (const perm of newPerms) {
      const exists = await col.findOne({ name: perm.name });
      if (!exists) {
        await col.insertOne({ ...perm, createdAt: new Date(), updatedAt: new Date() });
        console.log('  Inserted:', perm.name);
        inserted++;
      } else {
        console.log('  Already exists:', perm.name);
      }
    }

    console.log(`\nPermissions: Inserted ${inserted} new, ${newPerms.length - inserted} already existed.`);

    // Add these permissions to all admin and super_admin roles
    const adminRoles = await db.collection('roles').find({ name: { $in: ['admin', 'super_admin'] } }).toArray();
    const permDocs = await col.find({ name: { $in: newPerms.map(p => p.name) } }).toArray();
    const permIds = permDocs.map(p => p._id);

    for (const role of adminRoles) {
      const existingPermIds = (role.permissions || []).map(id => id.toString());
      const newIds = permIds.filter(id => !existingPermIds.includes(id.toString()));
      if (newIds.length > 0) {
        await db.collection('roles').updateOne(
          { _id: role._id },
          { $addToSet: { permissions: { $each: newIds } } }
        );
        console.log(`  Added ${newIds.length} permissions to role: ${role.name}`);
      } else {
        console.log(`  Role ${role.name} already has all new permissions`);
      }
    }

    console.log('\nDone!');
  } finally {
    await client.close();
  }
}

seedNewPermissions().catch(console.error);
