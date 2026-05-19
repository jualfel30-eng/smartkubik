import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class SeedPaymentRequestsReviewPermissionMigration {
  private readonly logger = new Logger(
    SeedPaymentRequestsReviewPermissionMigration.name,
  );

  private readonly PERMISSION = {
    name: "payment_requests_review",
    description: "Revisar y confirmar solicitudes de pago",
    module: "payment_requests",
    action: "review",
  };

  // Roles that get the permission auto-granted. `admin` is implicit (system
  // admin is granted every permission via getAllPermissionIds at seed time),
  // but we still push to it here so existing tenant-scoped admin clones get it.
  private readonly ROLES_TO_GRANT = ["admin", "employee"];

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<{
    permissionInserted: boolean;
    rolesUpdated: number;
  }> {
    const db = this.connection.db;
    const permissions = db.collection("permissions");
    const roles = db.collection("roles");

    this.logger.log("🔄 Seeding payment_requests_review permission...");

    let permissionInserted = false;
    let permissionDoc = await permissions.findOne({ name: this.PERMISSION.name });

    if (!permissionDoc) {
      const now = new Date();
      const result = await permissions.insertOne({
        ...this.PERMISSION,
        createdAt: now,
        updatedAt: now,
      });
      permissionDoc = await permissions.findOne({ _id: result.insertedId });
      permissionInserted = true;
      this.logger.log(`✅ Inserted permission ${this.PERMISSION.name}`);
    } else {
      this.logger.log(`⏭️  Permission already exists: ${this.PERMISSION.name}`);
    }

    if (!permissionDoc) {
      throw new Error("Failed to read permission after upsert");
    }

    const grant = await roles.updateMany(
      {
        name: { $in: this.ROLES_TO_GRANT },
        permissions: { $ne: permissionDoc._id },
      },
      { $addToSet: { permissions: permissionDoc._id } } as any,
    );

    this.logger.log(
      `✅ Granted ${this.PERMISSION.name} to ${grant.modifiedCount} role document(s) [${this.ROLES_TO_GRANT.join(", ")}]`,
    );

    return {
      permissionInserted,
      rolesUpdated: grant.modifiedCount,
    };
  }
}
