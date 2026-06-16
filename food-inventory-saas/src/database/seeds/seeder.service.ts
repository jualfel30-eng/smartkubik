import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { PermissionsSeed } from "./permissions.seed";
import { RolesSeed } from "./roles.seed";
import { UnitTypesSeed } from "./unit-types.seed";
import { addApplyDiscountsPermission } from "../migrations/add-apply-discounts-permission";
import { addProductionModulePermissions } from "../migrations/add-production-module-permissions";
import { addCashRegisterModulePermissions } from "../migrations/add-cash-register-module";
import { normalizeRolePermissions } from "../migrations/normalize-role-permissions";

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly permissionsSeed: PermissionsSeed,
    private readonly rolesSeed: RolesSeed,
    private readonly unitTypesSeed: UnitTypesSeed,
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

      // Orden importante: primero permisos, luego roles, luego tipos de unidades
      await this.permissionsSeed.seed();
      await this.rolesSeed.seed();
      await this.unitTypesSeed.seed();

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
      await addCashRegisterModulePermissions(this.connection);

      // SIEMPRE al final: las migraciones de arriba agregan permisos como
      // NOMBRE-STRING a roles admin/super_admin en cada boot, corrompiendo el
      // array (rompe el populate → login super_admin falla, tenant pierde
      // permisos). Esta pasada los normaliza a ObjectId. Ver el archivo.
      await normalizeRolePermissions(this.connection);

      this.logger.log("✅ Migrations completed successfully");
    } catch (error) {
      this.logger.error("❌ Error during migrations:", error.message);
      throw error;
    }
  }
}
