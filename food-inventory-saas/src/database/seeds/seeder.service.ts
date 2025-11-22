import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { PermissionsSeed } from "./permissions.seed";
import { RolesSeed } from "./roles.seed";
import { addApplyDiscountsPermission } from "../migrations/add-apply-discounts-permission";
import { addProductionModulePermissions } from "../migrations/add-production-module-permissions";

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly permissionsSeed: PermissionsSeed,
    private readonly rolesSeed: RolesSeed,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async seed(): Promise<void> {
    const isProduction = process.env.NODE_ENV === "production";
    const seedsDisabled = process.env.DISABLE_SEEDS === "true";

    // Protección: no ejecutar en producción a menos que esté explícitamente habilitado
    if (isProduction) {
      this.logger.warn(
        "⚠️  Seeding skipped: Running in production environment",
      );
      return;
    }

    if (seedsDisabled) {
      this.logger.log(
        "ℹ️  Seeding disabled via DISABLE_SEEDS environment variable",
      );
      return;
    }

    try {
      this.logger.log("🌱 Starting database seeding...");

      // Orden importante: primero permisos, luego roles
      await this.permissionsSeed.seed();
      await this.rolesSeed.seed();

      // Run migrations after seeding
      await this.runMigrations();

      this.logger.log("✅ Database seeding completed successfully");
    } catch (error) {
      this.logger.error("❌ Error during database seeding:", error.message);
      // No lanzamos el error para no detener la aplicación
      // Solo logueamos el problema
    }
  }

  async runMigrations(): Promise<void> {
    try {
      this.logger.log("🔄 Running database migrations...");

      await addApplyDiscountsPermission(this.connection);
      await addProductionModulePermissions(this.connection);

      this.logger.log("✅ Migrations completed successfully");
    } catch (error) {
      this.logger.error("❌ Error during migrations:", error.message);
      throw error;
    }
  }
}
