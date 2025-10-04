import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from '../src/schemas/permission.schema';
import { Role } from '../src/schemas/role.schema';

/**
 * Script to add appointments permissions and assign them to roles
 * Usage: npx ts-node scripts/add-appointments-permissions.ts
 */
async function addAppointmentsPermissions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const permissionModel = app.get<Model<Permission>>(getModelToken(Permission.name));
  const roleModel = app.get<Model<Role>>(getModelToken(Role.name));

  console.log('🚀 Adding appointments module permissions...\n');

  // Define all permissions needed for the appointments module
  const permissionsToAdd = [
    {
      name: 'appointments_read',
      description: 'Ver citas',
      module: 'appointments',
      action: 'read',
    },
    {
      name: 'appointments_create',
      description: 'Crear citas',
      module: 'appointments',
      action: 'create',
    },
    {
      name: 'appointments_update',
      description: 'Actualizar citas',
      module: 'appointments',
      action: 'update',
    },
    {
      name: 'appointments_delete',
      description: 'Eliminar citas',
      module: 'appointments',
      action: 'delete',
    },
    {
      name: 'services_read',
      description: 'Ver servicios',
      module: 'services',
      action: 'read',
    },
    {
      name: 'services_create',
      description: 'Crear servicios',
      module: 'services',
      action: 'create',
    },
    {
      name: 'services_update',
      description: 'Actualizar servicios',
      module: 'services',
      action: 'update',
    },
    {
      name: 'services_delete',
      description: 'Eliminar servicios',
      module: 'services',
      action: 'delete',
    },
    {
      name: 'resources_read',
      description: 'Ver recursos',
      module: 'resources',
      action: 'read',
    },
    {
      name: 'resources_create',
      description: 'Crear recursos',
      module: 'resources',
      action: 'create',
    },
    {
      name: 'resources_update',
      description: 'Actualizar recursos',
      module: 'resources',
      action: 'update',
    },
    {
      name: 'resources_delete',
      description: 'Eliminar recursos',
      module: 'resources',
      action: 'delete',
    },
  ];

  const createdPermissions = [];

  // Create permissions (if they don't exist)
  for (const permData of permissionsToAdd) {
    const existing = await permissionModel.findOne({ name: permData.name }).exec();

    if (existing) {
      console.log(`⏭️  Permission "${permData.name}" already exists`);
      createdPermissions.push(existing);
    } else {
      const newPermission = await permissionModel.create(permData);
      console.log(`✅ Created permission: ${permData.name}`);
      createdPermissions.push(newPermission);
    }
  }

  console.log(`\n📊 Total permissions ready: ${createdPermissions.length}\n`);

  // Get permission IDs
  const permissionIds = createdPermissions.map(p => p._id);

  // Assign to Admin and Manager roles (all tenants)
  const rolesToUpdate = ['Admin', 'Manager'];

  for (const roleName of rolesToUpdate) {
    const roles = await roleModel.find({ name: roleName }).exec();

    for (const role of roles) {
      // Get existing permissions
      const existingPermissions = role.permissions || [];

      // Add new permissions (avoid duplicates)
      const updatedPermissions = [...new Set([...existingPermissions.map(String), ...permissionIds.map(String)])];

      await roleModel.updateOne(
        { _id: role._id },
        { $set: { permissions: updatedPermissions } }
      );

      console.log(`✅ Updated role: ${roleName} (tenant: ${role.tenantId || 'global'})`);
    }
  }

  console.log('\n📋 Summary of permissions added:\n');
  createdPermissions.forEach(p => {
    console.log(`  - ${p.name}: ${p.description}`);
  });

  await app.close();
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}

addAppointmentsPermissions().catch((error) => {
  console.error('❌ Error adding appointments permissions:', error);
  process.exit(1);
});
