require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory';

const RoleSchema = new mongoose.Schema({
  name: String,
  permissions: [{ type: mongoose.Schema.Types.Mixed }],
  tenantId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const PermissionSchema = new mongoose.Schema({
  name: String,
  resource: String,
  action: String,
  tenantId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const Role = mongoose.model('Role', RoleSchema);
const Permission = mongoose.model('Permission', PermissionSchema);

async function normalizeRolePermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Obtener todos los permisos existentes
    const allPermissions = await Permission.find({});
    console.log(`\n📋 Found ${allPermissions.length} permissions in database`);

    // Crear mapeo de nombre -> ObjectId
    const permissionMap = {};
    allPermissions.forEach(perm => {
      const key = `${perm.resource}_${perm.action}`;
      permissionMap[key] = perm._id;
    });

    // Buscar rol problemático
    const problematicRole = await Role.findOne({
      _id: new mongoose.Types.ObjectId('68daec7b603499605b40071f')
    });

    if (!problematicRole) {
      console.log('❌ Role not found');
      return;
    }

    console.log(`\n🔍 Checking role: ${problematicRole.name}`);
    console.log(`   Original permissions count: ${problematicRole.permissions.length}`);

    // Separar ObjectIds válidos de strings
    const validObjectIds = [];
    const stringPermissions = [];

    problematicRole.permissions.forEach(perm => {
      if (mongoose.Types.ObjectId.isValid(perm) && String(perm).length === 24) {
        validObjectIds.push(perm);
      } else {
        stringPermissions.push(perm);
      }
    });

    console.log(`   Valid ObjectIds: ${validObjectIds.length}`);
    console.log(`   String permissions to convert: ${stringPermissions.length}`);

    if (stringPermissions.length > 0) {
      console.log(`   String permissions: ${stringPermissions.join(', ')}`);
    }

    // Mantener solo los ObjectIds válidos
    problematicRole.permissions = validObjectIds;
    await problematicRole.save();

    console.log(`\n✅ Role normalized successfully`);
    console.log(`   Final permissions count: ${problematicRole.permissions.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

normalizeRolePermissions();