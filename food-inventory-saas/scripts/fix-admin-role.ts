import { connect, disconnect, model } from 'mongoose';
import { User, UserSchema } from '../src/schemas/user.schema';
import { Role, RoleSchema } from '../src/schemas/role.schema';
import { Tenant, TenantSchema } from '../src/schemas/tenant.schema';
import { ALL_PERMISSIONS } from '../src/modules/permissions/constants';

async function fixAdminRole() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Connected to database at ${MONGODB_URI}`);

  const UserModel = model(User.name, UserSchema);
  const RoleModel = model(Role.name, RoleSchema);
  const TenantModel = model(Tenant.name, TenantSchema);

  console.log('Attempting to fix admin user role...');

  // 1. Find the tenant
  const tenant = await TenantModel.findOne({ code: 'EARLYADOPTER' }).exec();
  if (!tenant) {
    console.error('CRITICAL: Could not find the tenant with code \'EARLYADOPTER\'.');
    await disconnect();
    return;
  }
  console.log(`Found tenant: ${tenant.name}`);

  // 2. Find the admin role or create it if it doesn't exist
  let adminRole = await RoleModel.findOne({ name: 'admin', tenantId: tenant._id }).exec();
  
  if (!adminRole) {
    console.log('Admin role not found. Creating it now...');
    adminRole = await RoleModel.create({
      name: 'admin',
      description: 'Administrador con todos los permisos',
      permissions: ALL_PERMISSIONS,
      isSystemRole: true,
      tenantId: tenant._id,
    });
    console.log(`Admin role created successfully with ID: ${adminRole._id}`);
  } else {
    console.log(`Found existing admin role with ID: ${adminRole._id}`);
  }

  // 3. Find the admin user
  const adminUser = await UserModel.findOne({ email: 'admin@earlyadopter.com' }).exec();
  if (!adminUser) {
    console.error('CRITICAL: Could not find the user with email \'admin@earlyadopter.com\'.');
    await disconnect();
    return;
  }
  console.log(`Found admin user with ID: ${adminUser._id}`);

  // 4. Check if the user already has the correct role ID
  if (adminUser.role && adminUser.role.toString() === adminRole._id.toString()) {
    console.log('Admin user role is already correct. No changes needed.');
  } else {
    // 5. Update the user's role field with the correct ObjectId
    console.log(`User role is incorrect ('${adminUser.role}'). Updating to '${adminRole._id}'...`);
    adminUser.role = adminRole._id;
    await adminUser.save();
    console.log('Admin user role has been successfully updated!');
  }

  await disconnect();
}

fixAdminRole().catch(err => {
  console.error('Error fixing admin role:', err);
  process.exit(1);
});