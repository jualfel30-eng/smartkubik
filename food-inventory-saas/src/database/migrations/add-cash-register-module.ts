import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

/**
 * Migration to add Cash Register (Cierre de Caja) module permissions
 *
 * This migration:
 * 1. Inserts new cash_register permissions
 * 2. Inserts billing and appointments permissions if missing
 * 3. Adds permissions to Admin, Manager, and Employee roles
 * 4. Enables cashRegister module for all existing tenants
 */
export async function addCashRegisterModulePermissions(connection: Connection) {
  const logger = new Logger("AddCashRegisterModulePermissions");

  // New Cash Register permissions
  const cashRegisterPermissions = [
    {
      name: "cash_register_read",
      description: "Ver sesiones y cierres de caja",
      module: "cash_register",
      action: "read",
    },
    {
      name: "cash_register_open",
      description: "Abrir sesión de caja",
      module: "cash_register",
      action: "open",
    },
    {
      name: "cash_register_write",
      description: "Registrar movimientos de efectivo",
      module: "cash_register",
      action: "write",
    },
    {
      name: "cash_register_close",
      description: "Cerrar sesión de caja",
      module: "cash_register",
      action: "close",
    },
    {
      name: "cash_register_admin",
      description: "Administrar todas las cajas y cierres globales",
      module: "cash_register",
      action: "admin",
    },
    {
      name: "cash_register_approve",
      description: "Aprobar o rechazar cierres de caja",
      module: "cash_register",
      action: "approve",
    },
    {
      name: "cash_register_reports",
      description: "Ver reportes de cierres de caja",
      module: "cash_register",
      action: "reports",
    },
    {
      name: "cash_register_export",
      description: "Exportar cierres de caja (PDF, Excel, CSV)",
      module: "cash_register",
      action: "export",
    },
  ];

  // Additional permissions that might be missing
  const additionalPermissions = [
    {
      name: "billing_create",
      description: "Crear facturas y documentos fiscales",
      module: "billing",
      action: "create",
    },
    {
      name: "billing_void",
      description: "Anular facturas y documentos fiscales",
      module: "billing",
      action: "void",
    },
    {
      name: "appointments_read",
      description: "Ver citas y reservaciones",
      module: "appointments",
      action: "read",
    },
    {
      name: "appointments_create",
      description: "Crear citas y reservaciones",
      module: "appointments",
      action: "create",
    },
    {
      name: "appointments_update",
      description: "Actualizar citas y reservaciones",
      module: "appointments",
      action: "update",
    },
    {
      name: "appointments_delete",
      description: "Eliminar citas y reservaciones",
      module: "appointments",
      action: "delete",
    },
  ];

  const allNewPermissions = [
    ...cashRegisterPermissions,
    ...additionalPermissions,
  ];

  // Permissions for Manager role
  const managerPermissionNames = [
    "cash_register_read",
    "cash_register_open",
    "cash_register_write",
    "cash_register_close",
    "cash_register_admin",
    "cash_register_approve",
    "cash_register_reports",
    "cash_register_export",
    "billing_read",
    "billing_create",
    "appointments_read",
    "appointments_create",
    "appointments_update",
  ];

  // Permissions for Employee role
  const employeePermissionNames = [
    "cash_register_read",
    "cash_register_open",
    "cash_register_write",
    "cash_register_close",
    "appointments_read",
    "appointments_create",
  ];

  try {
    const permissionsCollection = connection.collection("permissions");
    const rolesCollection = connection.collection("roles");
    const tenantsCollection = connection.collection("tenants");

    // 1. Insert new permissions
    logger.log(
      `🔍 Checking and inserting ${allNewPermissions.length} permissions...`,
    );

    let insertedCount = 0;
    for (const permission of allNewPermissions) {
      const existing = await permissionsCollection.findOne({
        name: permission.name,
      });

      if (!existing) {
        await permissionsCollection.insertOne({
          ...permission,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        insertedCount++;
        logger.log(`  ✅ Created permission: ${permission.name}`);
      } else {
        logger.log(`  ℹ️  Permission already exists: ${permission.name}`);
      }
    }

    logger.log(
      `📊 Inserted ${insertedCount} new permissions (${allNewPermissions.length - insertedCount} already existed)`,
    );

    // 2. Get all cash register permission IDs
    const cashRegisterPermDocs = await permissionsCollection
      .find({
        name: { $in: cashRegisterPermissions.map((p) => p.name) },
      })
      .toArray();
    const cashRegisterPermIds = cashRegisterPermDocs.map((p) => p._id);

    // 3. Update Admin roles with ALL permissions
    logger.log("👑 Updating Admin roles with all permissions...");
    const allPerms = await permissionsCollection.find({}).toArray();
    const allPermIds = allPerms.map((p) => p._id);

    const adminResult = await rolesCollection.updateMany(
      { name: "admin" },
      {
        $set: {
          permissions: allPermIds,
          updatedAt: new Date(),
        },
      },
    );
    logger.log(`  ✅ Updated ${adminResult.modifiedCount} Admin roles`);

    // 4. Update Manager roles
    logger.log("📊 Updating Manager roles...");
    const managerPermDocs = await permissionsCollection
      .find({ name: { $in: managerPermissionNames } })
      .toArray();
    const managerPermIds = managerPermDocs.map((p) => p._id);

    const managerRoles = await rolesCollection.find({ name: "manager" }).toArray();
    let managerUpdatedCount = 0;
    for (const role of managerRoles) {
      const currentPermissions = role.permissions || [];
      const permissionsToAdd = managerPermIds.filter(
        (permId) =>
          !currentPermissions.some((currPerm: any) =>
            currPerm.equals ? currPerm.equals(permId) : currPerm === permId,
          ),
      );
      if (permissionsToAdd.length > 0) {
        await rolesCollection.updateOne(
          { _id: role._id },
          {
            $addToSet: {
              permissions: { $each: permissionsToAdd },
            },
            $set: { updatedAt: new Date() },
          } as any,
        );
        managerUpdatedCount++;
      }
    }
    logger.log(`  ✅ Updated ${managerUpdatedCount} Manager roles`);

    // 5. Update Employee roles
    logger.log("👤 Updating Employee roles...");
    const employeePermDocs = await permissionsCollection
      .find({ name: { $in: employeePermissionNames } })
      .toArray();
    const employeePermIds = employeePermDocs.map((p) => p._id);

    const employeeRoles = await rolesCollection.find({ name: "employee" }).toArray();
    let employeeUpdatedCount = 0;
    for (const role of employeeRoles) {
      const currentPermissions = role.permissions || [];
      const permissionsToAdd = employeePermIds.filter(
        (permId) =>
          !currentPermissions.some((currPerm: any) =>
            currPerm.equals ? currPerm.equals(permId) : currPerm === permId,
          ),
      );
      if (permissionsToAdd.length > 0) {
        await rolesCollection.updateOne(
          { _id: role._id },
          {
            $addToSet: {
              permissions: { $each: permissionsToAdd },
            },
            $set: { updatedAt: new Date() },
          } as any,
        );
        employeeUpdatedCount++;
      }
    }
    logger.log(`  ✅ Updated ${employeeUpdatedCount} Employee roles`);

    // 6. Enable cashRegister module for all tenants
    logger.log("🏪 Enabling cashRegister module for all tenants...");
    const tenantResult = await tenantsCollection.updateMany(
      {
        $or: [
          { "enabledModules.cashRegister": { $exists: false } },
          { "enabledModules.cashRegister": null },
        ],
      },
      {
        $set: {
          "enabledModules.cashRegister": true,
          updatedAt: new Date(),
        },
      },
    );
    logger.log(
      `  ✅ Enabled cashRegister for ${tenantResult.modifiedCount} tenants`,
    );

    logger.log(
      "✅ Cash Register module permissions migration completed successfully",
    );
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}
