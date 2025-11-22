import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class AddMarketingPermissionsMigration {
  private readonly logger = new Logger(AddMarketingPermissionsMigration.name);

  private readonly newPermissions = [
    // Restaurant Module
    {
      name: "restaurant_read",
      description: "Ver módulo de restaurante",
      module: "restaurant",
    },
    {
      name: "restaurant_write",
      description: "Gestionar módulo de restaurante",
      module: "restaurant",
    },

    // Chat Module
    {
      name: "chat_read",
      description: "Ver conversaciones y mensajes",
      module: "communication",
    },
    {
      name: "chat_write",
      description: "Enviar mensajes y gestionar conversaciones",
      module: "communication",
    },

    // Marketing Module
    {
      name: "marketing_read",
      description: "Ver campañas de marketing y analíticas",
      module: "marketing",
    },
    {
      name: "marketing_write",
      description: "Crear y gestionar campañas de marketing",
      module: "marketing",
    },

    // Payroll Module
    {
      name: "payroll_employees_read",
      description: "Ver información de nómina de empleados",
      module: "payroll",
    },
    {
      name: "payroll_employees_write",
      description: "Gestionar nómina de empleados",
      module: "payroll",
    },
  ];

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<void> {
    try {
      const db = this.connection.db;
      const permissionsCollection = db.collection("permissions");

      this.logger.log("🔄 Starting marketing permissions migration...");

      let addedCount = 0;
      let skippedCount = 0;

      for (const permission of this.newPermissions) {
        const existing = await permissionsCollection.findOne({
          name: permission.name,
        });

        if (existing) {
          this.logger.log(`⏭️  Permission already exists: ${permission.name}`);
          skippedCount++;
          continue;
        }

        await permissionsCollection.insertOne({
          ...permission,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        this.logger.log(`✅ Added permission: ${permission.name}`);
        addedCount++;
      }

      this.logger.log(
        `✅ Migration completed. Added: ${addedCount}, Skipped: ${skippedCount}`,
      );
    } catch (error) {
      this.logger.error("❌ Error running migration:", error.message);
      throw error;
    }
  }
}
