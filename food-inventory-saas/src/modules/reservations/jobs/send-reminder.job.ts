import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { ReservationsService } from "../reservations.service";
import { MailService } from "../../mail/mail.service";

@Injectable()
export class SendReservationReminderJob {
  private readonly logger = new Logger(SendReservationReminderJob.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly reservationsService: ReservationsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Envía recordatorios de reservas confirmadas cada hora
   * Se basa en tenant.settings.reservations.reminderHoursBefore
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders() {
    this.logger.log("🔔 Starting reservation reminders job...");

    try {
      // Obtener todos los tenants activos con módulo de reservations habilitado
      const tenants = await this.tenantModel
        .find({
          status: "active",
          "enabledModules.reservations": true,
          "settings.reservations.sendReminderEmail": true,
        })
        .exec();

      this.logger.log(
        `Found ${tenants.length} tenants with reservation reminders enabled`,
      );

      let totalSent = 0;
      let totalErrors = 0;

      for (const tenant of tenants) {
        try {
          // Obtener reservas que necesitan recordatorio
          const reservations =
            await this.reservationsService.getPendingReminders(
              tenant._id.toString(),
            );

          this.logger.log(
            `Tenant ${tenant.name}: ${reservations.length} pending reminders`,
          );

          for (const reservation of reservations) {
            try {
              // Solo enviar si hay email
              if (!reservation.guestEmail) {
                this.logger.warn(
                  `Reservation ${reservation.reservationNumber} has no email, skipping reminder`,
                );
                continue;
              }

              // Calcular tiempo hasta la reserva
              const reservationDateTime = new Date(reservation.date);
              const [hours, minutes] = reservation.time.split(":");
              reservationDateTime.setHours(parseInt(hours), parseInt(minutes));

              const hoursUntilReservation = Math.floor(
                (reservationDateTime.getTime() - Date.now()) /
                  (1000 * 60 * 60),
              );

              // Enviar email de recordatorio
              const reminderHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Recordatorio de Reserva</h2>
                  <p>Estimado/a ${reservation.guestName},</p>
                  <p>Le recordamos su reserva en <strong>${tenant.name}</strong> en aproximadamente <strong>${hoursUntilReservation} hora(s)</strong>.</p>

                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Detalles de la Reserva</h3>
                    <p><strong>Número de Reserva:</strong> ${reservation.reservationNumber}</p>
                    <p><strong>Fecha:</strong> ${new Date(reservation.date).toLocaleDateString("es-ES")}</p>
                    <p><strong>Hora:</strong> ${reservation.time}</p>
                    <p><strong>Número de Personas:</strong> ${reservation.partySize}</p>
                    ${reservation.tableNumber ? `<p><strong>Mesa:</strong> ${reservation.tableNumber}</p>` : ""}
                    ${reservation.section ? `<p><strong>Sección:</strong> ${reservation.section}</p>` : ""}
                    ${reservation.specialRequests ? `<p><strong>Solicitudes Especiales:</strong> ${reservation.specialRequests}</p>` : ""}
                  </div>

                  <p>¡Le esperamos pronto!</p>
                  <p style="color: #6b7280; font-size: 12px;">Si necesita modificar o cancelar su reserva, por favor contáctenos lo antes posible.</p>
                </div>
              `;

              await this.mailService.sendTemplatedEmail({
                tenantId: tenant._id.toString(),
                to: reservation.guestEmail,
                subject: `Recordatorio: Reserva ${reservation.reservationNumber} en ${hoursUntilReservation}h - ${tenant.name}`,
                html: reminderHtml,
              });

              // Marcar como enviado
              reservation.reminderSentAt = new Date();
              await reservation.save();

              totalSent++;
              this.logger.log(
                `✅ Sent reminder for ${reservation.reservationNumber} (${hoursUntilReservation}h away)`,
              );
            } catch (error) {
              totalErrors++;
              this.logger.error(
                `❌ Error sending reminder for ${reservation.reservationNumber}:`,
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
        `✅ Reservation reminders job completed: ${totalSent} sent, ${totalErrors} errors`,
      );
    } catch (error) {
      this.logger.error("❌ Fatal error in reminders job:", error.message);
    }
  }
}
