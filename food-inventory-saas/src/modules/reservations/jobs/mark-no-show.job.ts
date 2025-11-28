import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { ReservationsService } from "../reservations.service";

@Injectable()
export class MarkNoShowJob {
  private readonly logger = new Logger(MarkNoShowJob.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly reservationsService: ReservationsService,
  ) {}

  /**
   * Marca reservas como no-show si pasó el tiempo de gracia
   * Se ejecuta cada 30 minutos
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async markNoShows() {
    this.logger.log("🔔 Starting mark no-show job...");

    try {
      // Obtener todos los tenants activos con módulo de reservations habilitado
      const tenants = await this.tenantModel
        .find({
          status: "active",
          "enabledModules.reservations": true,
        })
        .exec();

      this.logger.log(
        `Found ${tenants.length} tenants with reservations enabled`,
      );

      let totalMarked = 0;
      let totalErrors = 0;

      for (const tenant of tenants) {
        try {
          // Obtener reservas que potencialmente son no-shows
          const reservations =
            await this.reservationsService.getPotentialNoShows(
              tenant._id.toString(),
            );

          this.logger.log(
            `Tenant ${tenant.name}: ${reservations.length} potential no-shows`,
          );

          for (const reservation of reservations) {
            try {
              // Calcular el tiempo de la reserva
              const reservationDateTime = new Date(reservation.date);
              const [hours, minutes] = reservation.time.split(":");
              reservationDateTime.setHours(parseInt(hours), parseInt(minutes));

              // Obtener configuración de grace period
              const settings = await this.reservationsService.getSettings(
                tenant._id.toString(),
              );
              const gracePeriodMs =
                (settings.noShowGracePeriodMinutes || 15) * 60 * 1000;

              const gracePeriodEnd =
                reservationDateTime.getTime() + gracePeriodMs;
              const now = Date.now();

              // Si ya pasó el tiempo de gracia, marcar como no-show
              if (now > gracePeriodEnd) {
                await this.reservationsService.markNoShow(
                  reservation._id.toString(),
                  "Auto: Tiempo de gracia expirado",
                );

                totalMarked++;
                this.logger.log(
                  `✅ Marked ${reservation.reservationNumber} as no-show`,
                );
              }
            } catch (error) {
              totalErrors++;
              this.logger.error(
                `❌ Error marking ${reservation.reservationNumber} as no-show:`,
                error.message,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `❌ Error processing tenant ${tenant.name}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `✅ Mark no-show job completed: ${totalMarked} marked, ${totalErrors} errors`,
      );
    } catch (error) {
      this.logger.error("❌ Fatal error in mark no-show job:", error.message);
    }
  }
}
