require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

const RoleSchema = new mongoose.Schema({
  name: String,
  permissions: [String],
  tenantId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const Role = mongoose.model('Role', RoleSchema);

const inventoryPermissions = [
  'inventory_create',
  'inventory_read',
  'inventory_update',
  'inventory_delete',
];

async function fixInventoryPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Buscar todos los roles de admin
    const adminRoles = await Role.find({
      name: { $regex: /admin/i }
    });

    console.log(`\n📋 Found ${adminRoles.length} admin roles`);

    for (const role of adminRoles) {
      console.log(`\n🔍 Checking role: ${role.name} (${role._id})`);

      const missingPermissions = inventoryPermissions.filter(
        perm => !role.permissions.includes(perm)
      );

      if (missingPermissions.length > 0) {
        console.log(`  ⚠️  Missing permissions: ${missingPermissions.join(', ')}`);

        role.permissions = [...new Set([...role.permissions, ...inventoryPermissions])];
        await role.save();

        console.log(`  ✅ Added missing permissions`);
      } else {
        console.log(`  ✅ All inventory permissions already present`);
      }
    }

    console.log('\n✅ Done! All admin roles now have inventory permissions.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixInventoryPermissions();