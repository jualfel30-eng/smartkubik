import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

/**
 * Migration to add production module permissions to the database
 * Adds 24 new permissions for the MANUFACTURING vertical
 */
export async function addProductionModulePermissions(connection: Connection) {
  const logger = new Logger("AddProductionModulePermissions");

  const productionPermissions = [
    {
      name: "production_read",
      description: "Ver módulo de producción",
      category: "production",
    },
    {
      name: "production_orders_read",
      description: "Ver órdenes de producción",
      category: "production",
    },
    {
      name: "production_orders_create",
      description: "Crear órdenes de producción",
      category: "production",
    },
    {
      name: "production_orders_update",
      description: "Actualizar órdenes de producción",
      category: "production",
    },
    {
      name: "production_orders_delete",
      description: "Eliminar órdenes de producción",
      category: "production",
    },
    {
      name: "production_orders_start",
      description: "Iniciar órdenes de producción",
      category: "production",
    },
    {
      name: "production_orders_complete",
      description: "Completar órdenes de producción",
      category: "production",
    },
    {
      name: "production_orders_cancel",
      description: "Cancelar órdenes de producción",
      category: "production",
    },
    {
      name: "bom_read",
      description: "Ver listas de materiales (BOM)",
      category: "production",
    },
    {
      name: "bom_create",
      description: "Crear BOMs",
      category: "production",
    },
    {
      name: "bom_update",
      description: "Actualizar BOMs",
      category: "production",
    },
    {
      name: "bom_delete",
      description: "Eliminar BOMs",
      category: "production",
    },
    {
      name: "routing_read",
      description: "Ver rutas de producción",
      category: "production",
    },
    {
      name: "routing_create",
      description: "Crear rutas de producción",
      category: "production",
    },
    {
      name: "routing_update",
      description: "Actualizar rutas de producción",
      category: "production",
    },
    {
      name: "routing_delete",
      description: "Eliminar rutas de producción",
      category: "production",
    },
    {
      name: "work_centers_read",
      description: "Ver centros de trabajo",
      category: "production",
    },
    {
      name: "work_centers_create",
      description: "Crear centros de trabajo",
      category: "production",
    },
    {
      name: "work_centers_update",
      description: "Actualizar centros de trabajo",
      category: "production",
    },
    {
      name: "work_centers_delete",
      description: "Eliminar centros de trabajo",
      category: "production",
    },
    {
      name: "mrp_read",
      description: "Ver planificación de materiales (MRP)",
      category: "production",
    },
    {
      name: "mrp_run",
      description: "Ejecutar MRP",
      category: "production",
    },
    {
      name: "mrp_write",
      description: "Crear/actualizar registros MRP",
      category: "production",
    },
  ];

  try {
    const permissionsCollection = connection.collection("permissions");
    const rolesCollection = connection.collection("roles");

    // 1. Insert new permissions if they don't exist
    logger.log(
      `🔍 Checking and inserting ${productionPermissions.length} production permissions...`,
    );

    let insertedCount = 0;
    for (const permission of productionPermissions) {
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
      `📊 Inserted ${insertedCount} new production permissions (${productionPermissions.length - insertedCount} already existed)`,
    );

    // 2. Get all permission IDs
    const permissionDocs = await permissionsCollection
      .find({
        name: { $in: productionPermissions.map((p) => p.name) },
      })
      .toArray();

    const permissionIds = permissionDocs.map((p) => p._id);

    logger.log(
      `🔑 Found ${permissionIds.length} production permission IDs to add to admin roles`,
    );

    // 3. Add all production permissions to admin roles
    const adminRoles = await rolesCollection
      .find({
        name: { $in: ["admin"] },
      })
      .toArray();

    logger.log(`👤 Found ${adminRoles.length} admin roles to update`);

    for (const role of adminRoles) {
      // Get current permissions
      const currentPermissions = role.permissions || [];

      // Find which permissions need to be added
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
            $addToSet: {
              permissions: { $each: permissionsToAdd },
            },
            $set: { updatedAt: new Date() },
          },
        );
        logger.log(
          `  ✅ Added ${permissionsToAdd.length} production permissions to role: ${role.name}`,
        );
      } else {
        logger.log(
          `  ℹ️  Role ${role.name} already has all production permissions`,
        );
      }
    }

    logger.log(
      "✅ Production module permissions migration completed successfully",
    );
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}
