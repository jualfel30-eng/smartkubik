import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

@Injectable()
export class SeedDefaultBusinessLocationsMigration {
  private readonly logger = new Logger(
    SeedDefaultBusinessLocationsMigration.name,
  );

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
        `Found ${tenants.length} tenants. Seeding default business locations...`,
      );

      let created = 0;
      let skipped = 0;

      for (const tenant of tenants) {
        const tenantId =
          tenant._id instanceof Types.ObjectId
            ? tenant._id
            : new Types.ObjectId(tenant._id);

        // Check if this tenant already has a business location (idempotent)
        const existingLocation = await this.connection
          .collection("businesslocations")
          .findOne(
            { tenantId, code: "SEDE-001", isDeleted: { $ne: true } },
            { session },
          );

        if (existingLocation) {
          this.logger.log(
            `Tenant ${tenantId.toHexString()} already has SEDE-001. Skipping.`,
          );
          skipped++;
          continue;
        }

        // Find all active warehouses for this tenant
        const warehouses = await this.connection
          .collection("warehouses")
          .find(
            { tenantId, isDeleted: { $ne: true } },
            { session },
          )
          .toArray();

        if (warehouses.length === 0) {
          this.logger.log(
            `Tenant ${tenantId.toHexString()} has no warehouses. Skipping.`,
          );
          skipped++;
          continue;
        }

        const warehouseIds = warehouses.map((w) => w._id);

        // Get address from the first warehouse if available
        const firstWarehouse = warehouses[0];
        const address = firstWarehouse.location
          ? {
              street: firstWarehouse.location.address || "",
              city: firstWarehouse.location.city || "",
              state: firstWarehouse.location.state || "",
              country: firstWarehouse.location.country || "",
            }
          : undefined;

        // Create default business location
        const insertResult = await this.connection
          .collection("businesslocations")
          .insertOne(
            {
              name: "Sede Principal",
              code: "SEDE-001",
              type: "mixed",
              address,
              warehouseIds,
              isActive: true,
              isDeleted: false,
              tenantId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { session },
          );

        const locationId = insertResult.insertedId;

        // Link all warehouses to this location
        await this.connection
          .collection("warehouses")
          .updateMany(
            { _id: { $in: warehouseIds } },
            { $set: { locationId } },
            { session },
          );

        this.logger.log(
          `Created SEDE-001 for tenant ${tenantId.toHexString()} with ${warehouseIds.length} warehouse(s)`,
        );
        created++;
      }

      await session.commitTransaction();
      this.logger.log(
        `Seed default business locations completed. Created: ${created}, Skipped: ${skipped}`,
      );

      return { created, skipped, total: tenants.length };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        "Failed to seed default business locations",
        error.stack,
      );
      throw error;
    } finally {
      session.endSession();
    }
  }
}
