import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

/**
 * Migration to add data import module permissions to the database.
 * Adds 3 new permissions for the data_import module.
 */
export async function addDataImportPermissions(connection: Connection) {
  const logger = new Logger("AddDataImportPermissions");

  const dataImportPermissions = [
    {
      name: "data_import_create",
      description: "Crear y ejecutar importaciones de datos",
      category: "data_import",
    },
    {
      name: "data_import_read",
      description: "Ver importaciones de datos e historial",
      category: "data_import",
    },
    {
      name: "data_import_delete",
      description: "Eliminar y revertir importaciones de datos",
      category: "data_import",
    },
  ];

  try {
    const permissionsCollection = connection.collection("permissions");
    const rolesCollection = connection.collection("roles");

    logger.log(
      `Checking and inserting ${dataImportPermissions.length} data import permissions...`,
    );

    let insertedCount = 0;
    for (const permission of dataImportPermissions) {
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
        logger.log(`  Created permission: ${permission.name}`);
      } else {
        logger.log(`  Permission already exists: ${permission.name}`);
      }
    }

    logger.log(
      `Inserted ${insertedCount} new data import permissions (${dataImportPermissions.length - insertedCount} already existed)`,
    );

    // Get all permission IDs
    const permissionDocs = await permissionsCollection
      .find({
        name: { $in: dataImportPermissions.map((p) => p.name) },
      })
      .toArray();

    const permissionIds = permissionDocs.map((p) => p._id);

    // Add to admin roles
    const adminRoles = await rolesCollection
      .find({ name: { $in: ["admin"] } })
      .toArray();

    for (const role of adminRoles) {
      const currentPermissions = role.permissions || [];
      const permissionsToAdd = permissionIds.filter(
        (permId) =>
          !currentPermissions.some((currPerm: any) =>
            currPerm.equals ? currPerm.equals(permId) : currPerm === permId,
          ),
      );

      if (permissionsToAdd.length > 0) {
        await rolesCollection.updateOne(
          { _id: role._id },
          {
            $addToSet: { permissions: { $each: permissionsToAdd } },
            $set: { updatedAt: new Date() },
          },
        );
        logger.log(
          `  Added ${permissionsToAdd.length} data import permissions to role: ${role.name}`,
        );
      }
    }

    logger.log("Data import permissions migration completed successfully");
  } catch (error) {
    logger.error("Data import permissions migration failed:", error);
    throw error;
  }
}
