import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Calendar, CalendarDocument } from "../schemas/calendar.schema";
import { CalendarsService } from "../modules/calendars/calendars.service";
import { ConfigService } from "@nestjs/config";

/**
 * Job para renovar automáticamente los watch channels de Google Calendar
 * Los watch channels expiran después de 7 días, este job los renueva cada 6 días
 */
@Injectable()
export class CalendarWatchRenewalJob {
  private readonly logger = new Logger(CalendarWatchRenewalJob.name);

  constructor(
    @InjectModel(Calendar.name)
    private readonly calendarModel: Model<CalendarDocument>,
    private readonly calendarsService: CalendarsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Se ejecuta todos los días a las 3 AM
   * Revisa qué watch channels están próximos a expirar y los renueva
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleWatchChannelRenewal() {
    this.logger.log("Iniciando renovación de watch channels...");

    try {
      // Buscar calendarios con watch channels activos
      const calendarsWithWatch = await this.calendarModel
        .find({
          "googleSync.enabled": true,
          "googleSync.watchChannel.id": { $exists: true },
        })
        .exec();

      this.logger.log(
        `Encontrados ${calendarsWithWatch.length} calendarios con watch channels`,
      );

      let renewed = 0;
      let errors = 0;

      const apiBaseUrl =
        this.configService.get<string>("API_BASE_URL") ||
        "http://localhost:3000";
      const webhookUrl = `${apiBaseUrl}/api/v1/calendars/google-webhook`;

      for (const calendar of calendarsWithWatch) {
        try {
          // Verificar si el watch channel está próximo a expirar (menos de 24 horas)
          const expirationTime = calendar.googleSync?.watchChannel?.expiration;
          if (!expirationTime) continue;

          const now = Date.now();
          const timeUntilExpiration = expirationTime - now;
          const oneDayInMs = 24 * 60 * 60 * 1000;

          // Si expira en menos de 24 horas, renovarlo
          if (timeUntilExpiration < oneDayInMs) {
            this.logger.log(
              `Renovando watch channel para calendario ${calendar._id} (expira en ${Math.round(timeUntilExpiration / (1000 * 60 * 60))} horas)`,
            );

            await this.calendarsService.renewWatchChannel(
              calendar._id.toString(),
              webhookUrl,
            );

            renewed++;
          }
        } catch (error) {
          this.logger.error(
            `Error renovando watch channel para calendario ${calendar._id}:`,
            error.message,
          );
          errors++;

          // Si falla la renovación, marcar el calendario como error
          if (calendar.googleSync) {
            calendar.googleSync.syncStatus = "error";
            calendar.googleSync.errorMessage = `Error renovando watch channel: ${error.message}`;
            await calendar.save();
          }
        }
      }

      this.logger.log(
        `Renovación completada: ${renewed} canales renovados, ${errors} errores`,
      );
    } catch (error) {
      this.logger.error("Error en el job de renovación de watch channels:", error);
    }
  }

  /**
   * Método manual para forzar la renovación de un calendario específico
   */
  async renewSpecificCalendar(calendarId: string): Promise<void> {
    this.logger.log(`Forzando renovación de calendario ${calendarId}`);

    const apiBaseUrl =
      this.configService.get<string>("API_BASE_URL") ||
      "http://localhost:3000";
    const webhookUrl = `${apiBaseUrl}/api/v1/calendars/google-webhook`;

    await this.calendarsService.renewWatchChannel(calendarId, webhookUrl);

    this.logger.log(`Calendario ${calendarId} renovado exitosamente`);
  }
}
