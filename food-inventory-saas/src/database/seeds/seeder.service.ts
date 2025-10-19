import { Injectable, Logger } from "@nestjs/common";
import { PermissionsSeed } from "./permissions.seed";
import { RolesSeed } from "./roles.seed";

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly permissionsSeed: PermissionsSeed,
    private readonly rolesSeed: RolesSeed,
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

      this.logger.log("✅ Database seeding completed successfully");
    } catch (error) {
      this.logger.error("❌ Error during database seeding:", error.message);
      // No lanzamos el error para no detener la aplicación
      // Solo logueamos el problema
    }
  }
}
