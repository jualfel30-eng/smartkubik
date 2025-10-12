import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Permission, PermissionDocument } from '../src/schemas/permission.schema';
import { Role } from '../src/schemas/role.schema';

/**
 * Script to add/update chat permissions and assign them to the 'admin' role.
 * This script correctly handles ObjectId types to prevent data corruption.
 * Usage: npx ts-node scripts/add-chat-permissions.ts
 */
async function addChatPermissions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const permissionModel = app.get<Model<Permission>>(getModelToken(Permission.name));
  const roleModel = app.get<Model<Role>>(getModelToken(Role.name));

  console.log('🚀 Upserting chat module permissions...');

  const permissionsToUpsert = [
    {
      name: 'chat_read',
      description: 'Ver y usar el inbox de WhatsApp',
      module: 'chat',
      action: 'read',
    },
    {
      name: 'chat_write',
      description: 'Enviar mensajes desde el inbox de WhatsApp',
      module: 'chat',
      action: 'write',
    },
  ];

  const upsertedPermissions: PermissionDocument[] = [];

  for (const permData of permissionsToUpsert) {
    const permission = await permissionModel.findOneAndUpdate(
      { name: permData.name },
      { $set: permData },
      { new: true, upsert: true }
    ).exec();
    console.log(`✅ Upserted permission: ${permission.name}`);
    upsertedPermissions.push(permission);
  }

  console.log(`\n📊 Total permissions ready: ${upsertedPermissions.length}\n`);

  const newPermissionIds = upsertedPermissions.map(p => p._id);
  const rolesToUpdate = ['admin'];

  for (const roleName of rolesToUpdate) {
    const roles = await roleModel.find({ name: roleName }).exec();
    if (roles.length === 0) {
        console.warn(`⚠️ No roles found with the name "${roleName}". Skipping assignment.`);
        continue;
    }
    for (const role of roles) {
      console.log(`Inspecting permissions for role: ${role.name} (tenant: ${role.tenantId || 'global'})`);
      console.log('Existing permissions:', role.permissions);

      const existingPermIds = role.permissions.map(p => p?.toString());
      const newPermIds = newPermissionIds.map(p => p.toString());
      
      const allIds = [...new Set([...existingPermIds, ...newPermIds])];
      
      // Filter for valid ObjectId strings before attempting conversion
      const validIds = allIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));
      const updatedPermissions = validIds.map(id => new Types.ObjectId(id));

      await roleModel.updateOne({ _id: role._id }, { $set: { permissions: updatedPermissions } });
      console.log(`✅ Repaired and updated role: ${roleName} (tenant: ${role.tenantId || 'global'})`);
    }
  }

  console.log('\n📋 Summary of permissions processed:\n');
  upsertedPermissions.forEach(p => {
    console.log(`  - ${p.name}: ${p.description} (Module: ${p.module})`);
  });

  await app.close();
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}

addChatPermissions().catch((error) => {
  console.error('❌ Error running add-chat-permissions script:', error);
  process.exit(1);
});
