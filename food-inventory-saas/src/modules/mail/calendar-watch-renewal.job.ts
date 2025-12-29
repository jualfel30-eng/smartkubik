import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { GmailOAuthService } from "./gmail-oauth.service";
import { ConfigService } from "@nestjs/config";

/**
 * Job que renueva los watches de Google Calendar antes de que expiren
 * Ejecuta diariamente a las 2 AM
 */
@Injectable()
export class CalendarWatchRenewalJob {
  private readonly logger = new Logger(CalendarWatchRenewalJob.name);

  // Renovar 2 días antes de que expire (Google watches duran ~7 días)
  private readonly RENEWAL_THRESHOLD_HOURS = 48;

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cron que ejecuta diariamente a las 2 AM para renovar watches que están por expirar
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async renewExpiringWatches() {
    this.logger.log("Iniciando renovación de watches de Google Calendar...");

    try {
      const now = new Date();
      const thresholdDate = new Date(now.getTime() + this.RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000);

      // Buscar tenants con watches que expiran pronto
      const tenantsWithExpiringWatches = await this.tenantModel
        .find({
          "calendarConfig.provider": "google",
          "calendarConfig.watch.expiration": { $lte: thresholdDate },
          "emailConfig.gmailAccessToken": { $exists: true },
          "emailConfig.gmailRefreshToken": { $exists: true },
        })
        .select("_id calendarConfig emailConfig")
        .lean();

      if (!tenantsWithExpiringWatches.length) {
        this.logger.log("No hay watches por renovar");
        return;
      }

      this.logger.log(
        `Encontrados ${tenantsWithExpiringWatches.length} watches por renovar`,
      );

      let renewed = 0;
      let failed = 0;

      for (const tenant of tenantsWithExpiringWatches) {
        try {
          await this.renewWatchForTenant(tenant._id.toString());
          renewed++;
        } catch (error) {
          failed++;
          this.logger.error(
            `Error renovando watch para tenant ${tenant._id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Renovación completada: ${renewed} exitosos, ${failed} fallidos`,
      );
    } catch (error) {
      this.logger.error(
        `Error en proceso de renovación de watches: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Renueva el watch de Google Calendar para un tenant específico
   */
  private async renewWatchForTenant(tenantId: string): Promise<void> {
    this.logger.log(`Renovando watch para tenant ${tenantId}`);

    // Construir webhook URL
    let apiBase = this.configService.get<string>("API_BASE_URL");

    if (!apiBase) {
      const isProd = this.configService.get<string>("NODE_ENV") === "production";
      apiBase = isProd ? "https://api.smartkubik.com" : "http://localhost:3000";
    } else if (apiBase.startsWith("http://")) {
      apiBase = apiBase.replace("http://", "https://");
    }

    const webhookUrl = `${apiBase}/api/v1/calendar-webhooks/google/event`;

    // Llamar al servicio de Gmail OAuth para crear nuevo watch
    const result = await this.gmailOAuthService.watchCalendar(tenantId, webhookUrl);

    this.logger.log(
      `Watch renovado exitosamente para tenant ${tenantId}. Nuevo channelId: ${result.id}, expira: ${result.expiration}`,
    );
  }

  /**
   * Método manual para renovar un watch específico (útil para testing o forzar renovación)
   */
  async forceRenewalForTenant(tenantId: string): Promise<void> {
    this.logger.log(`Forzando renovación de watch para tenant ${tenantId}`);
    await this.renewWatchForTenant(tenantId);
  }
}
