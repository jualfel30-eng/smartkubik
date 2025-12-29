import { connect, disconnect, model } from 'mongoose';
import { Permission, PermissionSchema } from '../src/schemas/permission.schema';
import { Role, RoleSchema } from '../src/schemas/role.schema';
import { ALL_PERMISSIONS } from '../src/modules/permissions/constants';
import * as dotenv from 'dotenv';

dotenv.config();

async function patchPermissions() {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-inventory-saas';
    await connect(MONGODB_URI);
    console.log(`Connected to database at ${MONGODB_URI}`);

    console.log('Patching permissions...');

    // 1. Upsert Permissions
    const PermissionModel = model(Permission.name, PermissionSchema);

    // We need to match the structure from permissions.seed.ts or manually define the new ones
    // For emergency patch, we will just ensure the strings exist in the DB if the app uses DB-based validation,
    // but mostly we need to update the ROLES.

    // Actually, the app likely uses the `permissions` collection for defining available permissions.
    // Let's add the new opportunities permissions to the permissions collection.

    const newPermissions = [
        {
            name: 'opportunities_read',
            description: 'Ver oportunidades',
            module: 'opportunities',
        },
        {
            name: 'opportunities_create',
            description: 'Crear oportunidades',
            module: 'opportunities',
        },
        {
            name: 'opportunities_update',
            description: 'Editar oportunidades',
            module: 'opportunities',
        },
        {
            name: 'opportunities_delete',
            description: 'Eliminar oportunidades',
            module: 'opportunities',
        },
        {
            name: 'opportunities_view_all',
            description: 'Ver todas las oportunidades (ignorar owner)',
            module: 'opportunities',
        },
    ];

    for (const perm of newPermissions) {
        await PermissionModel.updateOne(
            { name: perm.name },
            { $set: perm },
            { upsert: true }
        );
        console.log(`Upserted permission: ${perm.name}`);
    }

    // 2. Update Roles
    const RoleModel = model(Role.name, RoleSchema);

    // Manager: Add all opportunities permissions
    const managerResult = await RoleModel.updateMany(
        { name: 'manager' }, // Update all manager roles across tenants (system wide? or tenant specific?)
        // Roles are tenant specific usually. We should update based on name.
        {
            $addToSet: {
                permissions: {
                    $each: [
                        'opportunities_read',
                        'opportunities_create',
                        'opportunities_update',
                        'opportunities_delete',
                        'opportunities_view_all'
                    ]
                }
            }
        }
    );
    console.log(`Updated Manager roles: ${managerResult.modifiedCount}`);

    // Employee: Add read/create/update
    const employeeResult = await RoleModel.updateMany(
        { name: 'employee' },
        {
            $addToSet: {
                permissions: {
                    $each: [
                        'opportunities_read',
                        'opportunities_create',
                        'opportunities_update'
                    ]
                }
            }
        }
    );
    console.log(`Updated Employee roles: ${employeeResult.modifiedCount}`);

    // Admin: Ensure they have everything (usually they have '*' or all, but let's be safe)
    const adminResult = await RoleModel.updateMany(
        { name: 'admin' },
        {
            $addToSet: {
                permissions: {
                    $each: ALL_PERMISSIONS // Ensure admin has the updated FULL list
                }
            }
        }
    );
    console.log(`Updated Admin roles: ${adminResult.modifiedCount}`);

    await disconnect();
    console.log('Permissions patched successfully!');
}

patchPermissions().catch(err => {
    console.error('Error patching permissions:', err);
    process.exit(1);
});
