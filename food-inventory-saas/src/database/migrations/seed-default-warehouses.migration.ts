import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

@Injectable()
export class SeedDefaultWarehousesMigration {
  private readonly logger = new Logger(SeedDefaultWarehousesMigration.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run() {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const tenants = await this.connection
        .collection("tenants")
        .find({})
        .project({ _id: 1 })
        .toArray();

      this.logger.log(
        `Found ${tenants.length} tenants. Seeding default warehouses...`,
      );

      for (const tenant of tenants) {
        const tenantId = tenant._id instanceof Types.ObjectId ? tenant._id : new Types.ObjectId(tenant._id);

        const existing = await this.connection
          .collection("warehouses")
          .findOne(
            { tenantId, code: "GEN", isDeleted: { $ne: true } },
            { session },
          );
        let warehouseId = existing?._id;

        if (!existing) {
          const insertResult = await this.connection
            .collection("warehouses")
            .insertOne(
              {
                name: "General",
                code: "GEN",
                tenantId,
                isActive: true,
                isDefault: true,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              { session },
            );
          warehouseId = insertResult.insertedId;
          this.logger.log(
            `Created default warehouse 'GEN' for tenant ${tenantId.toHexString()}`,
          );
        }

        // Asegurar que solo uno sea default
        await this.connection
          .collection("warehouses")
          .updateMany(
            { tenantId, _id: { $ne: warehouseId } },
            { $set: { isDefault: false } },
            { session },
          );

        // Asignar warehouse a inventarios sin warehouseId
        const updateResult = await this.connection
          .collection("inventories")
          .updateMany(
            {
              tenantId,
              $or: [
                { warehouseId: { $exists: false } },
                { warehouseId: null },
              ],
            },
            { $set: { warehouseId } },
            { session },
          );

        if (updateResult.modifiedCount > 0) {
          this.logger.log(
            `Assigned warehouse GEN to ${updateResult.modifiedCount} inventories for tenant ${tenantId.toHexString()}`,
          );
        }
      }

      await session.commitTransaction();
      this.logger.log("Seed default warehouses completed successfully.");
    } catch (error) {
      await session.abortTransaction();
      this.logger.error("Failed to seed default warehouses", error.stack);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
