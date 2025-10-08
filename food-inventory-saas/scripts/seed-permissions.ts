import { connect, disconnect, model } from 'mongoose';
import { Permission, PermissionSchema } from '../src/schemas/permission.schema';
import { ALL_PERMISSIONS } from '../src/modules/permissions/constants';

async function seedPermissions() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  const PermissionModel = model(Permission.name, PermissionSchema);

  console.log('Seeding permissions...');
  let createdCount = 0;
  for (const pName of ALL_PERMISSIONS) {
    const existingPermission = await PermissionModel.findOne({ name: pName });
    if (!existingPermission) {
      const [module, action] = pName.split('_');
      await PermissionModel.create({
        name: pName,
        description: `Permission to ${action} ${module}`,
        module: module,
        action: action,
      });
      createdCount++;
    }
  }

  console.log(`${createdCount} new permissions created successfully.`);
  console.log('Permissions seeding complete.');

  await disconnect();
}

seedPermissions().catch(err => {
  console.error('Error seeding permissions:', err);
  process.exit(1);
});