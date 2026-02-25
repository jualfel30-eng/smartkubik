import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  GlobalSetting,
  GlobalSettingDocument,
} from "../schemas/global-settings.schema";
import { FeatureFlags } from "./features.config";

/**
 * Servicio de Feature Flags con hot-reload desde MongoDB
 *
 * Este servicio lee los feature flags desde MongoDB en lugar de process.env,
 * permitiendo actualizaciones dinámicas sin reiniciar el servidor.
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: FeatureFlags | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  // Mapeo de claves en MongoDB → propiedades de FeatureFlags
  private readonly FLAG_KEY_MAP: Record<string, keyof FeatureFlags> = {
    ENABLE_EMPLOYEE_PERFORMANCE: "EMPLOYEE_PERFORMANCE_TRACKING",
    ENABLE_BANK_MOVEMENTS: "BANK_ACCOUNTS_MOVEMENTS",
    ENABLE_BANK_RECONCILIATION: "BANK_ACCOUNTS_RECONCILIATION",
    ENABLE_BANK_TRANSFERS: "BANK_ACCOUNTS_TRANSFERS",
    ENABLE_DASHBOARD_CHARTS: "DASHBOARD_CHARTS",
    ENABLE_ADVANCED_REPORTS: "ADVANCED_REPORTS",
    ENABLE_PREDICTIVE_ANALYTICS: "PREDICTIVE_ANALYTICS",
    ENABLE_CUSTOMER_SEGMENTATION: "CUSTOMER_SEGMENTATION",
    ENABLE_MULTI_TENANT_LOGIN: "MULTI_TENANT_LOGIN",
    ENABLE_SERVICE_BOOKING_PORTAL: "SERVICE_BOOKING_PORTAL",
    ENABLE_APPOINTMENT_REMINDERS: "APPOINTMENT_REMINDERS",
    ENABLE_MULTI_WAREHOUSE: "MULTI_WAREHOUSE",
  };

  constructor(
    @InjectModel(GlobalSetting.name)
    private globalSettingModel: Model<GlobalSettingDocument>,
  ) {}

  /**
   * Obtiene todos los feature flags (con caché)
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    // Verificar si el caché es válido
    const now = Date.now();
    if (this.cache && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cache;
    }

    // Cargar desde MongoDB
    await this.reloadFromDatabase();
    return this.cache!;
  }

  /**
   * Recarga los feature flags desde MongoDB
   */
  async reloadFromDatabase(): Promise<void> {
    try {
      const dbKeys = Object.keys(this.FLAG_KEY_MAP);
      const settings = await this.globalSettingModel
        .find({ key: { $in: dbKeys } })
        .exec();

      const settingsMap = new Map(
        settings.map((s) => [s.key, s.value === "true"]),
      );

      // Construir objeto de feature flags con fallback a process.env
      const flags: FeatureFlags = {
        EMPLOYEE_PERFORMANCE_TRACKING:
          settingsMap.get("ENABLE_EMPLOYEE_PERFORMANCE") ??
          process.env.ENABLE_EMPLOYEE_PERFORMANCE === "true",
        BANK_ACCOUNTS_MOVEMENTS:
          settingsMap.get("ENABLE_BANK_MOVEMENTS") ??
          process.env.ENABLE_BANK_MOVEMENTS === "true",
        BANK_ACCOUNTS_RECONCILIATION:
          settingsMap.get("ENABLE_BANK_RECONCILIATION") ??
          process.env.ENABLE_BANK_RECONCILIATION === "true",
        BANK_ACCOUNTS_TRANSFERS:
          settingsMap.get("ENABLE_BANK_TRANSFERS") ??
          process.env.ENABLE_BANK_TRANSFERS === "true",
        DASHBOARD_CHARTS:
          settingsMap.get("ENABLE_DASHBOARD_CHARTS") ??
          process.env.ENABLE_DASHBOARD_CHARTS === "true",
        ADVANCED_REPORTS:
          settingsMap.get("ENABLE_ADVANCED_REPORTS") ??
          process.env.ENABLE_ADVANCED_REPORTS === "true",
        PREDICTIVE_ANALYTICS:
          settingsMap.get("ENABLE_PREDICTIVE_ANALYTICS") ??
          process.env.ENABLE_PREDICTIVE_ANALYTICS === "true",
        CUSTOMER_SEGMENTATION:
          settingsMap.get("ENABLE_CUSTOMER_SEGMENTATION") ??
          process.env.ENABLE_CUSTOMER_SEGMENTATION === "true",
        MULTI_TENANT_LOGIN:
          settingsMap.get("ENABLE_MULTI_TENANT_LOGIN") ??
          process.env.ENABLE_MULTI_TENANT_LOGIN === "true",
        SERVICE_BOOKING_PORTAL:
          settingsMap.get("ENABLE_SERVICE_BOOKING_PORTAL") ??
          process.env.ENABLE_SERVICE_BOOKING_PORTAL === "true",
        APPOINTMENT_REMINDERS:
          settingsMap.get("ENABLE_APPOINTMENT_REMINDERS") ??
          process.env.ENABLE_APPOINTMENT_REMINDERS === "true",
        MULTI_WAREHOUSE:
          settingsMap.get("ENABLE_MULTI_WAREHOUSE") ??
          process.env.ENABLE_MULTI_WAREHOUSE === "true",
      };

      this.cache = flags;
      this.cacheTimestamp = Date.now();

      this.logger.log("Feature flags reloaded from database");
      this.logFeatureStatus(flags);
    } catch (error) {
      this.logger.error(`Failed to reload feature flags: ${error.message}`);
      // En caso de error, usar process.env como fallback
      if (!this.cache) {
        this.cache = this.loadFromEnv();
        this.cacheTimestamp = Date.now();
      }
    }
  }

  /**
   * Invalida el caché, forzando una recarga en la próxima consulta
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.logger.log("Feature flags cache invalidated");
  }

  /**
   * Actualiza feature flags en MongoDB y recarga el caché.
   * Acepta un objeto parcial: { DASHBOARD_CHARTS: true, MULTI_WAREHOUSE: false }
   */
  async updateFeatureFlags(
    flags: Record<string, boolean>,
  ): Promise<FeatureFlags> {
    // Mapeo inverso: FeatureFlags key → GlobalSetting key
    const reverseMap = new Map<string, string>();
    for (const [dbKey, flagKey] of Object.entries(this.FLAG_KEY_MAP)) {
      reverseMap.set(flagKey, dbKey);
    }

    const ops = Object.entries(flags)
      .filter(([key]) => reverseMap.has(key))
      .map(([key, value]) => ({
        updateOne: {
          filter: { key: reverseMap.get(key)! },
          update: {
            $set: { value: String(value) },
            $setOnInsert: { key: reverseMap.get(key)! },
          },
          upsert: true,
        },
      }));

    if (ops.length > 0) {
      await this.globalSettingModel.bulkWrite(ops);
      this.logger.log(
        `Updated ${ops.length} feature flag(s) in database`,
      );
    }

    this.invalidateCache();
    return this.getFeatureFlags();
  }

  /**
   * Verifica si una feature específica está activa
   */
  async isFeatureEnabled(featureName: keyof FeatureFlags): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    return flags[featureName] === true;
  }

  /**
   * Verifica si una feature está activa (versión síncrona usando caché)
   */
  isFeatureEnabledSync(featureName: keyof FeatureFlags): boolean {
    // Si no hay caché, usar process.env como fallback
    if (!this.cache) {
      return this.loadFromEnv()[featureName];
    }
    return this.cache[featureName] === true;
  }

  /**
   * Obtener lista de features activas
   */
  async getEnabledFeatures(): Promise<string[]> {
    const flags = await this.getFeatureFlags();
    return Object.entries(flags)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);
  }

  /**
   * Obtener lista de features inactivas
   */
  async getDisabledFeatures(): Promise<string[]> {
    const flags = await this.getFeatureFlags();
    return Object.entries(flags)
      .filter(([_, enabled]) => !enabled)
      .map(([name]) => name);
  }

  /**
   * Carga los feature flags desde process.env (fallback)
   */
  private loadFromEnv(): FeatureFlags {
    return {
      EMPLOYEE_PERFORMANCE_TRACKING:
        process.env.ENABLE_EMPLOYEE_PERFORMANCE === "true",
      BANK_ACCOUNTS_MOVEMENTS: process.env.ENABLE_BANK_MOVEMENTS === "true",
      BANK_ACCOUNTS_RECONCILIATION:
        process.env.ENABLE_BANK_RECONCILIATION === "true",
      BANK_ACCOUNTS_TRANSFERS: process.env.ENABLE_BANK_TRANSFERS === "true",
      DASHBOARD_CHARTS: process.env.ENABLE_DASHBOARD_CHARTS === "true",
      ADVANCED_REPORTS: process.env.ENABLE_ADVANCED_REPORTS === "true",
      PREDICTIVE_ANALYTICS: process.env.ENABLE_PREDICTIVE_ANALYTICS === "true",
      CUSTOMER_SEGMENTATION:
        process.env.ENABLE_CUSTOMER_SEGMENTATION === "true",
      MULTI_TENANT_LOGIN: process.env.ENABLE_MULTI_TENANT_LOGIN === "true",
      SERVICE_BOOKING_PORTAL:
        process.env.ENABLE_SERVICE_BOOKING_PORTAL === "true",
      APPOINTMENT_REMINDERS:
        process.env.ENABLE_APPOINTMENT_REMINDERS === "true",
      MULTI_WAREHOUSE: process.env.ENABLE_MULTI_WAREHOUSE === "true",
    };
  }

  /**
   * Log del estado de los feature flags
   */
  private logFeatureStatus(flags: FeatureFlags): void {
    this.logger.log("🎛️  Feature Flags Status:");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    Object.entries(flags).forEach(([key, value]) => {
      const icon = value ? "✅" : "❌";
      const status = value ? "ENABLED " : "DISABLED";
      this.logger.log(`  ${icon} ${status} - ${key}`);
    });

    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
