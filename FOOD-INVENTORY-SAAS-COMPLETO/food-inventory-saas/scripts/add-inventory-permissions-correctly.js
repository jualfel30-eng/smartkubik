require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

const RoleSchema = new mongoose.Schema({
  name: String,
  permissions: [mongoose.Schema.Types.ObjectId],
  tenantId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const PermissionSchema = new mongoose.Schema({
  name: String,
  resource: String,
  action: String,
  description: String,
  tenantId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const Role = mongoose.model('Role', RoleSchema);
const Permission = mongoose.model('Permission', PermissionSchema);

const inventoryPermissions = [
  { resource: 'inventory', action: 'create', description: 'Crear entradas de inventario' },
  { resource: 'inventory', action: 'read', description: 'Ver inventario' },
  { resource: 'inventory', action: 'update', description: 'Actualizar inventario' },
  { resource: 'inventory', action: 'delete', description: 'Eliminar entradas de inventario' },
];

async function addInventoryPermissionsCorrectly() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Crear o encontrar permisos de inventario
    const permissionIds = [];

    for (const perm of inventoryPermissions) {
      let permission = await Permission.findOne({
        resource: perm.resource,
        action: perm.action,
        tenantId: null // Permisos del sistema
      });

      if (!permission) {
        console.log(`📝 Creating permission: ${perm.resource}_${perm.action}`);
        permission = await Permission.create({
          name: `${perm.resource}_${perm.action}`,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
          tenantId: null,
        });
      } else {
        console.log(`✅ Permission exists: ${perm.resource}_${perm.action}`);
      }

      permissionIds.push(permission._id);
    }

    console.log(`\n📋 Inventory permission IDs:`, permissionIds.map(id => id.toString()));

    // Actualizar rol admin
    const role = await Role.findOne({
      _id: new mongoose.Types.ObjectId('68daec7b603499605b40071f')
    });

    if (!role) {
      console.log('❌ Role not found');
      return;
    }

    console.log(`\n🔍 Updating role: ${role.name}`);
    console.log(`   Current permissions: ${role.permissions.length}`);

    // Agregar permisos de inventario si no existen
    const existingIds = new Set(role.permissions.map(p => p.toString()));
    let added = 0;

    for (const permId of permissionIds) {
      if (!existingIds.has(permId.toString())) {
        role.permissions.push(permId);
        added++;
      }
    }

    if (added > 0) {
      await role.save();
      console.log(`   ✅ Added ${added} inventory permissions`);
      console.log(`   Final permissions: ${role.permissions.length}`);
    } else {
      console.log(`   ✅ All inventory permissions already present`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

addInventoryPermissionsCorrectly();