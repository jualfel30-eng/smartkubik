import { connect, disconnect, model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserSchema } from '../src/schemas/user.schema';
import { Role, RoleSchema } from '../src/schemas/role.schema';
import { ALL_PERMISSIONS } from '../src/modules/permissions/constants';

// Este script es seguro de ejecutar múltiples veces.
// Usará findOneAndUpdate con upsert:true para crear los documentos solo si no existen.

async function seedSuperAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
  await connect(MONGODB_URI);
  console.log(`Conectado a la base de datos en ${MONGODB_URI}`);

  console.log('Iniciando seeding de Super Admin...');

  // 1. Definir Modelos de Mongoose
  const RoleModel = model(Role.name, RoleSchema);
  const UserModel = model(User.name, UserSchema);

  // 2. Crear o actualizar el rol de Super Admin
  const superAdminRoleName = 'super_admin';

  const roleResult = await RoleModel.findOneAndUpdate(
    { name: superAdminRoleName, tenantId: null }, // Clave única para el rol global
    {
      $set: {
        name: superAdminRoleName,
        description: 'Super Administrador con acceso global para gestionar tenants',
        permissions: ALL_PERMISSIONS,
        tenantId: null, // Explícitamente nulo para rol global
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Rol Super Admin asegurado: ${roleResult.name} (ID: ${roleResult._id})`);

  // 3. Crear o actualizar el usuario Super Admin
  const superAdminEmail = 'jualfel3.0@gmail.com';
  const superAdminPassword = 'Papayita.85';

  const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

  const userResult = await UserModel.findOneAndUpdate(
    { email: superAdminEmail, tenantId: null }, // Clave única para el usuario global
    {
      $set: {
        email: superAdminEmail,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: roleResult._id, // Asignar el ID del rol Super Admin
        isActive: true,
        isEmailVerified: true,
        tenantId: null, // Explícitamente nulo para usuario global
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Usuario Super Admin asegurado: ${userResult.email}`);

  await disconnect();
  console.log('Seeding de Super Admin completado exitosamente!');
}

seedSuperAdmin().catch(err => {
  console.error('Error durante el seeding de Super Admin:', err);
  process.exit(1);
});
