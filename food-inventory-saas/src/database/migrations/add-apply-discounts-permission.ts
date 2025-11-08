import { Connection } from "mongoose";
import { Logger } from "@nestjs/common";

/**
 * Migration to add the orders_apply_discounts permission to the database
 */
export async function addApplyDiscountsPermission(connection: Connection) {
  const logger = new Logger("AddApplyDiscountsPermission");

  try {
    const rolesCollection = connection.collection("roles");

    // Remove old permission name if it exists and replace with new one
    await rolesCollection.updateMany(
      { permissions: "apply_discounts" } as any,
      {
        $pull: { permissions: "apply_discounts" } as any,
        $set: { updatedAt: new Date() },
      } as any,
    );

    // Now update all admin roles to include the new permission name
    const adminRoles = await rolesCollection
      .find({
        name: { $in: ["admin", "super_admin"] },
      })
      .toArray();

    for (const role of adminRoles) {
      if (!role.permissions.includes("orders_apply_discounts")) {
        await rolesCollection.updateOne(
          { _id: role._id },
          {
            $addToSet: { permissions: "orders_apply_discounts" },
            $set: { updatedAt: new Date() },
          },
        );
        logger.log(
          `✅ orders_apply_discounts permission added to role: ${role.name}`,
        );
      }
    }

    logger.log("✅ Migration completed successfully");
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}
